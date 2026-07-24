import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy } from '@/lib/team/api-helpers'

/**
 * DELETE /team/api/estrategia/items/[id]
 * Body: { actorId }
 *
 * Borra un content_item individual (guion huérfano sin idea vinculada).
 * También desvincula cualquier content_idea que apunte a este item.
 * Solo admin/CM.
 */
export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const itemId = ctx.params.id
  const body = await req.json().catch(() => ({}))
  const { actorId } = body as { actorId?: string }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const admin = createAdminClient()

  // 1) Desvincular cualquier content_idea que apunte a este item
  await admin
    .from('content_ideas')
    .update({ script_id: null, status: 'confirmada', updated_at: new Date().toISOString() })
    .eq('script_id', itemId)

  // 2) Borrar el content_item
  const { error } = await admin.from('content_items').delete().eq('id', itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}