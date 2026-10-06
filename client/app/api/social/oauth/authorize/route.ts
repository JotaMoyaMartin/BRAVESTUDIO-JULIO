import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSocialProviderReady } from '@/lib/social/repo'
import { InstagramProviderClient } from '@/lib/social/instagram'

/**
 * Paso 1 del OAuth social (Facebook Login for Business): crea el `state`
 * anti-CSRF (cookie httpOnly, 10 min de vida) y redirige al diálogo de
 * consentimiento de Facebook.
 *
 * La ruta exige sesión de Supabase (user.id NUNCA del frontend) — el
 * middleware ya bloquea a usuarias sin sesión, y aquí se revalida por
 * si el gate cambiara en el futuro.
 *
 * redirect_uri = <origin>/api/social/oauth/callback — debe coincidir
 * EXACTAMENTE con una URI inscrita en la app de Meta (Facebook Login
 * for Business → Settings). En producción: https://bravestudio.app/
 * api/social/oauth/callback.
 */

export async function GET(req: NextRequest) {
  // Modo demo (sin Supabase): no hay sesión posible — misma señal que
  // sin credenciales de la app de Instagram.
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')) {
    return NextResponse.redirect(`${req.nextUrl.origin}/analisis?error=not_configured`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const origin = req.nextUrl.origin
  if (!isSocialProviderReady()) {
    return NextResponse.redirect(`${origin}/analisis?error=not_configured`)
  }

  const redirectUri = `${origin}/api/social/oauth/callback`
  const client = new InstagramProviderClient()
  const state = crypto.randomUUID()

  try {
    const authorizeUrl = client.authorizeUrl(state, redirectUri)
    const res = NextResponse.redirect(authorizeUrl)
    res.cookies.set('social_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/social', // solo rutas de OAuth social — menor superficie
      maxAge: 600,
    })
    return res
  } catch (err) {
    console.error('[social/authorize]', err)
    return NextResponse.redirect(`${origin}/analisis?error=not_configured`)
  }
}