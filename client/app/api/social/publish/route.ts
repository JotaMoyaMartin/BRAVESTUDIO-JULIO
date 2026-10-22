import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/crypto'
import { rateLimit } from '@/lib/rate-limit'
import { isInstagramPublishEnabled } from '@/lib/social/instagram'
import { buildPublishPlan, canPublish, publishToInstagram, type PublishInput } from '@/lib/social/publish'
import { logSync } from '@/lib/social/repo'
import type { SocialConnectionRow } from '@/types/database'

/**
 * Publicar en Instagram desde BRÄVE — PREPARADO Y APAGADO.
 *   GET  → { enabled, granted }: si la app puede publicar y si esta cuenta dio el permiso.
 *   POST → publica. Exige: INSTAGRAM_PUBLISH_ENABLED=1 (tras App Review de Meta),
 *          permiso concedido por la estilista y `confirm: true` (la UI debe
 *          enseñar la vista previa y pedir confirmación antes).
 */

const isDemo = () => !(process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

async function loadConnection(userId: string): Promise<SocialConnectionRow | null> {
  const { data } = await createAdminClient()
    .from('social_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'instagram')
    .maybeSingle()
  return (data as SocialConnectionRow | null) ?? null
}

export async function GET() {
  if (isDemo()) return NextResponse.json({ enabled: false, granted: false })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const conn = await loadConnection(user.id)
  return NextResponse.json({
    enabled: isInstagramPublishEnabled(),
    granted: !!conn && conn.status === 'active' && canPublish(conn.scopes as string[] | null),
  })
}

export async function POST(req: NextRequest) {
  if (isDemo() || !isInstagramPublishEnabled()) {
    return NextResponse.json(
      { error: 'publish_not_enabled', message: 'Publicar desde BRÄVE llegará cuando Meta apruebe el permiso.' },
      { status: 403 },
    )
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`social-publish:${user.id}`, 10, 86_400_000)
  if (!rl.ok) return NextResponse.json({ error: 'too_many', message: 'Has publicado mucho hoy desde BRÄVE — vuelve mañana.' }, { status: 429 })

  const body = (await req.json().catch(() => ({}))) as PublishInput & { confirm?: boolean }
  if (body.confirm !== true) {
    return NextResponse.json({ error: 'confirm_required', message: 'Confirma que quieres publicar.' }, { status: 400 })
  }
  const built = buildPublishPlan(body)
  if (!built.ok) return NextResponse.json({ error: 'invalid', message: built.error }, { status: 400 })

  const conn = await loadConnection(user.id)
  if (!conn) return NextResponse.json({ error: 'not_connected' }, { status: 404 })
  if (conn.status !== 'active') return NextResponse.json({ error: 'token_expired' }, { status: 409 })
  if (!canPublish(conn.scopes as string[] | null)) {
    return NextResponse.json(
      { error: 'permission_missing', message: 'Vuelve a conectar Instagram y acepta el permiso de publicar.' },
      { status: 403 },
    )
  }

  try {
    const token = decryptSecret(conn.access_token_encrypted)
    // El token va ligado a la cuenta: si no tenemos su id numérico, vale 'me'.
    const igId = /^\d+$/.test(conn.provider_account_id) ? conn.provider_account_id : 'me'
    const { mediaId } = await publishToInstagram(igId, token, body)
    await logSync(user.id, 'instagram', 'publish', 'success', { kind: body.kind, mediaId })
    return NextResponse.json({ ok: true, mediaId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error desconocido'
    await logSync(user.id, 'instagram', 'publish', 'error', { kind: body.kind, message })
    return NextResponse.json({ error: 'publish_failed', message }, { status: 502 })
  }
}

export const maxDuration = 300
