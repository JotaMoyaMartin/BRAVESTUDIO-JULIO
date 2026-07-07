// ── Tipos para la Hoja de Ruta BRÄVE ────────────────────────────────

export type RoadmapStatus = 'completed' | 'in_progress' | 'pending'

export type RoadmapColor =
  | 'cherry'
  | 'cherry-dark'
  | 'buttermilk'
  | 'pastel-blue'
  | 'pastel-green'
  | 'warm-gray'

export interface RoadmapTask {
  /** id estable dentro de la fase (ej. "t1") — se usa para persistir el check */
  id: string
  label: string
  done: boolean
}

export interface RoadmapPhase {
  /** Número de fase (1-indexed) */
  number: number
  name: string
  description: string
  goal: string
  icon: string // emoji
  color: RoadmapColor
  status: RoadmapStatus
  tasks: RoadmapTask[]
  /** Mensaje de Bravi para esta fase (opcional) */
  bravi_message?: string
}

export interface Roadmap {
  phases: RoadmapPhase[]
  generated_at: string
}

export const EMPTY_ROADMAP: Roadmap = { phases: [], generated_at: '' }

// ── Mapa de colores → tokens CSS ────────────────────────────────────

export const COLOR_MAP: Record<RoadmapColor, { bg: string; bgSoft: string; text: string; border: string; ring: string }> = {
  cherry: {
    bg: 'var(--color-cherry)',
    bgSoft: 'rgba(122,24,50,0.08)',
    text: 'var(--color-cherry)',
    border: 'rgba(122,24,50,0.25)',
    ring: 'var(--color-cherry)',
  },
  'cherry-dark': {
    bg: 'var(--color-cherry-dark)',
    bgSoft: 'rgba(89,20,39,0.08)',
    text: 'var(--color-cherry-dark)',
    border: 'rgba(89,20,39,0.25)',
    ring: 'var(--color-cherry-dark)',
  },
  buttermilk: {
    bg: 'var(--color-buttermilk)',
    bgSoft: 'rgba(255,241,181,0.25)',
    text: '#7a6000',
    border: 'rgba(255,241,181,0.6)',
    ring: '#b89000',
  },
  'pastel-blue': {
    bg: 'var(--color-pastel-blue)',
    bgSoft: 'rgba(193,219,232,0.3)',
    text: '#2a5a6a',
    border: 'rgba(193,219,232,0.7)',
    ring: '#2a5a6a',
  },
  'pastel-green': {
    bg: 'var(--color-pastel-green)',
    bgSoft: 'rgba(184,216,176,0.3)',
    text: '#2a6a3a',
    border: 'rgba(184,216,176,0.7)',
    ring: '#2a6a3a',
  },
  'warm-gray': {
    bg: 'var(--color-warm-gray)',
    bgSoft: 'rgba(245,240,232,0.6)',
    text: 'var(--color-cherry-dark)',
    border: 'rgba(122,24,50,0.15)',
    ring: 'var(--color-cherry-dark)',
  },
}