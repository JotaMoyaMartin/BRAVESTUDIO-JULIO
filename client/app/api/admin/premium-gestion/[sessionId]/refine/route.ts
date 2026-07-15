import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { serverGenerateAIContent, extractJSON } from '@/lib/ai/server-generate'
import { STRATEGY_REFINE_PROMPT } from '@/lib/ai/prompts/strategy'
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

// POST — chat refinement
export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const { message } = body as { message?: string }

  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  // Load current session
  const { data: session } = await auth.admin
    .from('premium_strategy_sessions')
    .select('*')
    .eq('id', params.sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const sessionRow = session as PremiumStrategySession
  const currentDraft = sessionRow.strategy_draft as unknown as StrategyDocument
  if (!currentDraft) {
    return NextResponse.json({ error: 'No hay estrategia draft para refinar' }, { status: 400 })
  }

  try {
    const raw = await serverGenerateAIContent(
      STRATEGY_REFINE_PROMPT(JSON.stringify(currentDraft), message.trim())
    )
    const newDraft = extractJSON<StrategyDocument>(raw)

    if (!newDraft || !newDraft.perfil_brave) {
      throw new Error('Respuesta de IA incompleta')
    }

    const now = new Date().toISOString()
    const existingMessages = (sessionRow.chat_messages as unknown as Array<{ role: string; content: string; created_at: string }>) || []
    const newMessages = [
      ...existingMessages,
      { role: 'admin', content: message.trim(), created_at: now },
      { role: 'assistant', content: 'Estrategia actualizada según tu indicación.', created_at: now },
    ]

    const { data: updated, error } = await auth.admin
      .from('premium_strategy_sessions')
      .update({
        strategy_draft: newDraft as unknown as Record<string, unknown>,
        chat_messages: newMessages as unknown as Record<string, unknown>[],
        updated_at: now,
      })
      .eq('id', params.sessionId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      strategy: newDraft,
      chatMessages: newMessages,
      session: updated as PremiumStrategySession,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'No se pudo refinar la estrategia', detail: detail.slice(0, 300) }, { status: 500 })
  }
}