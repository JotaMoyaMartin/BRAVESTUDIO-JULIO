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

// ─────────────────────────────────────────────
// Summarize functions
// ─────────────────────────────────────────────
export function summarizeGoalsForPrompt(goals: Goal[], tasks: ProductivityTask[]): string {
  if (goals.length === 0) return 'Sin objetivos definidos.'
  const monthly = goals.filter(g => g.period === 'monthly')
  const weekly = goals.filter(g => g.period === 'weekly')
  const lines: string[] = []
  if (monthly.length > 0) {
    lines.push('OBJETIVOS MENSUALES:')
    monthly.forEach(g => {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0
      lines.push(`  - ${g.title}: ${g.current}/${g.target} (${pct}%) — ${g.periodLabel}`)
    })
  }
  if (weekly.length > 0) {
    lines.push('OBJETIVOS SEMANALES:')
    weekly.forEach(g => {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0
      lines.push(`  - ${g.title}: ${g.current}/${g.target} (${pct}%) — ${g.periodLabel}`)
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
    byCol.ahora.forEach(t => lines.push(`  - ${t.title} (${t.priority}, ${t.estimatedMinutes ?? '?'}min)`))
  }
  if (byCol.esta_semana.length > 0) {
    lines.push('ESTA SEMANA:')
    byCol.esta_semana.forEach(t => lines.push(`  - ${t.title} (${t.priority}, ${t.estimatedMinutes ?? '?'}min)`))
  }
  lines.push(`HECHO: ${byCol.hecho.length} tareas completadas`)
  return lines.join('\n')
}

// ─────────────────────────────────────────────
// Build prompt
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

  return `Eres BRAVI, asistente de productividad del equipo BRÄVE Content Studio.

## TU ROL
- Eres un asistente conversacional en español. Máximo 200 palabras.
- Sugieres, NO ejecutas. No creas ni borras tareas directamente.
- Eres directa, práctica y motivadora pero honesta.
- Conoces los objetivos mensuales/semanales y las tareas del tablero.

## ESTADO ACTUAL

### OBJETIVOS
${ctx.goalsSummary}

### TAREAS
${ctx.tasksSummary}

### ENFOQUE
- Sesiones de foco completadas: ${ctx.focusSessionsCount}
- Modo enfoque activo: ${ctx.focusModeActive ? 'Sí' : 'No'}

### USUARIO
- Nombre: ${ctx.userName}
- Rol: ${ctx.userRole}

## CONVERSACIÓN
${historyText}

## NUEVO MENSAJE
${newMessage}

## RESPUESTA
Responde en español, sé conversacional y concisa. Si el usuario pregunta por objetivos, usa los datos de arriba. Si pide organizar el día, prioriza la tarea en "Ahora" y sugiere orden. Si detectas sobrecarga o bloqueo, dilo.`
}