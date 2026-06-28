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
  const { pathname } = request.nextUrl

  // Public auth routes
  const isPublicAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/access') ||
    pathname.startsWith('/acceso-bloqueado') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/stripe/webhook')

  if (isPublicAuthRoute) {
    // Redirect authenticated users with active access away from login/access
    if (user && (pathname.startsWith('/login') || pathname === '/access')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('access_status, subscription_status, is_active')
        .eq('id', user.id)
        .single()
      if (profile && hasActiveAccess(profile)) {
        return NextResponse.redirect(new URL('/inicio', request.url))
      }
    }
    return supabaseResponse
  }

  // Protected routes — require session
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin protection
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/inicio', request.url))
    }
    return supabaseResponse
  }

  // Check active access for app routes
  const { data: profile } = await supabase
    .from('profiles')
    .select('access_status, subscription_status, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !hasActiveAccess(profile)) {
    return NextResponse.redirect(new URL(ACCESS_REDIRECT, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
