/**
 * Prompt del asistente IA de productividad del Modo Equipo.
 *
 * El asistente vive dentro del modulo "Tareas y Productividad".
 * Conoce el estado del tablero (tareas por columna), los proyectos activos,
 * la bandeja de entrada, las estadisticas semanales y si hay sesion de enfoque
 * activa. Es conversacional (sugiere, propone, asesora) pero NO ejecuta
 * acciones -- el usuario confirma y ejecuta manualmente.
 */

import type { ProductivityTask, Project, DailyStats, ProductivityColumn } from '../types'

export interface ProductividadContext {
  userName: string
  userRole: string
  tasksSummary: string
  projectsSummary: string
  inboxCount: number
  weeklyStats: string
  focusModeActive: boolean
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

const COLUMN_LABELS: Record<ProductivityColumn, string> = {
  ahora: 'Ahora',
  hoy: 'Hoy',
  esta_semana: 'Esta semana',
  despues: 'Despues',
  hecho: 'Hecho',
}

const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

/** Resume las tareas agrupadas por columna, con proyecto + prioridad + asignado. */
export function summarizeTasksForPrompt(tasks: ProductivityTask[], projects: Project[]): string {
  if (!tasks || tasks.length === 0) return 'Sin tareas en el tablero.'

  const projectMap = new Map(projects.map(p => [p.id, p.name]))
  const columns: ProductivityColumn[] = ['ahora', 'hoy', 'esta_semana', 'despues', 'hecho']
  const buckets: Record<string, string[]> = {}

  for (const col of columns) {
    buckets[col] = []
  }

  for (const t of tasks) {
    const projectName = projectMap.get(t.projectId) || 'Sin proyecto'
    const assignee = t.assignedTo ? ` - ${t.assignedTo}` : ''
    const est = t.estimatedMinutes ? ` - ${t.estimatedMinutes}min` : ''
    const line = `- ${t.title} (${projectName} - ${PRIORITY_LABELS[t.priority] || t.priority}${assignee}${est})`
    buckets[t.column]?.push(line)
  }

  const lines: string[] = []
  for (const col of columns) {
    const items = buckets[col]
    if (items && items.length > 0) {
      lines.push(`[${COLUMN_LABELS[col]}] (${items.length})`)
      lines.push(...items)
    }
  }
  return lines.join('\n')
}

/** Resume los proyectos: estado, tareas abiertas/completadas, nextAction. */
export function summarizeProjectsForPrompt(projects: Project[], tasks: ProductivityTask[]): string {
  if (!projects || projects.length === 0) return 'Sin proyectos.'

  const lines: string[] = []
  for (const p of projects) {
    const projectTasks = tasks.filter(t => t.projectId === p.id)
    const open = projectTasks.filter(t => t.column !== 'hecho').length
    const done = projectTasks.filter(t => t.column === 'hecho').length
    const nextAction = p.nextAction || '--'
    lines.push(`- ${p.name} [${p.status}] - ${open} abiertas / ${done} hechas - Proxima accion: ${nextAction}`)
  }
  return lines.join('\n')
}

/** Resume las estadisticas de los ultimos 7 dias. */
export function summarizeWeeklyStats(stats: DailyStats[]): string {
  if (!stats || stats.length === 0) return 'Sin estadisticas todavia.'

  const sorted = [...stats].sort((a, b) => a.date.localeCompare(b.date))
  const last7 = sorted.slice(-7)
  const lines: string[] = []
  for (const d of last7) {
    lines.push(
      `- ${d.date}: ${d.completedCount} completadas - ${d.focusMinutes}min foco - ${d.interruptions} interrupciones - ${d.postponedCount} aplazadas`,
    )
  }
  const totalCompleted = last7.reduce((s, d) => s + d.completedCount, 0)
  const totalFocus = last7.reduce((s, d) => s + d.focusMinutes, 0)
  const totalInterruptions = last7.reduce((s, d) => s + d.interruptions, 0)
  lines.push(`Total semanal: ${totalCompleted} completadas - ${totalFocus}min foco - ${totalInterruptions} interrupciones`)
  return lines.join('\n')
}

/** Construye el prompt completo para la IA. */
export function buildProductividadPrompt(
  ctx: ProductividadContext,
  history: ChatTurn[],
  newMessage: string,
): string {
  const historyBlock =
    history.length > 0
      ? history.slice(-12).map(t => `[${t.role}]: ${t.content}`).join('\n') + '\n\n'
      : ''

  const focusLine = ctx.focusModeActive
    ? 'El usuario tiene una sesion de enfoque ACTIVA en este momento.'
    : 'No hay sesion de enfoque activa.'

  return `Eres el asistente de productividad de BRAVE Content Studio. Ayudas al equipo (${ctx.userName}, ${ctx.userRole}) a organizar el dia, priorizar tareas y mantener el enfoque.

Estas hablando con: ${ctx.userName} (${ctx.userRole}).

═══════════════════════════════════════════
ESTADO DEL TABLERO:
═══════════════════════════════════════════
${ctx.tasksSummary}

═══════════════════════════════════════════
PROYECTOS:
═══════════════════════════════════════════
${ctx.projectsSummary}

═══════════════════════════════════════════
BANDEJA DE ENTRADA:
═══════════════════════════════════════════
${ctx.inboxCount} ideas sin convertir en tareas.

═══════════════════════════════════════════
ESTADISTICAS SEMANALES (ultimos 7 dias):
═══════════════════════════════════════════
${ctx.weeklyStats}

═══════════════════════════════════════════
ESTADO DE ENFOQUE:
═══════════════════════════════════════════
${focusLine}

═══════════════════════════════════════════
TU ROL:
═══════════════════════════════════════════
- Eres conversacional y cercano (no corporativa). Responde en espanol, tono profesional pero amable.
- Respuestas concisas (max 200 palabras salvo que pidan detalle). Usa bullets y secciones cortas.
- Puedes: organizar el dia segun prioridades y tiempo estimado, asignar tareas al equipo, dividir tareas grandes en subtareas, resumir progreso diario/semanal, convertir ideas de la bandeja en tareas concretas, detectar bloqueos o sobrecarga, sugerir sesiones de enfoque y recordatorios.
- NO ejecutas acciones -- solo sugieres. El usuario confirma y ejecuta manualmente en la interfaz.
- Si detectas sobrecarga (muchas tareas alta prioridad, muchas interrupciones, mucho aplazamiento), senalalo y sugiere priorizar.
- Si hay sesion de enfoque activa, se breve y no distraigas.

═══════════════════════════════════════════
CONVERSACION:
═══════════════════════════════════════════
${historyBlock}[user]: ${newMessage}

[assistant]:`
}