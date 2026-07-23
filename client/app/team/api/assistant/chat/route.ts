import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId, buildBrandContextForUser } from '@/lib/team/api-helpers'
import { buildAssistantPrompt, summarizeIdeas, summarizeMetrics, type ChatTurn } from '@/lib/team/ai/assistant-prompt'
import { serverGenerateAIContent } from '@/lib/ai/server-generate'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/**
 * POST /team/api/assistant/chat
 * Body: { actorId, clientId, message }
 *
 * Asistente IA context-aware por clienta. Construye el contexto (marca +
 * plan + métricas), llama a la IA (no streaming), persiste el mensaje y la
 * respuesta en team_client_chats y devuelve ambos.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { actorId, clientId, message, section } = body as { actorId?: string; clientId?: string; message?: string; section?: string }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }
  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  const supabaseUserId = findClientSupabaseId(clientId)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Cliente no mapeado a cuenta premium' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Cargar chat existente + contexto en paralelo
  const [brandCtx, ideasRes, metricsRes, chatRes] = await Promise.all([
    buildBrandContextForUser(supabaseUserId, clientId),
    admin.from('content_ideas')
      .select('status, title')
      .eq('user_id', supabaseUserId)
      .in('status', ['propuesta', 'confirmada', 'guion_listo', 'hecha'])
      .order('order_idx', { ascending: true })
      .limit(20),
    admin.from('metricool_metrics')
      .select('month, network, followers, reach, engagement_rate, posts_count')
      .eq('user_id', supabaseUserId)
      .order('month', { ascending: true }),
    admin.from('team_client_chats')
      .select('messages')
      .eq('client_user_id', supabaseUserId)
      .eq('actor_id', actorId!)
      .maybeSingle(),
  ])

  const ideas = (ideasRes.data || []) as { status: string; title: string }[]
  const metrics = (metricsRes.data || []) as {
    month: string; network: string; followers: number | null
    reach: number | null; engagement_rate: number | null; posts_count: number | null
  }[]
  const existingMessages: ChatMessage[] = (chatRes.data?.messages as ChatMessage[]) || []

  // Construir historial (últimos 12 mensajes)
  const history: ChatTurn[] = existingMessages.slice(-12).map(m => ({ role: m.role, content: m.content }))

  // Datos del cliente (nombre) desde mock-data
  const { CLIENTS } = require('@/lib/team/mock-data') as typeof import('@/lib/team/mock-data')
  const client = CLIENTS.find(c => c.id === clientId)
  const clientName = client?.name || 'la clienta'

  const prompt = buildAssistantPrompt(
    { clientName, brandContext: brandCtx || '', ideasSummary: summarizeIdeas(ideas), metricsSummary: summarizeMetrics(metrics), section: section || 'ficha' },
    history,
    message.trim(),
  )

  let reply: string
  try {
    reply = await serverGenerateAIContent(prompt)
    if (!reply || !reply.trim()) {
      reply = 'No he podido generar una respuesta en este momento. Inténtalo de nuevo.'
    }
  } catch {
    reply = 'El asistente no está disponible ahora mismo (IA no configurada). Aun así puedes trabajar el plan en la pestaña Estrategia.'
  }

  const now = new Date().toISOString()
  const newMessages: ChatMessage[] = [
    ...existingMessages,
    { role: 'user', content: message.trim(), created_at: now },
    { role: 'assistant', content: reply.trim(), created_at: now },
  ]

  // Persistir (upsert por client_user_id + actor_id)
  if (chatRes.data) {
    await admin.from('team_client_chats')
      .update({ messages: newMessages, updated_at: now })
      .eq('client_user_id', supabaseUserId)
      .eq('actor_id', actorId!)
  } else {
    await admin.from('team_client_chats')
      .insert({ client_user_id: supabaseUserId, actor_id: actorId!, messages: newMessages })
  }

  return NextResponse.json({ reply: reply.trim(), messages: newMessages })
}