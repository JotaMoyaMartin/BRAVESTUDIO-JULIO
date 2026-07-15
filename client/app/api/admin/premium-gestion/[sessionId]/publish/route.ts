import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildProfile } from '@/lib/brand-extract'
import { StrategyDocument } from '@/lib/strategy-types'
import { PremiumStrategySession } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, admin: createAdminClient(), adminId: user.id }
}

// POST — publish strategy to client's brand_profiles
export async function POST(_request: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  // Load session
  const { data: session } = await auth.admin
    .from('premium_strategy_sessions')
    .select('*')
    .eq('id', params.sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const sessionRow = session as PremiumStrategySession
  const strategy = sessionRow.strategy_draft as unknown as StrategyDocument
  if (!strategy || !strategy.perfil_brave) {
    return NextResponse.json({ error: 'No hay estrategia para publicar' }, { status: 400 })
  }

  const local = buildProfile(sessionRow.transcription || '')
  const payload = {
    user_id: sessionRow.user_id,
    raw_input: sessionRow.transcription,
    salon_name: strategy.perfil_brave.match(/([^,.]+)/)?.[0]?.trim() || local.salon_name || null,
    city: local.city,
    main_services: local.main_services,
    service_to_promote: local.service_to_promote,
    content_topics: local.content_topics,
    optimized_summary: strategy.resumen_para_ia || strategy.perfil_brave,
    strategy_json: strategy as unknown as Record<string, unknown>,
    completion_status: 'complete' as const,
    updated_at: new Date().toISOString(),
  }

  // Upsert into brand_profiles
  const { data: existing } = await auth.admin
    .from('brand_profiles')
    .select('id')
    .eq('user_id', sessionRow.user_id)
    .maybeSingle()

  if (existing) {
    const { error } = await auth.admin.from('brand_profiles').update(payload).eq('user_id', sessionRow.user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await auth.admin.from('brand_profiles').insert(payload)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mark session as published
  const now = new Date().toISOString()
  await auth.admin
    .from('premium_strategy_sessions')
    .update({ status: 'published', published_at: now, updated_at: now })
    .eq('id', params.sessionId)

  // Log activity
  try {
    await auth.admin.rpc('log_user_activity', {
      p_user_id: sessionRow.user_id,
      p_event: 'premium_strategy_published',
      p_data: { published_by: auth.adminId, session_id: params.sessionId },
      p_actor: auth.adminId,
    })
  } catch (logErr) {
    console.error('log_user_activity failed:', logErr)
  }

  return NextResponse.json({ ok: true })
}