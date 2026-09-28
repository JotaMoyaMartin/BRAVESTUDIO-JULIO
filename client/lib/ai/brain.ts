/**
 * SEAM del Business Brain — FASE 0 (solo arquitectura, NO implementación).
 *
 * Este módulo define el CONTRATO por el que todos los consumidores
 * (estrategia, campañas, contenido, stories, carruseles, calendario,
 * recomendaciones) recibirán contexto del Business Brain en la siguiente
 * fase. Hoy NO compone métricas ni historial: `composeBrainContext` es una
 * función pura que los futuros generadores usarán como punto de entrada.
 *
 * Estado actual (lo que ya existe y sigue funcionando sin cambios):
 *   - Contexto de marca estático → lib/ai/brand-context.ts (buildBrandFullContext)
 *   - Contexto en Modo Equipo    → lib/team/api-helpers.ts (buildBrandContextForUser)
 *
 * En la fase Business Brain, el accessor server-side compondrá por `purpose`:
 *   brand (estático) + metrics (dinámico) + objectives + history/learning
 * y `composeBrainContext` pasará a ser la única vía de inyección.
 * Ver docs/ARCHITECTURE.md §5.1.
 */

export type BrainPurpose =
  | 'strategy'        // documento estratégico / auditoría
  | 'campaign'        // motor de campañas
  | 'content'         // guiones reel / ideas
  | 'stories'         // stories escritas y habladas
  | 'carousel'        // carruseles con plantilla
  | 'calendar'        // planificación / organización
  | 'recommendation'  // HOME "hoy" / recomendaciones

export interface BrainParts {
  /** Contexto de marca estático (buildBrandFullContext o equivalente server). */
  brand?: string | null
  /** Resumen de métricas recientes (patrón assistant-prompt.summarizeMetrics). */
  metrics?: string | null
  /** Objetivos activos (reto, campañas). */
  objectives?: string | null
  /** Historial/aprendizaje: qué se publicó y cómo fue. */
  history?: string | null
}

export interface BrainSectionPlan {
  brand: boolean
  metrics: boolean
  objectives: boolean
  history: boolean
}

/**
 * Qué secciones del Brain conviene inyectar según el propósito.
 * Contexto proporcional = coste controlado y prompts enfocados.
 */
export const BRAIN_SECTIONS_BY_PURPOSE: Record<BrainPurpose, BrainSectionPlan> = {
  strategy:       { brand: true,  metrics: true,  objectives: true,  history: false },
  campaign:       { brand: true,  metrics: true,  objectives: true,  history: true  },
  content:        { brand: true,  metrics: true,  objectives: true,  history: true  },
  stories:        { brand: true,  metrics: true,  objectives: true,  history: true  },
  carousel:       { brand: true,  metrics: false, objectives: true,  history: false },
  calendar:       { brand: true,  metrics: false, objectives: true,  history: false },
  recommendation: { brand: true,  metrics: true,  objectives: true,  history: true  },
}

const SECTION_HEADERS = {
  brand: 'MARCA DEL SALÓN',
  metrics: 'MÉTRICAS RECIENTES',
  objectives: 'OBJETIVOS ACTIVOS',
  history: 'HISTORIAL DE CONTENIDO',
} as const

/**
 * Compone el bloque de contexto final a inyectar en un prompt.
 * Devuelve null si no hay ninguna sección disponible (el caller debe
 * decidir su fallback: hoy, pedir al usuario o usar mock).
 */
export function composeBrainContext(purpose: BrainPurpose, parts: BrainParts): string | null {
  const plan = BRAIN_SECTIONS_BY_PURPOSE[purpose]
  const sections: string[] = []
  if (plan.brand && parts.brand) sections.push(`== ${SECTION_HEADERS.brand} ==\n${parts.brand.trim()}`)
  if (plan.metrics && parts.metrics) sections.push(`== ${SECTION_HEADERS.metrics} ==\n${parts.metrics.trim()}`)
  if (plan.objectives && parts.objectives) sections.push(`== ${SECTION_HEADERS.objectives} ==\n${parts.objectives.trim()}`)
  if (plan.history && parts.history) sections.push(`== ${SECTION_HEADERS.history} ==\n${parts.history.trim()}`)
  if (sections.length === 0) return null
  return sections.join('\n\n')
}