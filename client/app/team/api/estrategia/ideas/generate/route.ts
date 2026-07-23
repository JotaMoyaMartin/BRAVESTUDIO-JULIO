import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId, buildBrandContextForUser } from '@/lib/team/api-helpers'
import { generateIdeas } from '@/lib/ai/prompts/ideas'

/**
 * POST /team/api/estrategia/ideas/generate
 * Body: { actorId, clientId, count }
 *
 * Genera `count` ideas de contenido para la clienta premium mapeada al
 * cliente del Modo Equipo. Las inserta en `content_ideas` con status='propuesta'.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { actorId, clientId, count } = body as { actorId?: string; clientId?: string; count?: number }

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

  const n = Math.max(1, Math.min(10, Number(count) || 5))

  const admin = createAdminClient()

  // Brand context de la clienta
  const brandContext = await buildBrandContextForUser(supabaseUserId, clientId)
  if (!brandContext) {
    return NextResponse.json({ error: 'La clienta no tiene brand_profile configurado' }, { status: 400 })
  }

  // Títulos ya presentes (propuesta/confirmada/guion_listo/hecha) para no repetir
  const { data: existing } = await admin
    .from('content_ideas')
    .select('title, status')
    .eq('user_id', supabaseUserId)
    .in('status', ['propuesta', 'confirmada', 'guion_listo', 'hecha'])

  const completedTitles = (existing || []).filter(x => x.status === 'hecha').map(x => x.title)
  const confirmedTitles = (existing || []).filter(x => x.status !== 'hecha').map(x => x.title)

  const { ideas, mock } = await generateIdeas({
    brandContext,
    count: n,
    completedTitles,
    confirmedTitles,
  })

  // Traer el order_idx máximo para añadir al final
  const { data: maxRow } = await admin
    .from('content_ideas')
    .select('order_idx')
    .eq('user_id', supabaseUserId)
    .order('order_idx', { ascending: false })
    .limit(1)
    .maybeSingle()
  const baseOrder = (maxRow?.order_idx as number | undefined) ?? -1

  const rows = ideas.map((it, i) => ({
    user_id: supabaseUserId,
    order_idx: baseOrder + 1 + i,
    title: it.title,
    type: it.type,
    pillar: it.pillar,
    objective: it.objective,
    service: it.service,
    hook_idea: it.hook_idea,
    status: 'propuesta' as const,
  }))

  const { data, error } = await admin
    .from('content_ideas')
    .insert(rows)
    .select('id, title, type, pillar, objective, service, hook_idea, status, order_idx, created_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ideas: data, mock })
}