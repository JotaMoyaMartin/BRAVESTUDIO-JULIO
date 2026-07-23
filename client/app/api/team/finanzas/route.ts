import { readFileSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // Verificar sesión Supabase con rol superadmin
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'superadmin') {
        return new NextResponse('Forbidden', { status: 403 })
      }
    } else {
      // En team mode sin sesión Supabase: solo permite en desarrollo local
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }
  } catch {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  const htmlPath = join(process.cwd(), 'private', 'finanzas.html')
  const html = readFileSync(htmlPath, 'utf-8')

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
