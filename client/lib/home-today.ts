// HOME "Hoy" v2 — HOME = BRÄVE ME GUÍA · CREAR = YO ELIJO (PRODUCT §6.1/§6.2).
// Proyección determinista de estados existentes (ARCHITECTURE §5.5): decide UNA
// acción principal, máximo 2 "después", y una señal de progreso. Sin IA, sin
// campañas (caso reservado), sin I/O — todo input entra como dato.

export type TodayKind =
  | 'marca'
  | 'reto-mision'
  | 'reto-continuar'
  | 'publicar-hoy'
  | 'continuar'
  | 'sugerencia'

export interface TodayInput {
  brandState: string | null
  isPremium: boolean
  retoActive: boolean
  retoDay: number
  retoMissionTitle: string | null
  retoTodayItemStatus: 'idea' | 'grabado' | 'editado' | 'publicado' | null
  scheduledToday: { id: string; title: string | null; type: string | null }[]
  lastPendingItem: { title: string; section: string | null } | null
  mainPriority: string | null
  starService: string | null
  todayISO: string
  weekCreated: number
  weekPublished: number
  weeklyTarget: number | null
}

export interface TodayDecision {
  kind: TodayKind
  timeLabel: string
  title: string
  reason: string
  ctaHref: string
  ctaLabel: string
}

export interface AfterAction {
  label: string
  href: string
}

export interface TodayPlan {
  primary: TodayDecision
  after: AfterAction[]
  /** "Esta acción también cuenta para tu Reto 10K." */
  retoNote: boolean
}

// Espejo de SECTION_LINKS de ContinueCard (fallback /biblioteca, no /inicio).
const SECTION_LINKS: Record<string, string> = {
  planificar: '/planificar',
  'crear-contenido': '/crear-contenido',
  stories: '/stories',
  'mi-marca': '/mi-marca',
  biblioteca: '/biblioteca',
  calendario: '/calendario',
}

const SECTION_LABELS: Record<string, string> = {
  planificar: 'Planificación',
  'crear-contenido': 'Crear Contenido',
  stories: 'Stories',
  'mi-marca': 'Mi Marca',
  biblioteca: 'Biblioteca',
  calendario: 'Calendario',
}

export function localISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

/** 🎯 TU PRIORIDAD — solo con datos reales del Brain; null si no hay. */
export function priorityDisplay(priority: string | null, star: string | null): string | null {
  const s = star ? star.toLowerCase() : null
  switch (priority) {
    case 'citas':
      return s ? `Conseguir más citas de ${s}` : 'Conseguir más citas'
    case 'descubrir':
      return 'Que más gente descubra tu trabajo'
    case 'reconocimiento':
      return 'Que te reconozcan como especialista'
    case 'servicio':
      return s ? `Vender más de ${s}` : 'Vender más de tu servicio estrella'
    case 'valor':
      return s ? `Que ${s} se vea como premium` : 'Que tus servicios valgan lo que valen'
    case 'constancia':
      return 'Publicar con constancia'
    default:
      return null
  }
}

/** Línea corta de Bravi con contexto real; null si no hay contexto (desaparece). */
export function buildBraviLine(priority: string | null, star: string | null, kind: TodayKind): string | null {
  const p = priorityDisplay(priority, star)
  if (!p) return null
  let action = 'trabajar un Reel'
  if (kind === 'reto-mision') action = 'hacer tu misión del Reto'
  else if (kind === 'reto-continuar') action = 'terminar tu reel del día'
  else if (kind === 'publicar-hoy') action = 'publicar lo que tienes para hoy'
  else if (kind === 'continuar') action = 'terminar lo que empezaste'
  else if (kind === 'sugerencia' && priority === 'constancia') action = 'planificar tu semana'
  return `Esta semana quieres ${p.charAt(0).toLowerCase()}${p.slice(1)}. Hoy vamos a ${action}.`
}

export function decideToday(input: TodayInput): TodayPlan {
  const primary = pickPrimary(input)
  return { primary, after: buildAfter(input, primary), retoNote: buildRetoNote(input, primary) }
}

// Precedencia HOME v2 (BUSINESS-BRAIN §11 ajustada): 1 marca, 2 continuar
// lo empezado, 3 acción pendiente de hoy (reto), 4 programado hoy, 5 sugerencia.
function pickPrimary(input: TodayInput): TodayDecision {
  // 1. Marca incompleta — BRÄVE primero conoce al salón (solo no-premium).
  if (!input.isPremium && (input.brandState === null || input.brandState === 'partial')) {
    if (input.brandState === 'partial') {
      return {
        kind: 'marca',
        timeLabel: '2 MIN',
        title: 'Tu estrategia casi está lista',
        reason: 'Ya conozco tu salón. Genera tu estrategia y todo tu contenido será aún más tuyo.',
        ctaHref: '/mi-marca#estrategia-generada',
        ctaLabel: 'Generar mi estrategia',
      }
    }
    return {
      kind: 'marca',
      timeLabel: '2 MIN',
      title: 'Cuéntame sobre tu negocio',
      reason: 'Con esto BRÄVE podrá personalizar tus recomendaciones y contenidos.',
      ctaHref: '/mi-marca',
      ctaLabel: 'Completar mi perfil',
    }
  }

  // 2. Continuar algo empezado.
  if (input.lastPendingItem) {
    const { title, section } = input.lastPendingItem
    return {
      kind: 'continuar',
      timeLabel: '10 MIN',
      title: `Continúa: ${title}`,
      reason: section ? `Lo dejaste en ${SECTION_LABELS[section] || 'Biblioteca'}.` : 'Lo dejaste a medias.',
      ctaHref: section ? SECTION_LINKS[section] || '/biblioteca' : '/biblioteca',
      ctaLabel: 'Continuar',
    }
  }

  // 3. Acción pendiente de hoy — misión del Reto.
  if (!input.isPremium && input.retoActive) {
    if (!input.retoTodayItemStatus || input.retoTodayItemStatus === 'idea') {
      return {
        kind: 'reto-mision',
        timeLabel: '10 MIN',
        title: 'Tu misión de hoy',
        reason: input.retoMissionTitle
          ? `Día ${input.retoDay} de 30 · ${input.retoMissionTitle}`
          : `Día ${input.retoDay} de 30 del Reto 10K`,
        ctaHref: '/reto-10k',
        ctaLabel: 'Hacer la misión',
      }
    }
    if (input.retoTodayItemStatus === 'grabado' || input.retoTodayItemStatus === 'editado') {
      return {
        kind: 'reto-continuar',
        timeLabel: '5 MIN',
        title: `Termina tu reel del día ${input.retoDay}`,
        reason: 'Ya lo tienes grabado — publícalo hoy y suma.',
        ctaHref: '/reto-10k',
        ctaLabel: 'Continuar',
      }
    }
    // 'publicado' → el día del reto ya está completo, seguimos con lo demás.
  }

  // 4. Contenido programado para HOY.
  if (input.scheduledToday.length > 0) {
    const only = input.scheduledToday.length === 1 ? input.scheduledToday[0] : null
    return {
      kind: 'publicar-hoy',
      timeLabel: '5 MIN',
      title: 'Hoy toca publicar',
      reason: only
        ? only.title
          ? `Es el turno de "${only.title}".`
          : 'Tienes 1 contenido programado para hoy.'
        : `Tienes ${input.scheduledToday.length} contenidos programados para hoy.`,
      ctaHref: '/calendario',
      ctaLabel: 'Ir al Calendario',
    }
  }

  // 5. Sugerencia determinista desde la prioridad del Brain.
  return buildSuggestion(input.mainPriority, input.starService)
}

function buildSuggestion(priority: string | null, star: string | null): TodayDecision {
  switch (priority) {
    case 'citas':
    case 'descubrir':
      if (star) {
        return {
          kind: 'sugerencia',
          timeLabel: '10 MIN',
          title: `Crea un reel sobre ${star}`,
          reason: 'Para conseguir clientas nuevas.',
          ctaHref: `/crear-contenido?service=${encodeURIComponent(star)}&type=reel`,
          ctaLabel: 'Empezar',
        }
      }
      return {
        kind: 'sugerencia',
        timeLabel: '10 MIN',
        title: 'Crea un reel para tu salón',
        reason: 'Para conseguir clientas nuevas.',
        ctaHref: '/crear-contenido?type=reel',
        ctaLabel: 'Empezar',
      }
    case 'reconocimiento':
      return {
        kind: 'sugerencia',
        timeLabel: '10 MIN',
        title: 'Enseña tu proceso en un reel',
        reason: 'Que te reconozcan como especialista empieza por mostrar cómo trabajas.',
        ctaHref: '/crear-contenido?type=reel',
        ctaLabel: 'Empezar',
      }
    case 'servicio':
      if (star) {
        return {
          kind: 'sugerencia',
          timeLabel: '10 MIN',
          title: `Promociona ${star}`,
          reason: 'Tu prioridad ahora es vender más de ese servicio.',
          ctaHref: `/crear-contenido?service=${encodeURIComponent(star)}&type=reel`,
          ctaLabel: 'Empezar',
        }
      }
      return {
        kind: 'sugerencia',
        timeLabel: '10 MIN',
        title: 'Crea un reel de tu servicio estrella',
        reason: 'Tu prioridad ahora es vender más de un servicio concreto.',
        ctaHref: '/crear-contenido?type=reel',
        ctaLabel: 'Empezar',
      }
    case 'valor':
      if (star) {
        return {
          kind: 'sugerencia',
          timeLabel: '10 MIN',
          title: `Muestra el valor de ${star}`,
          reason: 'Tu prioridad ahora es que tus servicios valgan lo que valen.',
          ctaHref: `/crear-contenido?service=${encodeURIComponent(star)}&type=reel`,
          ctaLabel: 'Empezar',
        }
      }
      return {
        kind: 'sugerencia',
        timeLabel: '10 MIN',
        title: 'Crea un reel de tu servicio estrella',
        reason: 'Tu prioridad ahora es que tus servicios valgan lo que valen.',
        ctaHref: '/crear-contenido?type=reel',
        ctaLabel: 'Empezar',
      }
    case 'constancia':
      return {
        kind: 'sugerencia',
        timeLabel: '5 MIN',
        title: 'Planifica tu semana',
        reason: 'La constancia empieza con 5 minutos de plan.',
        ctaHref: '/planificar',
        ctaLabel: 'Ir a Planificar',
      }
    default:
      return {
        kind: 'sugerencia',
        timeLabel: '10 MIN',
        title: 'Crea tu próximo reel',
        reason: 'Lo que publicas hoy es lo que ven mañana tus clientas.',
        ctaHref: '/crear-contenido',
        ctaLabel: 'Empezar',
      }
  }
}

function buildAfter(input: TodayInput, primary: TodayDecision): AfterAction[] {
  const out: AfterAction[] = []
  const retoPending = !input.retoTodayItemStatus || input.retoTodayItemStatus === 'idea'
  const retoHalfDone = input.retoTodayItemStatus === 'grabado' || input.retoTodayItemStatus === 'editado'
  if (input.retoActive && primary.kind !== 'reto-mision' && primary.kind !== 'reto-continuar') {
    // Si el primary 'continuar' ya es probablemente ese mismo reel del reto, no duplicar.
    if (!(primary.kind === 'continuar' && retoHalfDone)) {
      if (retoPending) {
        out.push({ label: `Misión del Reto · Día ${input.retoDay}`, href: '/reto-10k' })
      } else if (retoHalfDone) {
        out.push({ label: `Termina tu reel del día ${input.retoDay}`, href: '/reto-10k' })
      }
    }
  }
  if (primary.kind !== 'publicar-hoy' && input.scheduledToday.length > 0) {
    const only = input.scheduledToday.length === 1 ? input.scheduledToday[0] : null
    out.push({
      label: only?.title ? `Publica "${only.title}"` : `Publica ${input.scheduledToday.length} programados`,
      href: '/calendario',
    })
  }
  if (primary.kind !== 'continuar' && input.lastPendingItem) {
    const { title, section } = input.lastPendingItem
    out.push({
      label: `Continúa "${title}"`,
      href: section ? SECTION_LINKS[section] || '/biblioteca' : '/biblioteca',
    })
  }
  return out.slice(0, 2)
}

function buildRetoNote(input: TodayInput, primary: TodayDecision): boolean {
  return input.retoActive && primary.kind !== 'reto-mision' && primary.kind !== 'reto-continuar'
}

// --- Constructores de input (comparten lógica server y demo) ---

interface PendingItemSource {
  title?: string | null
  status?: string | null
  reto_status?: string | null
}

/** Primer item (ordenado updated_at desc por el caller) pendiente de estados. */
export function pickLastPendingItem(
  items: PendingItemSource[],
  lastSection: string | null,
): { title: string; section: string | null } | null {
  for (const item of items) {
    const pending =
      item.reto_status === 'idea' || item.reto_status === 'grabado' || item.reto_status === 'editado'
    if (!pending) continue
    if (item.status === 'done' || item.status === 'scheduled') continue
    return { title: item.title || 'Sin título', section: lastSection }
  }
  return null
}

interface RetoItemSource {
  tag?: string | null
  status?: string | null
  reto_status?: string | null
  content_json?: unknown
}

/** reto_status del item de la misión de HOY (placeholder cuenta como idea). */
export function pickRetoTodayStatus(items: RetoItemSource[], day: number): 'idea' | 'grabado' | 'editado' | 'publicado' | null {
  for (const item of items) {
    if (item.tag !== 'reto-10k') continue
    const json = (item.content_json || {}) as { mission_day?: unknown; is_plan_placeholder?: unknown }
    if (json.mission_day !== day) continue
    if (json.is_plan_placeholder) return 'idea'
    const st = item.reto_status
    if (st === 'grabado' || st === 'editado' || st === 'publicado' || st === 'idea') return st
    return 'idea'
  }
  return null
}