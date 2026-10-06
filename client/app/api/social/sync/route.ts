import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getConnectInfo, isSocialProviderReady } from '@/lib/social/repo'
import { runSync } from '@/lib/social/sync'

/**
 * Sincronización manual (POST): trae feed + insights + métricas diarias +
 * stories de Instagram y los guarda. Limitada a 3/hora por usuaria
 * (el detalle diario lo hace el cron, no la clienta).
 * Respuestas de error para la UI: not_connected / token_expired /
 * social_not_configured.
 */

const SYNC_HOURLY_LIMIT = 3

export async function POST(_req: NextRequest) {
  // Modo demo (sin Supabase): nada que sincronizar.
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')) {
    return NextResponse.json({ error: 'social_not_configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSocialProviderReady()) {
    return NextResponse.json({ error: 'social_not_configured' }, { status: 503 })
  }

  const rl = rateLimit(`social-sync:${user.id}`, SYNC_HOURLY_LIMIT, 3_600_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const state = await getConnectInfo(user.id, 'instagram')
  if (!state.connected) {
    return NextResponse.json({ error: 'not_connected' }, { status: 404 })
  }
  if (state.needsReauth) {
    return NextResponse.json({ error: 'token_expired' }, { status: 409 })
  }

  const result = await runSync(user.id, 'instagram')
  if (!result.ok) {
    const status =
      result.errorCode === 'token_expired'
        ? 409
        : result.errorCode === 'not_connected'
          ? 404
          : result.errorCode === 'provider_unsupported'
            ? 503
            : 500
    return NextResponse.json(
      { error: result.errorCode, message: result.message },
      { status },
    )
  }

  return NextResponse.json({ ...result.summary })
}