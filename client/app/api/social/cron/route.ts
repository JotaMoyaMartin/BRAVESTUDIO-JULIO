import { NextRequest, NextResponse } from 'next/server'
import { isSocialProviderReady, listActiveConnections } from '@/lib/social/repo'
import { runSync } from '@/lib/social/sync'
import type { SocialProvider } from '@/lib/social/types'

/**
 * Cron diario de sincronización social (Vercel Cron, 05:00 UTC — ver
 * vercel.json). Protegido por SOCIAL_CRON_SECRET (Bearer): sin env → 503.
 *
 * NOTA maxDuration=300: en Vercel Hobby el límite real es 60 s por
 * función — una cuenta con 50 media tarda ~1-2 min, así que en Hobby
 * sincronizará 1-2 cuentas por ejecución. En Pro el límite de 300 s
 * permite procesarlas todas. El log marca cada sync, así que las que
 * no llegan a correr quedan para el día siguiente sin estado corrupto.
 */
export const maxDuration = 300

/** Comparación en tiempo constante (patrón lib/team/guard.ts). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function GET(request: NextRequest) {
  const secret = process.env.SOCIAL_CRON_SECRET
  if (!secret || secret.trim().length === 0) {
    return NextResponse.json({ error: 'social_cron_not_configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  if (!auth || !safeEqual(auth, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSocialProviderReady()) {
    return NextResponse.json({ error: 'social_not_configured' }, { status: 503 })
  }

  const provider: SocialProvider = 'instagram'
  const connections = await listActiveConnections(provider)

  let synced = 0
  let failed = 0
  for (const conn of connections) {
    try {
      const result = await runSync(conn.userId, provider)
      if (result.ok) synced += 1
      else failed += 1
    } catch {
      failed += 1
    }
  }

  return NextResponse.json({
    ok: true,
    synced,
    errors: failed,
  })
}