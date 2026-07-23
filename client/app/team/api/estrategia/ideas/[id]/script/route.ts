import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, buildBrandContextForUser, findClientIdBySupabaseId } from '@/lib/team/api-helpers'
import { generateReel, ReelInput, ContentObjective } from '@/lib/ai/prompts/reels'

/**
 * POST /team/api/estrategia/ideas/[id]/script
 * Body: { actorId }
 *
 * Genera un guion BRÄVE para una idea confirmada, lo inserta en
 * `content_items(tag='premium-script')` y enlaza `content_ideas.script_id`
 * dejando la idea en status='guion_listo'.
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const ideaId = ctx.params.id
  const body = await req.json().catch(() => ({}))
  const { actorId } = body as { actorId?: string }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const admin = createAdminClient()

  // 1) Cargar la idea
  const { data: idea, error: ideaErr } = await admin
    .from('content_ideas')
    .select('id, user_id, title, type, pillar, objective, service, hook_idea, status, script_id')
    .eq('id', ideaId)
    .maybeSingle()
  if (ideaErr || !idea) {
    return NextResponse.json({ error: 'Idea no encontrada' }, { status: 404 })
  }
  if (idea.status !== 'confirmada' && idea.status !== 'guion_listo') {
    return NextResponse.json({ error: 'La idea debe estar confirmada para generar guion' }, { status: 400 })
  }

  // 2) Brand context de la clienta (con fallback a datos del Modo Equipo)
  const clientId = findClientIdBySupabaseId(idea.user_id)
  const brandContext = await buildBrandContextForUser(idea.user_id, clientId || undefined)

  // 3) Mapear objetivo de la idea → ContentObjective de reels.ts
  const objMap: Record<string, ContentObjective> = {
    educacion: 'educativo',
    autoridad: 'autoridad',
    inspiracion: 'visibilidad',
    venta: 'venta',
    deseo: 'venta',
    dolor: 'educativo',
    objecion: 'educativo',
    testimonio: 'visibilidad',
    caso_exito: 'visibilidad',
    viralidad: 'visibilidad',
  }
  const objective = objMap[idea.objective] || 'autoridad'

  const reelInput: ReelInput = {
    service: idea.service || idea.pillar || 'servicio',
    objective,
    brandContext: brandContext || undefined,
    freeText: `${idea.title}. Gancho: ${idea.hook_idea || ''}`,
  }

  const reel = await generateReel(reelInput)

  // 4) Insertar content_items con tag='premium-script'
  const contentType = idea.type === 'carrusel' ? 'carrusel' : idea.type === 'story' ? 'story' : 'reel'
  const { data: item, error: itemErr } = await admin
    .from('content_items')
    .insert({
      user_id: idea.user_id,
      type: contentType,
      title: idea.title,
      service: idea.service || null,
      content_json: reel.script as Record<string, unknown>,
      visual_idea: reel.visualIdea || null,
      caption_with_hashtags: reel.captionWithHashtags || null,
      tag: 'premium-script',
      status: 'library',
      objective: idea.objective || null,
      format: null,
      scheduled_date: null,
    })
    .select()
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ error: itemErr?.message || 'No se pudo crear el guion' }, { status: 500 })
  }

  // 5) Enlazar idea → script_id y marcar guion_listo
  const { error: linkErr } = await admin
    .from('content_ideas')
    .update({
      script_id: item.id,
      status: 'guion_listo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)

  if (linkErr) {
    // Rollback: borrar el item recién creado
    await admin.from('content_items').delete().eq('id', item.id)
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ idea_id: ideaId, script_id: item.id, item, reel })
}