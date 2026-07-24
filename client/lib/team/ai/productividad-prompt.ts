import type { Goal, ProductivityTask } from '@/lib/team/types'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface ProductividadContext {
  userName: string
  userRole: string
  goalsSummary: string
  tasksSummary: string
  focusSessionsCount: number
  focusModeActive: boolean
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export type ProductividadAction =
  | { type: 'create_task'; title: string; description?: string; priority?: 'alta' | 'media' | 'baja'; column?: 'ahora' | 'esta_semana' | 'hecho'; goalId?: string | null; estimatedMinutes?: number | null }
  | { type: 'move_task'; taskId: string; column: 'ahora' | 'esta_semana' | 'hecho' }
  | { type: 'set_priority'; taskId: string; priority: 'alta' | 'media' | 'baja' }
  | { type: 'link_goal'; taskId: string; goalId: string | null }
  | { type: 'delete_task'; taskId: string }

export interface AIResponse {
  reply: string
  actions: ProductividadAction[]
}

// ─────────────────────────────────────────────
// Summarize functions (include IDs for agentic actions)
// ─────────────────────────────────────────────
export function summarizeGoalsForPrompt(goals: Goal[], _tasks: ProductivityTask[]): string {
  if (goals.length === 0) return 'Sin objetivos definidos.'
  const monthly = goals.filter(g => g.period === 'monthly')
  const weekly = goals.filter(g => g.period === 'weekly')
  const lines: string[] = []
  if (monthly.length > 0) {
    lines.push('OBJETIVOS MENSUALES:')
    monthly.forEach(g => {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0
      lines.push(`  [${g.id}] ${g.title}: ${g.current}/${g.target} (${pct}%)`)
    })
  }
  if (weekly.length > 0) {
    lines.push('OBJETIVOS SEMANALES:')
    weekly.forEach(g => {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0
      lines.push(`  [${g.id}] ${g.title}: ${g.current}/${g.target} (${pct}%)`)
    })
  }
  return lines.join('\n')
}

export function summarizeTasksForPrompt(tasks: ProductivityTask[]): string {
  if (tasks.length === 0) return 'Sin tareas.'
  const byCol: Record<string, ProductivityTask[]> = { ahora: [], esta_semana: [], hecho: [] }
  tasks.forEach(t => {
    if (byCol[t.column]) byCol[t.column].push(t)
  })
  const lines: string[] = []
  if (byCol.ahora.length > 0) {
    lines.push('AHORA:')
    byCol.ahora.forEach(t => lines.push(`  [${t.id}] ${t.title} — prioridad:${t.priority}${t.goalId ? ` — objetivo:${t.goalId}` : ''}${t.estimatedMinutes ? ` — ${t.estimatedMinutes}min` : ''}`))
  }
  if (byCol.esta_semana.length > 0) {
    lines.push('ESTA SEMANA:')
    byCol.esta_semana.forEach(t => lines.push(`  [${t.id}] ${t.title} — prioridad:${t.priority}${t.goalId ? ` — objetivo:${t.goalId}` : ''}${t.estimatedMinutes ? ` — ${t.estimatedMinutes}min` : ''}`))
  }
  if (byCol.hecho.length > 0) {
    lines.push(`HECHO: ${byCol.hecho.length} completadas`)
  }
  return lines.join('\n')
}

// ─────────────────────────────────────────────
// Build prompt — agentic with JSON output
// ─────────────────────────────────────────────
export function buildProductividadPrompt(
  ctx: ProductividadContext,
  history: ChatTurn[],
  newMessage: string,
): string {
  const recentHistory = history.slice(-12)
  const historyText = recentHistory.length > 0
    ? recentHistory.map(t => `${t.role === 'user' ? 'USUARIO' : 'BRAVI'}: ${t.content}`).join('\n')
    : '(sin historial)'

  return `Eres BRAVI, asesor de productividad del equipo BRÄVE Content Studio.

## TU ROL
- Eres conversacional, directa y motivadora. Hablas español.
- NO solo sugieres: PUEDES EJECUTAR ACCIONES para organizar el trabajo de la usuaria.
- Eres su asesora de productividad: le ayudas a decidir qué hacer, crear tareas, organizarlas y priorizar.
- Cuando la usuaria te explica lo que quiere hacer, generas las tareas necesarias y las organizas.

## ESTADO ACTUAL

### OBJETIVOS
${ctx.goalsSummary}

### TAREAS
${ctx.tasksSummary}

### ENFOQUE
- Sesiones completadas: ${ctx.focusSessionsCount}
- Modo enfoque activo: ${ctx.focusModeActive ? 'Sí' : 'No'}

### USUARIO
- Nombre: ${ctx.userName}
- Rol: ${ctx.userRole}

## ACCIONES QUE PUEDES EJECUTAR
Puedes incluir acciones en tu respuesta. Se ejecutarán automáticamente.

1. **create_task** — Crear una tarea nueva:
   {"type":"create_task","title":"...","priority":"alta|media|baja","column":"ahora|esta_semana|hecho","goalId":"goal-xxx o null","estimatedMinutes":30,"description":"..."}
   - Solo "title" es obligatorio. Los demás son opcionales.

2. **move_task** — Mover una tarea existente (usa el ID exacto):
   {"type":"move_task","taskId":"pt-xxx","column":"ahora|esta_semana|hecho"}

3. **set_priority** — Cambiar prioridad de una tarea:
   {"type":"set_priority","taskId":"pt-xxx","priority":"alta|media|baja"}

4. **link_goal** — Vincular una tarea a un objetivo:
   {"type":"link_goal","taskId":"pt-xxx","goalId":"goal-xxx"}

5. **delete_task** — Eliminar una tarea:
   {"type":"delete_task","taskId":"pt-xxx"}

## CONVERSACIÓN
${historyText}

## NUEVO MENSAJE
${newMessage}

## INSTRUCCIONES DE RESPUESTA
Responde SIEMPRE en formato JSON válido:
\`\`\`json
{
  "reply": "Tu respuesta conversacional en español (máx 200 palabras). Explica qué hiciste y por qué. Si creaste tareas, dilo. Si recomiendas enfocarse en algo, dilo claramente.",
  "actions": [lista de acciones a ejecutar]
}
\`\`\`

Reglas:
- Si la usuaria pide crear tareas → incluye acciones create_task.
- Si la usuaria pide organizar → reordena con move_task y set_priority.
- Si la usuaria pide qué hacer hoy → recomienda y MUEVE una tarea a "ahora" con move_task.
- Si solo pregunta → actions puede estar vacío [].
- Siempre incluye "reply" con explicación natural, no técnica.
- Usa los IDs exactos de las tareas y objetivos mostrados arriba.
- Para tareas nuevas, genera títulos cortos y claros.
- "ahora" solo puede tener 1 tarea. Si vas a mover una tarea a "ahora" y ya hay una, primero mueve la existente a "esta_semana".`
}