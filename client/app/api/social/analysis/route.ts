import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { generateProfileReport, getSavedReport } from '@/lib/social/analysis'
import { buildDemoReport } from '@/lib/social/demo-analysis'
import { isSocialProviderReady } from '@/lib/social/repo'

/**
 * Análisis de perfil de Instagram.
 *   GET  → último informe guardado (o null).
 *   POST → genera uno nuevo ({ bio?: string } para pegar la bio si Meta no la da).
 * En modo demo (sin Supabase) devuelve un EJEMPLO marcado `demo: true`.
 */

const DAILY_LIMIT = 6
const isDemo = () => !(process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export async function GET() {
  if (isDemo()) return NextResponse.json({ report: buildDemoReport() })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ report: await getSavedReport(user.id) })
}

export async function POST(req: NextRequest) {
  if (isDemo()) return NextResponse.json({ report: buildDemoReport() })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSocialProviderReady()) return NextResponse.json({ error: 'social_not_configured' }, { status: 503 })

  const rl = rateLimit(`social-analysis:${user.id}`, DAILY_LIMIT, 86_400_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'too_many', message: 'Ya has analizado tu perfil varias veces hoy — vuelve mañana.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { bio?: unknown }
  const bio = typeof body.bio === 'string' ? body.bio.slice(0, 300) : null

  const result = await generateProfileReport(user.id, { bioOverride: bio })
  if (!result.ok) {
    const status = result.error === 'not_connected' ? 404 : result.error === 'token_expired' ? 409 : result.error === 'no_posts' ? 422 : 502
    return NextResponse.json({ error: result.error, message: result.message }, { status })
  }
  return NextResponse.json({ report: result.report })
}

// La IA + Instagram pueden tardar: margen amplio en Vercel.
export const maxDuration = 120
