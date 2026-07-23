import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy } from '@/lib/team/api-helpers'

/**
 * POST /team/api/estrategia/ideas/[id]/manual-script
 * Body: { actorId, hook?, context?, solution?, cta?, visual_idea?, caption?, title? }
 *
 * Permite a la CM pegar un guion creado externamente (fuera de la IA de la
 * plataforma) y enlazarlo a la idea igual que un guion generado por IA.
 * Crea un content_items(tag='premium-script') y actualiza la idea.
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const ideaId = ctx.params.id
  const body = await req.json().catch(() => ({}))
  const { actorId, hook, context, solution, cta, visual_idea, caption, title } = body as {
    actorId?: string
    hook?: string
    context?: string
    solution?: string
    cta?: string
    visual_idea?: string
    caption?: string
    title?: string
  }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Debe tener al menos un campo del guion
  if (!hook && !context && !solution && !cta) {
    return NextResponse.json({ error: 'Debes pegar al menos una parte del guion' }, { status: 400 })
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
    return NextResponse.json({ error: 'La idea debe estar confirmada' }, { status: 400 })
  }

  // 2) Construir content_json del guion
  const contentJson: Record<string, unknown> = {}
  if (hook) contentJson.hook = hook
  if (context) contentJson.context = context
  if (solution) contentJson.solution = solution
  if (cta) contentJson.cta = cta

  const contentType = idea.type === 'carrusel' ? 'carrusel' : 'reel'

  // 3) Si ya tiene script_id, actualizar; si no, crear nuevo
  if (idea.script_id) {
    const { data: item, error: itemErr } = await admin
      .from('content_items')
      .update({
        title: title || idea.title,
        content_json: contentJson,
        visual_idea: visual_idea || null,
        caption_with_hashtags: caption || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', idea.script_id)
      .select('id, title, content_json, visual_idea, caption_with_hashtags, type, service, status')
      .single()

    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

    await admin
      .from('content_ideas')
      .update({ status: 'guion_listo', updated_at: new Date().toISOString() })
      .eq('id', ideaId)

    return NextResponse.json({ idea_id: ideaId, script_id: item.id, item, reel: { script: contentJson, visualIdea: visual_idea || '', captionWithHashtags: caption || '' } })
  }

  // Crear nuevo content_item
  const { data: item, error: itemErr } = await admin
    .from('content_items')
    .insert({
      user_id: idea.user_id,
      type: contentType,
      title: title || idea.title,
      service: idea.service || null,
      content_json: contentJson,
      visual_idea: visual_idea || null,
      caption_with_hashtags: caption || null,
      tag: 'premium-script',
      status: 'library',
      objective: idea.objective || null,
      format: null,
      scheduled_date: null,
    })
    .select('id, title, content_json, visual_idea, caption_with_hashtags, type, service, status')
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ error: itemErr?.message || 'No se pudo crear el guion' }, { status: 500 })
  }

  // 4) Enlazar idea → script_id
  const { error: linkErr } = await admin
    .from('content_ideas')
    .update({
      script_id: item.id,
      status: 'guion_listo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)

  if (linkErr) {
    await admin.from('content_items').delete().eq('id', item.id)
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ idea_id: ideaId, script_id: item.id, item, reel: { script: contentJson, visualIdea: visual_idea || '', captionWithHashtags: caption || '' } })
}