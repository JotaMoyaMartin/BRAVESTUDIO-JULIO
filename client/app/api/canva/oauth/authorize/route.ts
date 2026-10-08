import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildAuthorizationUrl,
  generatePkcePair,
  getCanvaEnv,
  randomBase64Url,
} from '@/lib/integrations/canva'
import { isSocialCryptoConfigured } from '@/lib/crypto'

/**
 * PASO 1 del OAuth de Canva (solo ADMIN — la clienta jamás conecta su Canva).
 *
 * Genera state + PKCE (verifier/challenge S256 OBLIGATORIO en Canva), guarda
 * el par en cookies httpONLY de corta vida (scope de callback) y redirige al
 * consentimiento de Canva. Verificación de identidad + role en el callback.
 *
 * El verifier NUNCA sale del servidor (cookie httpOnly bajo /api/canva/oauth).
 */

const COOKIE_PATH = '/api/canva/oauth'
const STATE_COOKIE = 'canva_oauth_state'
const VERIFIER_COOKIE = 'canva_oauth_verifier'

export async function GET(request: NextRequest) {
  // Sesión admin (patrón de las rutas admin del repo).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return NextResponse.redirect(new URL('/access-blocked', request.url))
  }

  const env = getCanvaEnv()
  if (!env) {
    return NextResponse.json({
      error: 'Falta CANVA_CLIENT_ID / CANVA_CLIENT_SECRET en el servidor (Vercel + config Canva Developer Portal).',
    }, { status: 503 })
  }
  if (!isSocialCryptoConfigured()) {
    return NextResponse.json({
      error: 'Falta SOCIAL_TOKEN_SECRET en el servidor — sin ella no se pueden cifrar los tokens.',
    }, { status: 503 })
  }

  const state = randomBase64Url(24)
  const { verifier, challenge } = generatePkcePair()

  const response = NextResponse.redirect(buildAuthorizationUrl({ env, state, codeChallenge: challenge }))
  const secure = process.env.NODE_ENV === 'production'
  response.cookies.set(STATE_COOKIE, state, {
    path: COOKIE_PATH, httpOnly: true, secure, sameSite: 'lax', maxAge: 600,
  })
  response.cookies.set(VERIFIER_COOKIE, verifier, {
    path: COOKIE_PATH, httpOnly: true, secure, sameSite: 'lax', maxAge: 600,
  })
  return response
}