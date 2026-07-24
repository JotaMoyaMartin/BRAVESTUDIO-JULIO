export type Role = 'admin' | 'cm' | 'editor' | 'designer'

export type ContentStatus =
  | 'sin_empezar'
  | 'pendiente_material'
  | 'en_proceso'
  | 'en_edicion'
  | 'en_diseno'
  | 'en_revision'
  | 'cambios_solicitados'
  | 'aprobado'
  | 'finalizado'
  | 'planificado'
  | 'no_aplica'

export type ContentType = 'reel_hablado' | 'reel_visual' | 'reel_resultado' | 'carrusel' | 'post' | 'stories' | 'testimonio' | 'anuncio'

export type ContentObjective =
  | 'educacion' | 'autoridad' | 'inspiracion' | 'venta' | 'deseo'
  | 'dolor' | 'objecion' | 'testimonio' | 'caso_exito' | 'viralidad'

export interface TeamMember {
  id: string
  name: string
  role: Role
  avatar: string  // initials
  color: string   // accent color for avatar
  clients: string[] // client ids
  status: 'disponible' | 'ocupado' | 'ausente'
}

export interface ContentPiece {
  id: string
  clientId: string
  week: number      // 1-4
  month: string     // e.g. "Julio 2026"
  slot: string      // 'reel1' | 'reel2' | 'reel3' | 'carrusel1' | 'diseno' | 'copy' | 'stories'
  type: ContentType
  title: string
  objective: ContentObjective
  theme: string
  hook: string
  script: string
  copy: string
  cta: string
  status: ContentStatus
  editorId: string | null
  designerId: string | null
  cmId: string | null
  rawMaterialUrl: string | null
  finalUrl: string | null
  coverUrl: string | null
  comments: { id: string; authorId: string; text: string; createdAt: string }[]
  dueDate: string
  priority: 'alta' | 'media' | 'baja'
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  salonName: string
  city: string
  instagram: string
  logoColor: string
  cmId: string | null
  editorId: string | null
  designerId: string | null
  serviceStatus: 'activo' | 'pausado' | 'onboarding'
  mainServices: string[]
  promoteService: string
  tone: string
  objectives: string
  postFrequency: string
  postDays: string[]
  observations: string
  materialFolderUrl: string | null
  weeklyLoad: { reels: number; carruseles: number }   // standard per-week output
  // Solo para clientas premium reales con cuenta en Supabase. Permite al
  // Modo Equipo leer brand_profiles / content_items / metricool_metrics del
  // user_id real. Las clientas mock-only no lo tienen.
  supabase_user_id?: string
}

export interface Notification {
  id: string
  type: 'upload' | 'change' | 'review' | 'approval' | 'material' | 'deadline'
  message: string
  clientId: string | null
  createdAt: string
  read: boolean
}

export interface PlanningPublication {
  id: string
  type: 'reel' | 'carrusel'
  title: string
  coverUrl: string | null       // base64 data URL (uploaded) or null — main cover
  coverAlternatives: string[]   // optional alternative cover proposals (for reels)
  carouselImages: string[]      // for carrusel — array of base64 data URLs
  copy: string
  driveLink: string | null      // for reels — Google Drive URL
  day: string | null            // 'Martes' | 'Jueves' | 'Domingo' | null (unscheduled)
  time: string                  // '12:00'
  order: number                 // position in the fit preview
  authorId: string | null       // memberId of the author
  markedReadyById: string | null  // who marked this publication as ready
  markedReadyAt: string | null   // when it was marked ready
  blockedNoMaterial: boolean      // editor flagged: no raw material uploaded, can't advance
  blockedReason: string | null   // optional note why it's blocked
  // ── Scheduling a redes vía Metricool (Fase programación) ──
  mediaUrl?: string | null        // URL pública del archivo (pegada por el equipo)
  networks?: string[]             // redes seleccionadas para programar
  scheduledDate?: string | null   // ISO datetime confirmado por el equipo
}

export interface WeeklyPlanning {
  id: string
  clientId: string
  week: number
  month: string
  status: 'borrador' | 'lista_revision' | 'enviada' | 'aprobada' | 'cambios'
  publications: PlanningPublication[]
  shareToken: string | null
  clientComment: string
  createdAt: string
  updatedAt: string
  weekStartDate?: string | null    // ISO date del primer día de la semana (para derivar fechas de programación)
}

export interface User {
  id: string
  email: string
  password: string
  name: string
  role: Role
  memberId: string
}

// ── Tasks / tickets ──
export type TaskType = 'correction' | 'priority_note' | 'cm_request' | 'other'
export type TaskStatus = 'pendiente' | 'en_proceso' | 'hecha' | 'descartada'
export type TaskPriority = 'alta' | 'media' | 'baja'

export interface Task {
  id: string
  clientId: string
  planningId?: string | null      // derived from a planning
  publicationId?: string | null   // specific publication if any
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string | null       // memberId of the assignee
  requestedByRole: Role | 'client'
  requestedById?: string | null   // memberId if internal, null if client
  attachments: string[]           // base64 data URLs (screenshots, photos)
  referenceLinks: string[]        // external URLs
  createdAt: string
  updatedAt: string
  dueDate?: string | null
}

// ── Tareas y Productividad (módulo independiente) ──
export type ProductivityColumn = 'ahora' | 'hoy' | 'esta_semana' | 'despues' | 'hecho'
export type ProductivityPriority = 'alta' | 'media' | 'baja'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface TaskComment {
  id: string
  authorId: string   // memberId
  text: string
  createdAt: string
}

export interface TaskHistoryEntry {
  id: string
  action: string
  at: string
  by: string   // memberId or 'system'
}

export interface ProductivityTask {
  id: string
  projectId: string
  title: string
  description: string
  column: ProductivityColumn
  priority: ProductivityPriority
  assignedTo: string | null       // memberId
  estimatedMinutes: number | null
  actualMinutes: number
  dueDate: string | null
  subtasks: Subtask[]
  attachments: string[]            // base64 data URLs
  referenceLinks: string[]
  comments: TaskComment[]
  history: TaskHistoryEntry[]
  postponeCount: number
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  nextAction: string | null
  status: 'activo' | 'pausado' | 'completado'
  createdAt: string
  updatedAt: string
}

export interface InboxEntry {
  id: string
  rawText: string
  source: 'texto' | 'audio'
  createdAt: string
  convertedToTaskId: string | null
  suggestedProjectId: string | null
  suggestedPriority: ProductivityPriority | null
  suggestedDueDate: string | null
}

export type FocusSessionStatus = 'completada' | 'pausada' | 'interrumpida'

export interface FocusSession {
  id: string
  taskId: string
  startedAt: string
  endedAt: string | null
  plannedMinutes: number
  actualMinutes: number
  interruptions: number
  status: FocusSessionStatus
}

export interface DailyStats {
  date: string             // YYYY-MM-DD
  completedCount: number
  prioritiesMet: number
  focusMinutes: number
  interruptions: number
  postponedCount: number
}

export interface ProductivitySettings {
  pomodoroPresets: number[]
  defaultPreset: number
  focusRemindersEnabled: boolean
  multiTaskAlertEnabled: boolean
  postponeAlertThreshold: number
}

export interface ProductivityState {
  tasks: ProductivityTask[]
  projects: Project[]
  inbox: InboxEntry[]
  focusSessions: FocusSession[]
  dailyStats: DailyStats[]
  settings: ProductivitySettings
}