import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId } from '@/lib/team/api-helpers'

/**
 * GET /team/api/estrategia/ideas/list?clientId=...&actorId=...
 *
 * Devuelve las ideas de una clienta premium (todas las statuses)
 * ordenadas por order_idx. Incluye el guion completo (content_items)
 * para las ideas que tienen script_id.
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
  const { data: ideas, error } = await admin
    .from('content_ideas')
    .select('id, order_idx, title, type, pillar, objective, service, hook_idea, status, script_id, notes, created_at, updated_at')
    .eq('user_id', supabaseUserId)
    .order('order_idx', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Buscar los content_items enlazados (script_id) para ideas con guion
  const scriptIds = (ideas || [])
    .map((i: { script_id: string | null }) => i.script_id)
    .filter((id: string | null): id is string => !!id)

  let scripts: Record<string, {
    id: string
    title: string
    content_json: Record<string, unknown> | null
    visual_idea: string | null
    caption_with_hashtags: string | null
    type: string
    service: string | null
    status: string
  }> = {}

  if (scriptIds.length > 0) {
    const { data: items, error: itemsErr } = await admin
      .from('content_items')
      .select('id, title, content_json, visual_idea, caption_with_hashtags, type, service, status')
      .in('id', scriptIds)

    if (!itemsErr && items) {
      for (const item of items) {
        scripts[item.id] = item
      }
    }
  }

  return NextResponse.json({ ideas: ideas || [], scripts })
}