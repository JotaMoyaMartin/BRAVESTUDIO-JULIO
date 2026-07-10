import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAIContent, extractJSON } from '@/lib/ai/client'
import { STRATEGY_PROMPT } from '@/lib/ai/prompts/strategy'
import { buildProfile } from '@/lib/brand-extract'
import { StrategyDocument } from '@/lib/strategy-types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!myProfile || (myProfile.role !== 'admin' && myProfile.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { userId, transcription } = body as { userId?: string; transcription?: string }

  if (!userId || !transcription || !transcription.trim()) {
    return NextResponse.json({ error: 'userId y transcription son obligatorios' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Verify target user is premium
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', userId)
    .single()

  if (!targetProfile || targetProfile.role !== 'premium') {
    return NextResponse.json({ error: 'El usuario no es premium' }, { status: 400 })
  }

  try {
    const raw = await generateAIContent(STRATEGY_PROMPT(transcription))
    const parsed = extractJSON<StrategyDocument>(raw)

    if (!parsed || !parsed.perfil_brave) {
      throw new Error('Respuesta de IA incompleta')
    }

    const local = buildProfile(transcription)
    const payload = {
      user_id: userId,
      raw_input: transcription,
      salon_name: parsed.perfil_brave.match(/([^,.]+)/)?.[0]?.trim() || local.salon_name || null,
      city: local.city,
      main_services: local.main_services,
      service_to_promote: local.service_to_promote,
      content_topics: local.content_topics,
      optimized_summary: parsed.resumen_para_ia || parsed.perfil_brave,
      strategy_json: parsed as unknown as Record<string, unknown>,
      completion_status: 'complete' as const,
      updated_at: new Date().toISOString(),
    }

    // Check if brand_profiles already exists
    const { data: existing } = await adminClient
      .from('brand_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      await adminClient.from('brand_profiles').update(payload).eq('user_id', userId)
    } else {
      await adminClient.from('brand_profiles').insert(payload)
    }

    // Log activity
    try {
      await adminClient.rpc('log_user_activity', {
        p_user_id: userId,
        p_event: 'premium_strategy_generated',
        p_data: { generated_by: 'admin' },
        p_actor: user.id,
      })
    } catch (logErr) {
      console.error('log_user_activity failed:', logErr)
    }

    return NextResponse.json({ ok: true, strategy: parsed })
  } catch {
    return NextResponse.json({ error: 'No se pudo generar la estrategia. Inténtalo de nuevo.' }, { status: 500 })
  }
}