import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId, buildBrandContextForUser } from '@/lib/team/api-helpers'
import { parseExternalScript } from '@/lib/ai/prompts/external-script'

/**
 * POST /team/api/estrategia/ideas/manual-create
 * Body: { actorId, clientId, rawText, type? }
 *
 * La CM pega un guion entero (traído de fuera) en un único cuadro.
 * La IA interna lo interpreta y lo estructura en el formato BRÄVE:
 *   title, type, service, pillar, objective, hook_idea,
 *   hook, context, solution, cta, visual_idea, caption.
 * Luego crea idea (status='guion_listo') + content_item enlazado,
 * listo para mostrar al cliente de forma visual.
 *
 * Si la IA falla, usa el texto crudo como hook y el resto vacío.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { actorId, clientId, rawText, type } = body as {
    actorId?: string
    clientId?: string
    rawText?: string
    type?: string
  }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }
  if (!rawText || !rawText.trim()) {
    return NextResponse.json({ error: 'Pega el guion en el cuadro' }, { status: 400 })
  }

  const supabaseUserId = findClientSupabaseId(clientId)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Cliente no mapeado a cuenta premium' }, { status: 400 })
  }

  // Brand context para que la IA infiera servicio/pilar/tono
  const brandContext = await buildBrandContextForUser(supabaseUserId, clientId)

  const { script: s, mock } = await parseExternalScript({ rawText: rawText.trim(), brandContext: brandContext || undefined })

  // type: override explícito > IA > default reel
  const validType = type === 'carrusel' ? 'carrusel' : type === 'reel' ? 'reel' : s.type

  const admin = createAdminClient()

  // order_idx máximo para añadir al final
  const { data: maxRow } = await admin
    .from('content_ideas')
    .select('order_idx')
    .eq('user_id', supabaseUserId)
    .order('order_idx', { ascending: false })
    .limit(1)
    .maybeSingle()
  const baseOrder = (maxRow?.order_idx as number | undefined) ?? -1

  // Construir content_json del guion
  const contentJson: Record<string, unknown> = {}
  if (s.hook) contentJson.hook = s.hook
  if (s.context) contentJson.context = s.context
  if (s.solution) contentJson.solution = s.solution
  if (s.cta) contentJson.cta = s.cta

  // 1) Crear el content_item (el guion)
  const { data: item, error: itemErr } = await admin
    .from('content_items')
    .insert({
      user_id: supabaseUserId,
      type: validType,
      title: s.title,
      service: s.service || null,
      content_json: contentJson,
      visual_idea: s.visual_idea || null,
      caption_with_hashtags: s.caption || null,
      tag: 'premium-script',
      status: 'library',
      objective: s.objective || null,
      format: null,
      scheduled_date: null,
    })
    .select('id, title, content_json, visual_idea, caption_with_hashtags, type, service, status')
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ error: itemErr?.message || 'No se pudo crear el guion' }, { status: 500 })
  }

  // 2) Crear la idea enlazada al guion, status='guion_listo'
  const { data: idea, error: ideaErr } = await admin
    .from('content_ideas')
    .insert({
      user_id: supabaseUserId,
      order_idx: baseOrder + 1,
      title: s.title,
      type: validType,
      pillar: s.pillar || null,
      objective: s.objective || null,
      service: s.service || null,
      hook_idea: s.hook_idea || s.hook || null,
      status: 'guion_listo',
      script_id: item.id,
    })
    .select('id, order_idx, title, type, pillar, objective, service, hook_idea, status, script_id, notes, created_at, updated_at')
    .single()

  if (ideaErr || !idea) {
    // Rollback: borrar el item recién creado
    await admin.from('content_items').delete().eq('id', item.id)
    return NextResponse.json({ error: ideaErr?.message || 'No se pudo crear la idea' }, { status: 500 })
  }

  return NextResponse.json({ idea, script_id: item.id, item, mock })
}