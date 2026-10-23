/**
 * MI MARCA · «Tu camino BRÄVE» (22-oct-2026): hoja de ruta en 5 etapas.
 * Cada paso se completa solo (con datos reales de la app) o lo marca la
 * estilista con un toque. Solo se abre la etapa en curso: nada abruma.
 */

export type AutoSignal = 'marca' | 'instagram' | 'plan' | 'reel' | 'story' | 'carrusel' | 'publicadas'

export interface CaminoStep {
  id: string
  label: string
  hint: string
  href: string
  /** Si viene, el paso se completa solo con datos reales. */
  auto?: AutoSignal
}

export interface CaminoStage {
  id: string
  name: string
  goal: string
  steps: CaminoStep[]
}

export const PUBLICADAS_META = 6

export const CAMINO: CaminoStage[] = [
  {
    id: 'base', name: 'Tu base', goal: 'Que tu perfil enamore a la primera',
    steps: [
      { id: 'marca', label: 'Completa tu marca', hint: '5 minutos, casi todo con un toque', href: '/mi-marca', auto: 'marca' },
      { id: 'bio', label: 'Optimiza tu perfil de Instagram', hint: 'Nombre, bio, links y destacadas', href: '/mi-marca/perfil' },
    ],
  },
  {
    id: 'mes', name: 'Tu primer mes', goal: 'Saber qué publicar cada día',
    steps: [
      { id: 'plan', label: 'Planifica tu mes', hint: 'Un toque en Mi plan', href: '/planificar', auto: 'plan' },
      { id: 'reel', label: 'Crea tu primer reel', hint: 'Con Crear guiones', href: '/crear-contenido', auto: 'reel' },
      { id: 'story', label: 'Tu primera secuencia de stories', hint: 'Una lista para usar', href: '/stories', auto: 'story' },
    ],
  },
  {
    id: 'constancia', name: 'Constancia', goal: 'Que Instagram te vea cada semana',
    steps: [
      { id: 'publicadas', label: `Publica ${PUBLICADAS_META} veces`, hint: 'Márcalas como publicadas en Mi plan', href: '/calendario', auto: 'publicadas' },
      { id: 'carrusel', label: 'Un carrusel que enseñe', hint: 'Los que más se guardan', href: '/carrusel', auto: 'carrusel' },
    ],
  },
  {
    id: 'atraer', name: 'Atraer', goal: 'Que te descubran clientas nuevas',
    steps: [
      { id: 'transformacion', label: 'Un reel de transformación', hint: 'Antes y después de tu servicio estrella', href: '/inspiracion-reels' },
      { id: 'preguntas', label: 'Abre una caja de preguntas', hint: 'Y responde en stories', href: '/stories' },
      { id: 'opinion', label: 'Comparte la opinión de una clienta', hint: 'Plantilla «Opinión de clienta»', href: '/stories' },
    ],
  },
  {
    id: 'vender', name: 'Vender', goal: 'Convertir seguidoras en citas',
    steps: [
      { id: 'oferta', label: 'Lanza una oferta de tu servicio estrella', hint: 'Con fecha límite', href: '/crear-contenido' },
      { id: 'reserva', label: 'Pide la cita en 3 publicaciones', hint: '«Escríbeme» o «link en la bio»', href: '/calendario' },
      { id: 'analisis', label: 'Revisa qué te ha funcionado', hint: 'En Mi plan: mira qué publicaste y repite lo que más gustó', href: '/calendario' },
    ],
  },
]

export interface CaminoSignals {
  marca: boolean
  instagram: boolean
  planCount: number
  reel: boolean
  story: boolean
  carrusel: boolean
  publicadas: number
}

export function stepDone(step: CaminoStep, sig: CaminoSignals, manual: Record<string, boolean>): boolean {
  if (manual[step.id]) return true
  switch (step.auto) {
    case 'marca': return sig.marca
    case 'instagram': return sig.instagram
    case 'plan': return sig.planCount >= 4
    case 'reel': return sig.reel
    case 'story': return sig.story
    case 'carrusel': return sig.carrusel
    case 'publicadas': return sig.publicadas >= PUBLICADAS_META
    default: return false
  }
}

/** Progreso por etapa y la etapa en curso (la primera sin terminar). */
export function caminoProgress(sig: CaminoSignals, manual: Record<string, boolean>) {
  const stages = CAMINO.map(st => {
    const done = st.steps.filter(s => stepDone(s, sig, manual)).length
    return { ...st, done, total: st.steps.length, complete: done === st.steps.length }
  })
  const current = stages.findIndex(s => !s.complete)
  return { stages, current: current === -1 ? stages.length : current, totalDone: stages.reduce((n, s) => n + s.done, 0), total: stages.reduce((n, s) => n + s.total, 0) }
}
