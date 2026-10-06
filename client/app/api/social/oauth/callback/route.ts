import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InstagramProviderClient } from '@/lib/social/instagram'
import { logSync, saveConnection } from '@/lib/social/repo'

/**
 * Paso 2 del OAuth de Instagram (public en middleware — la sesión y el
 * `state` se validan AQUÍ, no en los gates):
 *   1. Sesión requerida → /login si no.
 *   2. `state` de la cookie verificado timing-safe → error=state_mismatch.
 *   3. code → token long-lived (lib/social/instagram.ts) → saveConnection
 *      con token CIFRADO. El token jamás vuelve al navegador.
 *   4. Cookie borrada tras uso (single-use).
 */

/** Comparación en tiempo constante (patrón lib/team/guard.ts). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const STATE_COOKIE = 'social_oauth_state'

function withStateCookieCleared(res: NextResponse): NextResponse {
  res.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/social',
    maxAge: 0,
  })
  return res
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // Modo demo (sin Supabase): nada que canjear — señal clara a la UI.
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')) {
    return NextResponse.redirect(`${origin}/analisis?error=not_configured`)
  }

  // La usuaria denegó el permiso en la pantalla de Instagram.
  if (searchParams.get('error')) {
    return withStateCookieCleared(NextResponse.redirect(`${origin}/analisis?error=denied`))
  }

  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  if (!code) {
    return withStateCookieCleared(NextResponse.redirect(`${origin}/analisis?error=denied`))
  }

  // ── Sesión ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // ── Verificación del state (anti-CSRF, timing-safe) ────────────
  const stateCookie = request.cookies.get(STATE_COOKIE)?.value
  if (!stateParam || !stateCookie || !safeEqual(stateCookie, stateParam)) {
    return withStateCookieCleared(
      NextResponse.redirect(`${origin}/analisis?error=state_mismatch`),
    )
  }

  try {
    const client = new InstagramProviderClient()
    const redirectUri = `${origin}/api/social/oauth/callback`
    const exchange = await client.exchangeCode(code, redirectUri)

    // Perfil best-effort para mostrar @username nada más volver.
    let username: string | null = null
    let accountType: string | null = null
    let avatarUrl: string | null = null
    try {
      const profile = await client.getProfile(exchange.accessToken)
      username = profile.username
      accountType = profile.accountType
      avatarUrl = profile.avatarUrl
    } catch {
      // El perfil se refrescará en la primera sincronización.
    }

    await saveConnection(user.id, 'instagram', {
      providerAccountId: exchange.providerAccountId || username || user.id,
      accessToken: exchange.accessToken,
      expiresInSeconds: exchange.expiresInSeconds,
      scopes: exchange.scopes,
      username,
      accountType,
      avatarUrl,
    })
    await logSync(user.id, 'instagram', 'oauth', 'success')

    return withStateCookieCleared(
      NextResponse.redirect(`${origin}/analisis?connected=1`),
    )
  } catch (err) {
    console.error('[social/callback]', err)
    try {
      await logSync(user.id, 'instagram', 'oauth', 'error', {
        message: err instanceof Error ? err.message : 'error desconocido',
      })
    } catch {
      // el log no puede romper el flujo del redirect
    }
    return withStateCookieCleared(
      NextResponse.redirect(`${origin}/analisis?error=meta_error`),
    )
  }
}