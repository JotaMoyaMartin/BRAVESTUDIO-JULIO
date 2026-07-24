import { NextRequest, NextResponse } from 'next/server'
import { resolveActor } from '@/lib/team/api-helpers'
import {
  buildProductividadPrompt,
  summarizeTasksForPrompt,
  summarizeProjectsForPrompt,
  summarizeWeeklyStats,
  type ProductividadContext,
} from '@/lib/team/ai/productividad-prompt'
import { serverGenerateAIContent } from '@/lib/ai/server-generate'
import type { ProductivityTask, Project, DailyStats } from '@/lib/team/types'

/**
 * POST /team/api/productividad/chat
 * Body: { actorId, message, context: { tasks, projects, inboxCount, dailyStats, focusModeActive } }
 *
 * Asistente IA de productividad. Construye el contexto (tablero + proyectos +
 * bandeja + stats semanales), llama a la IA (no streaming) y devuelve la respuesta.
 * Todos los roles pueden usar este asistente (no requiere canManageStrategy).
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
      tasks?: ProductivityTask[]
      projects?: Project[]
      inboxCount?: number
      dailyStats?: DailyStats[]
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
  const projects = context?.projects || []
  const inboxCount = context?.inboxCount ?? 0
  const dailyStats = context?.dailyStats || []
  const focusModeActive = context?.focusModeActive ?? false

  const ctx: ProductividadContext = {
    userName: actor.name,
    userRole: actor.role,
    tasksSummary: summarizeTasksForPrompt(tasks, projects),
    projectsSummary: summarizeProjectsForPrompt(projects, tasks),
    inboxCount,
    weeklyStats: summarizeWeeklyStats(dailyStats),
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