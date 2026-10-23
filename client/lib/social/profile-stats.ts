/**
 * ANÁLISIS DE PERFIL · números (22-oct-2026). Lógica pura, sin red ni IA:
 * todo lo que el informe afirma con cifras sale de aquí, calculado sobre las
 * publicaciones reales. La IA (lib/ai/prompts/profile-analysis.ts) solo
 * redacta consejos a partir de este resumen — nunca inventa números.
 */

export type PostFormat = 'reel' | 'carrusel' | 'foto'

/** Pieza tal y como la guarda la sync (social_media) — solo lo que usamos. */
export interface StatsMediaInput {
  media_type: string | null
  media_product_type: string | null
  caption: string | null
  posted_at: string | null
  permalink: string | null
  thumbnail_url?: string | null
  metrics: Record<string, unknown> | null
}

export interface StatsProfileInput {
  username: string | null
  name?: string | null
  biography?: string | null
  followers: number | null
  mediaCount?: number | null
}

export interface FormatStat {
  format: PostFormat
  count: number
  /** % de las publicaciones analizadas (0–100, redondeado). */
  share: number
  /** Media de «me gusta + comentarios» (dato que Instagram da para todo). */
  avgInteractions: number
  /** Media de cuentas alcanzadas; null si Instagram no lo da para ese formato. */
  avgReach: number | null
}

export interface SlotStat {
  label: string
  posts: number
  avgInteractions: number
}

export interface PostSummary {
  format: PostFormat
  postedAt: string
  permalink: string | null
  thumbnailUrl: string | null
  caption: string
  interactions: number
  reach: number | null
}

export interface ProfileStats {
  postsAnalyzed: number
  /** Días entre la primera y la última publicación analizada. */
  periodDays: number
  postsPerWeek: number
  postsLast30Days: number
  daysSinceLastPost: number | null
  avgInteractions: number
  /** (me gusta + comentarios) / seguidores, en %. null sin seguidores. */
  engagementRate: number | null
  formats: FormatStat[]
  bestFormat: PostFormat | null
  /** null = no hay datos suficientes para afirmarlo (ver `notes`). */
  bestDays: SlotStat[] | null
  bestTimes: SlotStat[] | null
  topPosts: PostSummary[]
  weakPosts: PostSummary[]
  captionAvgLength: number
  captionsWithQuestionPct: number
  /** Avisos honestos de lo que falta o no se puede afirmar. */
  notes: string[]
}

export const FORMAT_LABEL: Record<PostFormat, string> = {
  reel: 'Reels',
  carrusel: 'Carruseles',
  foto: 'Fotos',
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const TIME_SLOTS: Array<{ label: string; from: number; to: number }> = [
  { label: 'Mañana (7–12 h)', from: 7, to: 12 },
  { label: 'Mediodía (12–15 h)', from: 12, to: 15 },
  { label: 'Tarde (15–19 h)', from: 15, to: 19 },
  { label: 'Noche (19–24 h)', from: 19, to: 24 },
  { label: 'Madrugada (0–7 h)', from: 0, to: 7 },
]

/** Mínimos para afirmar «mejor día/hora» sin engañar. */
const MIN_POSTS_FOR_TIMING = 8
const MIN_POSTS_PER_SLOT = 3

const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const round1 = (v: number) => Math.round(v * 10) / 10

export function postFormat(m: Pick<StatsMediaInput, 'media_type' | 'media_product_type'>): PostFormat | null {
  if (m.media_product_type === 'STORY') return null
  if (m.media_product_type === 'REELS' || m.media_type === 'VIDEO') return 'reel'
  if (m.media_type === 'CAROUSEL_ALBUM' || m.media_product_type === 'CAROUSEL_ALBUM') return 'carrusel'
  return 'foto'
}

function interactionsOf(metrics: Record<string, unknown> | null): number {
  const likes = n(metrics?.likes) ?? 0
  const comments = n(metrics?.comments) ?? 0
  return likes + comments
}

/** Hora y día de la semana en la zona horaria de la estilista. */
function localParts(iso: string, timeZone: string): { weekday: number; hour: number } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(d)
    const wd = parts.find(p => p.type === 'weekday')?.value ?? ''
    const hour = Number(parts.find(p => p.type === 'hour')?.value ?? NaN)
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd)
    if (weekday < 0 || Number.isNaN(hour)) return null
    return { weekday, hour }
  } catch {
    return { weekday: d.getUTCDay(), hour: d.getUTCHours() }
  }
}

function rankSlots(buckets: Map<string, number[]>): SlotStat[] | null {
  const slots = [...buckets.entries()]
    .filter(([, v]) => v.length >= MIN_POSTS_PER_SLOT)
    .map(([label, v]) => ({ label, posts: v.length, avgInteractions: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }))
    .sort((a, b) => b.avgInteractions - a.avgInteractions)
  return slots.length >= 2 ? slots.slice(0, 3) : null
}

/**
 * Calcula el resumen del perfil con las últimas `limit` publicaciones del
 * feed (sin stories). `now` y `timeZone` se inyectan para poder testear.
 */
export function computeProfileStats(
  profile: StatsProfileInput,
  media: StatsMediaInput[],
  opts: { limit?: number; now?: Date; timeZone?: string } = {},
): ProfileStats {
  const limit = opts.limit ?? 30
  const now = opts.now ?? new Date()
  const timeZone = opts.timeZone ?? 'Europe/Madrid'
  const notes: string[] = []

  const posts = media
    .map(m => ({ m, format: postFormat(m) }))
    .filter((x): x is { m: StatsMediaInput; format: PostFormat } => !!x.format && !!x.m.posted_at)
    .sort((a, b) => (b.m.posted_at as string).localeCompare(a.m.posted_at as string))
    .slice(0, limit)
    .map(({ m, format }) => ({
      format,
      postedAt: m.posted_at as string,
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url ?? null,
      caption: (m.caption || '').trim(),
      interactions: interactionsOf(m.metrics),
      reach: n(m.metrics?.reach),
    }))

  const total = posts.length
  if (total === 0) {
    notes.push('Todavía no hay publicaciones del feed para analizar.')
  } else if (total < 12) {
    notes.push(`Solo hay ${total} publicaciones: las conclusiones son orientativas.`)
  }

  const times = posts.map(p => new Date(p.postedAt).getTime()).filter(t => !Number.isNaN(t))
  const newest = times.length ? Math.max(...times) : null
  const oldest = times.length ? Math.min(...times) : null
  const periodDays = newest && oldest ? Math.max(1, Math.round((newest - oldest) / 86_400_000)) : 0
  const postsPerWeek = total > 1 && periodDays > 0 ? round1((total / periodDays) * 7) : total
  const postsLast30Days = times.filter(t => now.getTime() - t <= 30 * 86_400_000).length
  // Días de calendario en su zona horaria (ayer a las 23 h = 1 día, no 0).
  const dayKey = (t: number) => {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)) } catch { return new Date(t).toISOString().slice(0, 10) }
  }
  const daysSinceLastPost = newest
    ? Math.max(0, Math.round((Date.parse(dayKey(now.getTime())) - Date.parse(dayKey(newest))) / 86_400_000))
    : null

  const avgInteractions = total ? Math.round(posts.reduce((a, p) => a + p.interactions, 0) / total) : 0
  const followers = profile.followers && profile.followers > 0 ? profile.followers : null
  const engagementRate = followers && total ? round1((avgInteractions / followers) * 100) : null
  if (!followers) notes.push('No sabemos tu número de seguidores: no calculamos el % de interacción.')

  // ── Formatos ───────────────────────────────────────────────────────
  const formats: FormatStat[] = (['reel', 'carrusel', 'foto'] as PostFormat[])
    .map(format => {
      const list = posts.filter(p => p.format === format)
      const withReach = list.filter(p => p.reach !== null)
      return {
        format,
        count: list.length,
        share: total ? Math.round((list.length / total) * 100) : 0,
        avgInteractions: list.length ? Math.round(list.reduce((a, p) => a + p.interactions, 0) / list.length) : 0,
        avgReach: withReach.length ? Math.round(withReach.reduce((a, p) => a + (p.reach as number), 0) / withReach.length) : null,
      }
    })
    .filter(f => f.count > 0)
  const comparable = formats.filter(f => f.count >= 2)
  const bestFormat = comparable.length >= 2
    ? [...comparable].sort((a, b) => b.avgInteractions - a.avgInteractions)[0].format
    : null
  if (formats.some(f => f.format === 'carrusel' && f.avgReach === null)) {
    notes.push('Instagram no nos ha dado el alcance de tus carruseles: en ellos comparamos solo me gusta y comentarios.')
  }

  // ── Días y horas ───────────────────────────────────────────────────
  let bestDays: SlotStat[] | null = null
  let bestTimes: SlotStat[] | null = null
  if (total >= MIN_POSTS_FOR_TIMING) {
    const byDay = new Map<string, number[]>()
    const byTime = new Map<string, number[]>()
    for (const p of posts) {
      const parts = localParts(p.postedAt, timeZone)
      if (!parts) continue
      const day = WEEKDAYS[parts.weekday]
      byDay.set(day, [...(byDay.get(day) || []), p.interactions])
      const slot = TIME_SLOTS.find(s => parts.hour >= s.from && parts.hour < s.to)
      if (slot) byTime.set(slot.label, [...(byTime.get(slot.label) || []), p.interactions])
    }
    bestDays = rankSlots(byDay)
    bestTimes = rankSlots(byTime)
    // Casi todo a la misma hora: no hay con qué comparar, pero es útil decirlo.
    const [topSlot, topCount] = [...byTime.entries()].map(([k, v]) => [k, v.length] as const).sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
    if (!bestTimes && topCount >= total * 0.8) {
      notes.push(`Casi todo lo publicas a la misma franja (${topSlot.toLowerCase()}): prueba otras horas para saber cuál te funciona mejor.`)
    }
  }
  // Mismo texto repetido (p. ej. reels de prueba): cuentan, pero conviene saberlo.
  const byCaption = new Map<string, number>()
  for (const p of posts) if (p.caption.length > 20) byCaption.set(p.caption, (byCaption.get(p.caption) || 0) + 1)
  const repeated = [...byCaption.values()].filter(c => c >= 2).reduce((a, c) => a + c, 0)
  if (repeated >= 3) {
    notes.push(`${repeated} publicaciones repiten el mismo texto (¿reels de prueba?). Cuentan en los números, por eso la frecuencia puede salir más alta.`)
  }

  if (!bestDays && !bestTimes) {
    notes.push('Aún no hay publicaciones suficientes en días y horas distintos para decir cuál es tu mejor momento.')
  }

  // ── Mejores y peores ───────────────────────────────────────────────
  const ranked = [...posts].sort((a, b) => b.interactions - a.interactions)
  const topPosts = ranked.slice(0, 3)
  const weakPosts = total >= 6 ? ranked.slice(-3).reverse() : []

  const withCaption = posts.filter(p => p.caption.length > 0)
  const captionAvgLength = withCaption.length
    ? Math.round(withCaption.reduce((a, p) => a + p.caption.length, 0) / withCaption.length)
    : 0
  const captionsWithQuestionPct = withCaption.length
    ? Math.round((withCaption.filter(p => p.caption.includes('?')).length / withCaption.length) * 100)
    : 0

  return {
    postsAnalyzed: total,
    periodDays,
    postsPerWeek,
    postsLast30Days,
    daysSinceLastPost,
    avgInteractions,
    engagementRate,
    formats,
    bestFormat,
    bestDays,
    bestTimes,
    topPosts,
    weakPosts,
    captionAvgLength,
    captionsWithQuestionPct,
    notes,
  }
}
