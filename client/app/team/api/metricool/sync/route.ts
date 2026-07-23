import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId } from '@/lib/team/api-helpers'
import { fetchMetricoolStats, verifyMetricoolCreds, type MetricoolCreds } from '@/lib/metricool/client'

/**
 * POST /team/api/metricool/sync
 * Body: { actorId, clientId, month?, network? }
 *   - month: YYYY-MM-01 (default: primer día del mes actual)
 *   - network: 'instagram' | 'tiktok' | 'facebook' (default: todas las de config.networks)
 *
 * Lee `metricool_config` de la clienta, llama a la API de Metricool para
 * el mes indicado, y upserta `metricool_metrics` (una fila por red).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { actorId, clientId, month, network } = body as {
    actorId?: string
    clientId?: string
    month?: string
    network?: string
  }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }

  const supabaseUserId = findClientSupabaseId(clientId)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Cliente no mapeado a cuenta premium' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: config, error: cfgErr } = await admin
    .from('metricool_config')
    .select('user_token, metricool_user_id, blog_id, networks')
    .eq('user_id', supabaseUserId)
    .maybeSingle()
  if (cfgErr || !config) {
    return NextResponse.json({ error: 'La clienta no tiene metricool_config configurado' }, { status: 400 })
  }

  const creds: MetricoolCreds = {
    userToken: config.user_token,
    userId: config.metricool_user_id,
    blogId: config.blog_id,
  }

  // Verificar creds antes de proceder (evita guardados parciales basura)
  const ok = await verifyMetricoolCreds(creds)
  if (!ok) {
    return NextResponse.json({ error: 'Credenciales de Metricool inválidas o expiradas' }, { status: 400 })
  }

  // Resolver el mes objetivo
  let monthDate: Date
  if (month) {
    const parts = month.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) {
      return NextResponse.json({ error: 'month debe ser YYYY-MM-01' }, { status: 400 })
    }
    monthDate = new Date(parts[0], parts[1] - 1, 1)
  } else {
    const now = new Date()
    monthDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const networks: string[] = network
    ? [network]
    : (config.networks && config.networks.length > 0 ? config.networks : ['instagram'])

  const results: Array<{ network: string; ok: boolean; error?: string; metrics?: unknown }> = []

  for (const net of networks) {
    const stats = await fetchMetricoolStats(creds, monthDate, net)
    if (!stats) {
      results.push({ network: net, ok: false, error: 'Sin datos de Metricool para este mes' })
      continue
    }

    const { error: upErr } = await admin
      .from('metricool_metrics')
      .upsert({
        user_id: supabaseUserId,
        month: stats.month,
        network: stats.network,
        followers: stats.followers,
        reach: stats.reach,
        impressions: stats.impressions,
        engagement_rate: stats.engagement_rate,
        posts_count: stats.posts_count,
        raw_json: stats.raw,
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'user_id,month,network' })

    if (upErr) {
      results.push({ network: net, ok: false, error: upErr.message })
    } else {
      results.push({ network: net, ok: true, metrics: stats })
    }
  }

  // Marcar last_sync_at
  await admin
    .from('metricool_config')
    .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', supabaseUserId)

  return NextResponse.json({ ok: true, results })
}