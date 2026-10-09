import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import {
  canvaRequest,
  exchangeCode,
  getCanvaEnv,
  saveNewConnection,
  markConnectionError,
} from '@/lib/integrations/canva'

/**
 * PASO 2 del OAuth de Canva — callback registrado en el Developer Portal.
 * La ruta es PÚBLICA para middleware (la vuelta de Canva trae cookies de
 * terceros) pero revalida TODO aquí: sesión admin, state timing-safe,
 * PKCE verifier en cookie httpOnly, intercambio con client_secret.
 */

const COOKIE_PATH = '/api/canva/oauth'
const STATE_COOKIE = 'canva_oauth_state'
const VERIFIER_COOKIE = 'canva_oauth_verifier'

/** Comparación en tiempo constante vía doble digest (evita leak de longitud). */
function statesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/admin/canva-test?error=${reason}`)

  // Sesión admin obligatoria también aquí.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('no_session')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) return fail('not_admin')

  // Canva redirige con ?error= (denegación U OTRO fallo — passthrough del código real).
  const canvaError = request.nextUrl.searchParams.get('error')
  if (canvaError) {
    console.error('[canva-oauth] Canva devolvió error:', canvaError)
    return fail(canvaError)
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const expectedState = request.cookies.get(STATE_COOKIE)?.value
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value
  if (!code || !statesMatch(state ?? undefined, expectedState)) {
    return NextResponse.redirect(`${origin}/admin/canva-test?error=state_mismatch`)
  }
  if (!verifier) return fail('pkce_missing')

  const env = getCanvaEnv()
  if (!env) return fail('not_configured')

  const response = NextResponse.redirect(`${origin}/admin/canva-test?connected=1`)
  // Cookies single-use: borrar SIEMPRE (éxito o fracaso del intercambio).
  response.cookies.delete({ name: STATE_COOKIE, path: COOKIE_PATH })
  response.cookies.delete({ name: VERIFIER_COOKIE, path: COOKIE_PATH })

  try {
    const tokenRes = await exchangeCode({ env, code, codeVerifier: verifier })
    // Metadata de cuenta: best-effort (endpoint profile:read; si falla, no bloquea).
    let accountMetadata: Record<string, unknown> | null = null
    try {
      const me = await canvaRequest({ accessToken: tokenRes.access_token, path: '/users/me' })
      accountMetadata = (me.user ?? null) as Record<string, unknown> | null
    } catch {
      accountMetadata = { client_id: env.clientId }
    }
    await saveNewConnection({ ownerId: user.id, tokenRes, accountMetadata })
  } catch (exchangeErr) {
    await markConnectionError(user.id, (exchangeErr as Error).message)
    return fail('exchange_failed')
  }
  return response
}