import { NextRequest, NextResponse } from 'next/server'
import { resolveActor } from '@/lib/team/api-helpers'
import {
  buildProductividadPrompt,
  summarizeTasksForPrompt,
  summarizeGoalsForPrompt,
  type ProductividadContext,
} from '@/lib/team/ai/productividad-prompt'
import { serverGenerateAIContent } from '@/lib/ai/server-generate'
import type { ProductivityTask, Goal } from '@/lib/team/types'

/**
 * POST /team/api/productividad/chat
 * Body: { actorId, message, context: { goals, tasks, focusSessionsCount, focusModeActive } }
 *
 * Asistente IA de productividad v2. Contexto simplificado: objetivos + tareas.
 * Todos los roles pueden usar este asistente.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const {
    actorId,
    message,
    context,
  } = body as {
    actorId?: string
    message?: string
    context?: {
      goals?: Goal[]
      tasks?: ProductivityTask[]
      focusSessionsCount?: number
      focusModeActive?: boolean
    }
  }

  const actor = resolveActor(actorId)
  if (!actor) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  const tasks = context?.tasks || []
  const goals = context?.goals || []
  const focusSessionsCount = context?.focusSessionsCount ?? 0
  const focusModeActive = context?.focusModeActive ?? false

  const ctx: ProductividadContext = {
    userName: actor.name,
    userRole: actor.role,
    goalsSummary: summarizeGoalsForPrompt(goals, tasks),
    tasksSummary: summarizeTasksForPrompt(tasks),
    focusSessionsCount,
    focusModeActive,
  }

  const prompt = buildProductividadPrompt(ctx, [], message.trim())

  let reply: string
  try {
    reply = await serverGenerateAIContent(prompt)
    if (!reply || !reply.trim()) {
      reply = 'No he podido generar una respuesta en este momento. Inténtalo de nuevo.'
    }
  } catch {
    reply = 'El asistente no está disponible ahora mismo. Prueba de nuevo en un momento.'
  }

  return NextResponse.json({ reply: reply.trim() })
}