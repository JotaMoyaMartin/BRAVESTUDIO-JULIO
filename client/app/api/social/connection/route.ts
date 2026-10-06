import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import {
  deleteConnectionAndData,
  getConnectInfo,
  getConnectionCounts,
  isSocialProviderReady,
} from '@/lib/social/repo'

/**
 * Estado de la conexión social (GET, sin token jamás) + desconexión total
 * (DELETE: borra connection + TODOS los datos sociales de la usuaria).
 */

const DISCONNECT_HOURLY_LIMIT = 5

const supabaseConfigured = (): boolean =>
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'social_not_configured' }, { status: 503 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ready = isSocialProviderReady()
  const state = await getConnectInfo(user.id, 'instagram')
  const counts = await getConnectionCounts(user.id, 'instagram')

  return NextResponse.json({
    ready,
    connected: state.connected,
    needsReauth: state.needsReauth,
    info: state.info,
    counts,
  })
}

export async function DELETE(_req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'social_not_configured' }, { status: 503 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = rateLimit(`social-disconnect:${user.id}`, DISCONNECT_HOURLY_LIMIT, 3_600_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  await deleteConnectionAndData(user.id, 'instagram')
  return NextResponse.json({ ok: true })
}