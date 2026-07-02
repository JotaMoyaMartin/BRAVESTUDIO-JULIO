import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasActiveAccess, ACCESS_REDIRECT } from '@/lib/access'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const IS_CONFIGURED = SUPABASE_URL.startsWith('http')

export async function middleware(request: NextRequest) {
  if (!IS_CONFIGURED) {
    return NextResponse.next({ request })
  }

  // Redirect-only routes: skip Supabase auth/cookie refresh so the page's
  // redirect() produces a clean 307 with Location header instead of being
  // swallowed by the middleware's NextResponse.next() body.
  const { pathname } = request.nextUrl
  if (pathname === '/access' || pathname === '/acceso-bloqueado') {
    return NextResponse.redirect(new URL('/access-blocked', request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public auth routes (incluye landing page /)
  const isPublicAuthRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/update-password') ||
    pathname.startsWith('/access-blocked') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/skool-access') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/stripe/webhook')

  if (isPublicAuthRoute) {
    // Redirect authenticated users with active access away from public marketing/auth pages
    const isMarketingOrAuthPage =
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/skool-access') ||
      pathname === '/access-blocked' ||
      pathname.startsWith('/pricing')
    if (user && isMarketingOrAuthPage) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('access_status, subscription_status, is_active, access_source, access_expires_at, full_name, salon_name')
        .eq('id', user.id)
        .single()
      if (profile) {
        // Si ya tiene acceso activo pero no ha completado onboarding → onboarding
        if (hasActiveAccess(profile)) {
          if (!profile.full_name || !profile.salon_name) {
            return NextResponse.redirect(new URL('/onboarding', request.url))
          }
          return NextResponse.redirect(new URL('/inicio', request.url))
        }
        // Si está en /signup pero ya tiene cuenta (sin acceso) → /access
        if (pathname.startsWith('/signup')) {
          return NextResponse.redirect(new URL('/access', request.url))
        }
      }
    }
    return supabaseResponse
  }

  // Protected routes — require session
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Onboarding route: logged-in users can access it without active access
  if (pathname.startsWith('/onboarding')) {
    return supabaseResponse
  }

  // Billing/access endpoints: a logged-in user must be able to reach these
  // even WITHOUT active access — they are the means to obtain/manage it.
  // (Otherwise the access gate below redirects the checkout POST to /access.)
  const isBillingRoute =
    pathname.startsWith('/api/stripe/create-checkout-session') ||
    pathname.startsWith('/api/stripe/create-portal-session') ||
    pathname.startsWith('/api/promo/redeem')

  if (isBillingRoute) {
    return supabaseResponse
  }

  // Admin protection
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      return NextResponse.redirect(new URL('/inicio', request.url))
    }
    return supabaseResponse
  }

  // Check active access for app routes
  const { data: profile } = await supabase
    .from('profiles')
    .select('access_status, subscription_status, is_active, access_source, access_expires_at, full_name, salon_name')
    .eq('id', user.id)
    .single()

  // Onboarding gate: si el usuario no ha completado sus datos básicos,
  // redirigir a /onboarding antes de dejarle entrar a la app o al access
  if (profile && (!profile.full_name || !profile.salon_name)) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (!profile || !hasActiveAccess(profile)) {
    // Lazy deactivation: si el acceso por promo ha expirado pero la DB sigue marcándolo activo,
    // sincronizamos el estado a 'inactive' (una sola vez) para que el admin lo vea correcto.
    if (
      profile &&
      profile.access_status === 'active' &&
      profile.access_source === 'promo' &&
      profile.access_expires_at &&
      new Date(profile.access_expires_at).getTime() < Date.now()
    ) {
      await supabase
        .from('profiles')
        .update({ access_status: 'inactive', is_active: false })
        .eq('id', user.id)
    }
    return NextResponse.redirect(new URL(ACCESS_REDIRECT, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
