// Tipos del Reto 10K

export interface RetoPhase {
  order: number
  emoji: string
  title: string
  objective: string
  content: string[]
}

export interface RetoMission {
  day: number
  phase: number
  title: string
  description: string
  prompt_hint: string
}

export interface RetoBraviMessages {
  start: string[]
  day: string[]
  week: string[]
  phase: string[]
  complete: string[]
  streak: string[]
}

export interface Reto10kConfig {
  phases: RetoPhase[]
  missions: RetoMission[]
  braviMessages: RetoBraviMessages
}

export type RetoStatus = 'not_started' | 'active' | 'paused' | 'completed'

export interface Reto10kProgress {
  user_id: string
  joined_at: string
  started_at: string | null
  objective: string | null
  services: string[]
  level: string | null
  current_day: number
  current_phase: number
  status: RetoStatus
  posts_per_week: number
  completed_at: string | null
  last_generated_week: number
  created_at: string
  updated_at: string
}

export interface RetoInput {
  objective: string
  services: string[]
  level: string
  currentPhase: number
  phaseTitle: string
  currentDay: number
  postsPerWeek: number
  missionTitle?: string
  missionDescription?: string
  missionPromptHint?: string
  brandContext?: string
}

export type RetoCategory = 'autoridad' | 'resultados' | 'conexion'

export interface RetoItem {
  type: 'reel'
  title: string
  service: string
  objective: string
  category: RetoCategory
  hookIdea: string
  format: string
  script?: { hook: string; context: string; solution: string; cta: string }
  caption: string
  visual_idea: string
  day: number
}

export interface RetoOutput {
  items: RetoItem[]
  summary: string
}