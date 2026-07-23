import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId } from '@/lib/team/api-helpers'

interface ScheduledPost {
  id: string
  planning_id: string
  publication_id: string
  network: string
  metricool_post_id: string | null
  status: string
  scheduled_at: string | null
  media_url: string | null
  caption: string | null
  error: string | null
  updated_at: string
}

/**
 * GET /team/api/planning/scheduled-status?actorId=...&clientId=...&planningId=...
 *
 * Devuelve los posts programados para una planificación concreta.
 * Una fila por (publication_id, network).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId')
  const actorId = url.searchParams.get('actorId')
  const planningId = url.searchParams.get('planningId')

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (!clientId || !planningId) {
    return NextResponse.json({ error: 'clientId y planningId requeridos' }, { status: 400 })
  }

  const supabaseUserId = findClientSupabaseId(clientId)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Cliente no mapeado a cuenta premium' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_scheduled_posts')
    .select('id, planning_id, publication_id, network, metricool_post_id, status, scheduled_at, media_url, caption, error, updated_at')
    .eq('client_user_id', supabaseUserId)
    .eq('planning_id', planningId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const posts: ScheduledPost[] = (data || []) as ScheduledPost[]
  return NextResponse.json({ posts })
}