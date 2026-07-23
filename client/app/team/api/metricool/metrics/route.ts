import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId } from '@/lib/team/api-helpers'

/**
 * GET /team/api/metricool/metrics?clientId=...&actorId=...
 *
 * Devuelve las métricas guardadas de la clienta (todos los meses y redes).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId')
  const actorId = url.searchParams.get('actorId')

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
  const { data, error } = await admin
    .from('metricool_metrics')
    .select('*')
    .eq('user_id', supabaseUserId)
    .order('month', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ metrics: data || [] })
}