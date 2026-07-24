import { NextRequest, NextResponse } from 'next/server'
import { resolveActor } from '@/lib/team/api-helpers'
import {
  buildProductividadPrompt,
  summarizeTasksForPrompt,
  summarizeGoalsForPrompt,
  type ProductividadContext,
  type ProductividadAction,
  type AIResponse,
} from '@/lib/team/ai/productividad-prompt'
import { serverGenerateAIContent } from '@/lib/ai/server-generate'
import type { ProductivityTask, Goal } from '@/lib/team/types'

/**
 * POST /team/api/productividad/chat
 * Body: { actorId, message, context: { goals, tasks, focusSessionsCount, focusModeActive } }
 *
 * Asistente IA agéntico de productividad. Puede crear/mover/priorizar tareas.
 * Devuelve { reply, actions } donde actions se ejecutan en el cliente.
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

  let reply = ''
  let actions: ProductividadAction[] = []

  try {
    const raw = await serverGenerateAIContent(prompt)
    if (!raw || !raw.trim()) {
      reply = 'No he podido generar una respuesta en este momento. Inténtalo de nuevo.'
    } else {
      const parsed = parseAIResponse(raw)
      reply = parsed.reply
      actions = parsed.actions
    }
  } catch {
    reply = 'El asistente no está disponible ahora mismo. Prueba de nuevo en un momento.'
  }

  return NextResponse.json({ reply: reply.trim(), actions })
}

// ─────────────────────────────────────────────
// Parse AI response — extract JSON from markdown code blocks or raw JSON
// ─────────────────────────────────────────────
function parseAIResponse(raw: string): AIResponse {
  // Try to extract JSON from ```json ... ``` block
  const jsonBlockMatch = raw.match(/```json\s*([\s\S]*?)```/i)
  const jsonText = jsonBlockMatch ? jsonBlockMatch[1].trim() : raw.trim()

  try {
    const parsed = JSON.parse(jsonText) as Partial<AIResponse>
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : raw,
      actions: Array.isArray(parsed.actions) ? validateActions(parsed.actions) : [],
    }
  } catch {
    // JSON parse failed — return raw text as reply, no actions
    return { reply: raw, actions: [] }
  }
}

function validateActions(actions: unknown[]): ProductividadAction[] {
  const valid: ProductividadAction[] = []
  const validTypes = ['create_task', 'move_task', 'set_priority', 'link_goal', 'delete_task']
  const validColumns = ['ahora', 'esta_semana', 'hecho']
  const validPriorities = ['alta', 'media', 'baja']

  for (const a of actions) {
    if (!a || typeof a !== 'object') continue
    const action = a as Record<string, unknown>
    const type = action.type
    if (typeof type !== 'string' || !validTypes.includes(type)) continue

    if (type === 'create_task') {
      if (typeof action.title !== 'string' || !action.title.trim()) continue
      valid.push({
        type: 'create_task',
        title: action.title.trim(),
        description: typeof action.description === 'string' ? action.description : undefined,
        priority: validPriorities.includes(action.priority as string) ? action.priority as 'alta' | 'media' | 'baja' : undefined,
        column: validColumns.includes(action.column as string) ? action.column as 'ahora' | 'esta_semana' | 'hecho' : undefined,
        goalId: typeof action.goalId === 'string' ? action.goalId : null,
        estimatedMinutes: typeof action.estimatedMinutes === 'number' ? action.estimatedMinutes : null,
      })
    } else if (type === 'move_task') {
      if (typeof action.taskId !== 'string') continue
      if (!validColumns.includes(action.column as string)) continue
      valid.push({ type: 'move_task', taskId: action.taskId, column: action.column as 'ahora' | 'esta_semana' | 'hecho' })
    } else if (type === 'set_priority') {
      if (typeof action.taskId !== 'string') continue
      if (!validPriorities.includes(action.priority as string)) continue
      valid.push({ type: 'set_priority', taskId: action.taskId, priority: action.priority as 'alta' | 'media' | 'baja' })
    } else if (type === 'link_goal') {
      if (typeof action.taskId !== 'string') continue
      valid.push({ type: 'link_goal', taskId: action.taskId, goalId: typeof action.goalId === 'string' ? action.goalId : null })
    } else if (type === 'delete_task') {
      if (typeof action.taskId !== 'string') continue
      valid.push({ type: 'delete_task', taskId: action.taskId })
    }
  }

  return valid
}