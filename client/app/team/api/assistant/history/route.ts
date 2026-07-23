import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId } from '@/lib/team/api-helpers'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/**
 * GET /team/api/assistant/history?clientId=...&actorId=...
 *
 * Devuelve los mensajes persistidos del chat asistente para una clienta
 * y un actor (CM/admin). Una fila por (client_user_id, actor_id).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId')
  const actorId = url.searchParams.get('actorId')

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }

  const supabaseUserId = findClientSupabaseId(clientId)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Cliente no mapeado a cuenta premium' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_client_chats')
    .select('messages')
    .eq('client_user_id', supabaseUserId)
    .eq('actor_id', actorId!)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const messages: ChatMessage[] = (data?.messages as ChatMessage[]) || []
  return NextResponse.json({ messages })
}