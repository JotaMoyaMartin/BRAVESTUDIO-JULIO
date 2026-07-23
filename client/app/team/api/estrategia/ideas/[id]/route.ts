import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy } from '@/lib/team/api-helpers'

/**
 * PATCH /team/api/estrategia/ideas/[id]
 * Body: { actorId, status?, title?, hook_idea?, notes?, pillar?, objective?, service?, type?, order_idx? }
 *
 * Actualiza campos de una idea. Solo admin/CM. La idea pertenece a una
 * clienta premium (user_id en la fila), pero la gestión la hace el equipo.
 */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const ideaId = ctx.params.id
  const body = await req.json().catch(() => ({}))
  const { actorId, ...patch } = body as Record<string, unknown>

  const actor = resolveActor(actorId as string | undefined)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const allowed: Record<string, boolean> = {
    status: true,
    title: true,
    hook_idea: true,
    notes: true,
    pillar: true,
    objective: true,
    service: true,
    type: true,
    order_idx: true,
  }
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (allowed[k] && v !== undefined) clean[k] = v
  }

  if (clean.status) {
    const valid = ['propuesta', 'confirmada', 'descartada', 'guion_listo', 'hecha']
    if (!valid.includes(clean.status as string)) {
      return NextResponse.json({ error: 'status inválido' }, { status: 400 })
    }
  }
  if (clean.type) {
    const valid = ['reel', 'carrusel', 'story']
    if (!valid.includes(clean.type as string)) {
      return NextResponse.json({ error: 'type inválido' }, { status: 400 })
    }
  }

  clean.updated_at = new Date().toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('content_ideas')
    .update(clean)
    .eq('id', ideaId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ idea: data })
}

/**
 * DELETE /team/api/estrategia/ideas/[id]
 * Body: { actorId }
 */
export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const ideaId = ctx.params.id
  const body = await req.json().catch(() => ({}))
  const { actorId } = body as { actorId?: string }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('content_ideas').delete().eq('id', ideaId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}