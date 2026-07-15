import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAIContent, extractJSON } from '@/lib/ai/client'
import { STRATEGY_PROMPT } from '@/lib/ai/prompts/strategy'
import { buildProfile } from '@/lib/brand-extract'
import { StrategyDocument } from '@/lib/strategy-types'
import { Profile, PremiumStrategySession } from '@/types/database'

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

// GET — list premium clients + their latest session
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const [profilesRes, sessionsRes] = await Promise.all([
    auth.admin.from('profiles').select('id, email, full_name, salon_name').eq('role', 'premium').order('full_name', { ascending: true }),
    auth.admin.from('premium_strategy_sessions').select('*').order('created_at', { ascending: false }),
  ])

  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 })
  if (sessionsRes.error) return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 })

  const profiles = (profilesRes.data as Pick<Profile, 'id' | 'email' | 'full_name' | 'salon_name'>[]) || []
  const allSessions = (sessionsRes.data as PremiumStrategySession[]) || []

  // Group sessions by user, keep the most recent per user
  const sessionByUser = new Map<string, PremiumStrategySession>()
  for (const s of allSessions) {
    if (!sessionByUser.has(s.user_id)) {
      sessionByUser.set(s.user_id, s)
    }
  }

  const clients = profiles.map(p => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    salon_name: p.salon_name,
    lastSession: sessionByUser.get(p.id) || null,
  }))

  return NextResponse.json({ clients })
}

// POST — generate strategy from transcription, create draft session
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const { userId, transcription } = body as { userId?: string; transcription?: string }

  if (!userId || !transcription || !transcription.trim()) {
    return NextResponse.json({ error: 'userId y transcription son obligatorios' }, { status: 400 })
  }

  // Verify target user is premium
  const { data: targetProfile } = await auth.admin
    .from('profiles')
    .select('role')
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

    // Create session draft
    const { data: session, error } = await auth.admin
      .from('premium_strategy_sessions')
      .insert({
        user_id: userId,
        admin_id: auth.adminId,
        transcription: transcription.trim(),
        strategy_draft: parsed as unknown as Record<string, unknown>,
        chat_messages: [],
        status: 'draft',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ session: session as PremiumStrategySession, strategy: parsed })
  } catch {
    return NextResponse.json({ error: 'No se pudo generar la estrategia. Inténtalo de nuevo.' }, { status: 500 })
  }
}