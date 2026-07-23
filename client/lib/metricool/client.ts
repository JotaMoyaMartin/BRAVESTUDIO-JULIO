/**
 * Cliente de la API de Metricool.
 *
 * Docs:
 *   - https://static.metricool.com/API+DOC/API+English.pdf
 *   - https://github.com/kukis2107/n8n-nodes-metricool-or/blob/main/swagger.yaml
 *
 * Base URL: https://app.metricool.com/api
 * Auth: header `X-Mc-Auth: <userToken>` + query params `userId` y `blogId`.
 *
 * Dos familias de endpoints según la red:
 *
 *  LEGACY (Instagram, Facebook, Twitter, YouTube, LinkedIn):
 *    GET /stats/timeline/{metric}?start=YYYYMMDD&end=YYYYMMDD
 *      → array de [date, value]
 *    GET /stats/aggregation/{metric}?start=...&end=...
 *      → number
 *
 *  V2 ANALYTICS (TikTok — no soportado por legacy):
 *    GET /v2/analytics/timelines?network=tiktok&metric={m}&from=ISO&to=ISO[&subject=account]
 *      → {data:[{metric, values:[{dateTime, value}]}]}
 *    GET /v2/analytics/aggregation?network=tiktok&metric={m}&from=ISO&to=ISO[&subject=video|account]
 *      → {data: number}
 *
 * Para una métrica tipo "followers" tomamos el último valor del mes.
 * Para "reach", "impressions", "posts_count" sumamos los valores del mes.
 * Para "engagement_rate" usamos aggregation (legacy) o cálculo manual (TikTok).
 */

const BASE_URL = process.env.METRICOOL_API_URL || 'https://app.metricool.com/api'

export interface MetricoolCreds {
  userToken: string
  userId: string    // userId numérico de Metricool (string en query)
  blogId: string
}

export interface MetricoolStats {
  month: string        // YYYY-MM-01
  network: string      // 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'youtube'
  followers: number
  reach: number
  impressions: number
  engagement_rate: number
  posts_count: number
  raw: Record<string, unknown>
}

interface FetchTimelineArgs extends MetricoolCreds {
  metric: string
  start: string        // YYYYMMDD (legacy) o ISO 8601 (v2)
  end: string
}

type TimelineEntry = [string, string]

// ═══════════════════════════════════════════════
// LEGACY API (Instagram, Facebook, etc.)
// ═══════════════════════════════════════════════

async function fetchTimeline({ userToken, userId, blogId, metric, start, end }: FetchTimelineArgs): Promise<TimelineEntry[] | null> {
  const url = `${BASE_URL}/stats/timeline/${metric}?start=${start}&end=${end}&userId=${encodeURIComponent(userId)}&blogId=${encodeURIComponent(blogId)}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-Mc-Auth': userToken, Accept: 'application/json' },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      console.warn(`[metricool] timeline ${metric} → ${res.status}`)
      return null
    }
    const data = await res.json()
    if (!Array.isArray(data)) return null
    return data as TimelineEntry[]
  } catch (err) {
    console.warn(`[metricool] timeline ${metric} error:`, err)
    return null
  }
}

async function fetchAggregation({ userToken, userId, blogId, metric, start, end }: FetchTimelineArgs): Promise<number | null> {
  const url = `${BASE_URL}/stats/aggregation/${metric}?start=${start}&end=${end}&userId=${encodeURIComponent(userId)}&blogId=${encodeURIComponent(blogId)}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-Mc-Auth': userToken, Accept: 'application/json' },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      console.warn(`[metricool] aggregation ${metric} → ${res.status}`)
      return null
    }
    const data = await res.json()
    const n = typeof data === 'number' ? data : parseFloat(String(data))
    return Number.isFinite(n) ? n : null
  } catch (err) {
    console.warn(`[metricool] aggregation ${metric} error:`, err)
    return null
  }
}

// ═══════════════════════════════════════════════
// V2 ANALYTICS API (TikTok)
// ═══════════════════════════════════════════════

interface V2TimelinePoint { dateTime: string; value: number }
interface V2TimelineResponse { data: Array<{ metric: string; values: V2TimelinePoint[] }> }

async function fetchV2Timeline(
  creds: MetricoolCreds,
  metric: string,
  fromISO: string,
  toISO: string,
  subject?: string
): Promise<V2TimelinePoint[] | null> {
  const params = new URLSearchParams({
    network: 'tiktok',
    metric,
    from: fromISO,
    to: toISO,
    userId: creds.userId,
    blogId: creds.blogId,
  })
  if (subject) params.set('subject', subject)
  const url = `${BASE_URL}/v2/analytics/timelines?${params}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-Mc-Auth': creds.userToken, Accept: 'application/json' },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      console.warn(`[metricool] v2 timeline ${metric} → ${res.status}`)
      return null
    }
    const data = await res.json() as V2TimelineResponse
    if (!data?.data?.[0]?.values) return null
    return data.data[0].values
  } catch (err) {
    console.warn(`[metricool] v2 timeline ${metric} error:`, err)
    return null
  }
}

// ═══════════════════════════════════════════════
// Helpers compartidos
// ═══════════════════════════════════════════════

/** Toma el último valor de un timeline (para followers — valor puntual a final del periodo). */
function lastValue(timeline: TimelineEntry[] | null): number {
  if (!timeline || timeline.length === 0) return 0
  const last = timeline[timeline.length - 1]
  return parseInt(String(last?.[1] ?? '0'), 10) || 0
}

/** Suma los valores de un timeline (para reach, impressions — acumulativos del periodo). */
function sumValues(timeline: TimelineEntry[] | null): number {
  if (!timeline || timeline.length === 0) return 0
  return timeline.reduce((acc, entry) => acc + (parseInt(String(entry?.[1] ?? '0'), 10) || 0), 0)
}

/** Cuenta entradas no-cero del timeline (para posts_count — cuántos posts se hicieron en el mes). */
function countNonZero(timeline: TimelineEntry[] | null): number {
  if (!timeline || timeline.length === 0) return 0
  return timeline.filter(entry => parseInt(String(entry?.[1] ?? '0'), 10) > 0).length
}

/** Último valor de un timeline v2 (formato {dateTime, value}). */
function lastValueV2(points: V2TimelinePoint[] | null): number {
  if (!points || points.length === 0) return 0
  return points[points.length - 1].value || 0
}

/** Suma de un timeline v2. */
function sumV2(points: V2TimelinePoint[] | null): number {
  if (!points || points.length === 0) return 0
  return points.reduce((acc, p) => acc + (p.value || 0), 0)
}

/** Cuenta no-cero de un timeline v2. */
function countNonZeroV2(points: V2TimelinePoint[] | null): number {
  if (!points || points.length === 0) return 0
  return points.filter(p => p.value > 0).length
}

// ═══════════════════════════════════════════════
// SYNC PRINCIPAL
// ═══════════════════════════════════════════════

/**
 * Sincroniza las métricas de un mes para una red social concreta.
 * Devuelve null si no hay credenciales válidas o si la API falla completamente.
 */
export async function fetchMetricoolStats(
  creds: MetricoolCreds,
  month: Date,
  network: string = 'instagram'
): Promise<MetricoolStats | null> {
  // month se normaliza al primer día del mes
  const monthDate = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthStr = monthDate.toISOString().slice(0, 10)
  const start = `${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, '0')}01`
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const end = `${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, '0')}${String(lastDay).padStart(2, '0')}`

  // TikTok usa el API v2 con fechas ISO 8601
  if (network === 'tiktok') {
    return fetchTikTokStats(creds, monthDate, monthStr, lastDay)
  }

  // Legacy API (Instagram, Facebook, etc.)
  const prefix = network === 'instagram' ? 'ig' : network === 'tiktok' ? 'tk' : network === 'facebook' ? 'fb' : 'ig'

  const [followersTl, reachTl, impressionsTl, postsTl, engagementAgg] = await Promise.all([
    fetchTimeline({ ...creds, metric: `${prefix}Followers`, start, end }),
    fetchTimeline({ ...creds, metric: `${prefix}reach`, start, end }),
    fetchTimeline({ ...creds, metric: `${prefix}impressions`, start, end }),
    fetchTimeline({ ...creds, metric: `${prefix}Posts`, start, end }),
    fetchAggregation({ ...creds, metric: `${prefix}Engagement`, start, end }),
  ])

  // Si todo falló (p.ej. token inválido), salir sin guardar nada
  if (!followersTl && !reachTl && !impressionsTl && !postsTl && engagementAgg === null) {
    return null
  }

  return {
    month: monthStr,
    network,
    followers: lastValue(followersTl),
    reach: sumValues(reachTl),
    impressions: sumValues(impressionsTl),
    engagement_rate: engagementAgg ?? 0,
    posts_count: countNonZero(postsTl),
    raw: {
      followers_timeline: followersTl,
      reach_timeline: reachTl,
      impressions_timeline: impressionsTl,
      posts_timeline: postsTl,
      engagement_aggregation: engagementAgg,
    },
  }
}

/**
 * Sincroniza TikTok usando el API v2.
 * Métricas disponibles:
 *   - followers: followers_count (subject=account) → último valor
 *   - reach: views (video-level) → suma del mes
 *   - impressions: views (video-level) → mismo que reach (TikTok no separa)
 *   - posts_count: videos (video-level) → count non-zero
 *   - engagement_rate: (likes + comments + shares) / followers * 100
 */
async function fetchTikTokStats(
  creds: MetricoolCreds,
  monthDate: Date,
  monthStr: string,
  lastDay: number
): Promise<MetricoolStats | null> {
  const fromISO = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01T00:00:00Z`
  const toISO = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59Z`

  const [followersPts, viewsPts, videosPts, likesPts, commentsPts, sharesPts] = await Promise.all([
    fetchV2Timeline(creds, 'followers_count', fromISO, toISO, 'account'),
    fetchV2Timeline(creds, 'views', fromISO, toISO),
    fetchV2Timeline(creds, 'videos', fromISO, toISO),
    fetchV2Timeline(creds, 'likes', fromISO, toISO),
    fetchV2Timeline(creds, 'comments', fromISO, toISO),
    fetchV2Timeline(creds, 'shares', fromISO, toISO),
  ])

  // Si todo falló, salir
  if (!followersPts && !viewsPts && !videosPts && !likesPts && !commentsPts && !sharesPts) {
    return null
  }

  const followers = lastValueV2(followersPts)
  const reach = sumV2(viewsPts)
  const posts_count = countNonZeroV2(videosPts)
  const totalInteractions = sumV2(likesPts) + sumV2(commentsPts) + sumV2(sharesPts)
  // Engagement rate = interactions / reach (más representativo en TikTok donde
  // los videos llegan a no-seguidores; dividir por followers da valores >100%)
  const engagement_rate = reach > 0 ? (totalInteractions / reach) * 100 : 0

  return {
    month: monthStr,
    network: 'tiktok',
    followers,
    reach,
    impressions: reach, // TikTok no separa impressions de reach en este endpoint
    engagement_rate: Number(engagement_rate.toFixed(2)),
    posts_count,
    raw: {
      followers_timeline: followersPts,
      views_timeline: viewsPts,
      videos_timeline: videosPts,
      likes_timeline: likesPts,
      comments_timeline: commentsPts,
      shares_timeline: sharesPts,
      total_interactions: totalInteractions,
    },
  }
}

/**
 * Verifica que las credenciales son válidas lanzando una llamada simple.
 * Devuelve true si la API responde con 200.
 */
export async function verifyMetricoolCreds(creds: MetricoolCreds): Promise<boolean> {
  const today = new Date()
  const start = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}01`
  const end = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}15`
  const tl = await fetchTimeline({ ...creds, metric: 'igFollowers', start, end })
  return tl !== null
}

// ═══════════════════════════════════════════════
// SCHEDULER API — Programar posts a redes
// ═══════════════════════════════════════════════

export interface SchedulePostInput {
  caption: string
  publicationDate: string    // ISO 8601, e.g. "2026-07-29T12:00:00"
  timezone?: string          // default "Europe/Madrid"
  providers: string[]        // ['instagram', 'facebook', ...]
  mediaUrl: string           // URL pública del archivo (preferiblemente normalizada)
  instagramType?: 'POST' | 'REEL' | 'STORY'
}

export interface SchedulePostResult {
  network: string
  postId: string | null
  status: 'scheduled' | 'failed'
  error?: string
  raw?: unknown
}

/**
 * Normaliza una URL de media para que Metricool pueda descargarla.
 * GET /actions/normalize/image/url?url=...
 * Si falla, devuelve la URL original (Metricool a veces acepta URLs directas).
 */
export async function normalizeMediaUrl(creds: MetricoolCreds, url: string): Promise<string> {
  const params = new URLSearchParams({
    url,
    userId: creds.userId,
    blogId: creds.blogId,
  })
  const reqUrl = `${BASE_URL}/actions/normalize/image/url?${params}`
  try {
    const res = await fetch(reqUrl, {
      method: 'GET',
      headers: { 'X-Mc-Auth': creds.userToken, Accept: 'application/json' },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      console.warn(`[metricool] normalize → ${res.status} ${bodyText.slice(0, 200)}`)
      return url
    }
    const data = await res.json()
    // La respuesta puede ser string directa o { url: "..." }
    if (typeof data === 'string' && data.trim()) return data.trim()
    if (data && typeof data === 'object' && typeof data.url === 'string') return data.url
    if (data && typeof data === 'object' && typeof data.data === 'string') return data.data
    return url
  } catch (err) {
    console.warn('[metricool] normalize error:', err)
    return url
  }
}

/**
 * Programa un post a una o varias redes vía Metricool.
 * POST /v2/scheduler/posts?userId=...&blogId=...
 *
 * Body shape (según doc oficial Metricool):
 *   publicationDate: { dateTime, timezone }   — objeto, no string plano
 *   text: string                               — caption del post
 *   providers: [{ network: "instagram" }, ...] — array de objetos, no strings
 *   media: [url]                               — URLs normalizadas
 *   autoPublish: true
 *   instagramData: { type: "POST" | "REEL" | "STORY" }  — solo IG
 *
 * Devuelve un resultado por red pedida.
 */
export async function schedulePost(
  creds: MetricoolCreds,
  input: SchedulePostInput
): Promise<SchedulePostResult[]> {
  const params = new URLSearchParams({
    userId: creds.userId,
    blogId: creds.blogId,
  })
  const url = `${BASE_URL}/v2/scheduler/posts?${params}`

  const tz = input.timezone || 'Europe/Madrid'
  const body: Record<string, unknown> = {
    text: input.caption || '',
    publicationDate: {
      dateTime: input.publicationDate,
      timezone: tz,
    },
    providers: input.providers.map(network => ({ network })),
    media: [input.mediaUrl],
    autoPublish: true,
    saveExternalMediaFiles: true,
    shortener: false,
    draft: false,
    hasNotReadNotes: false,
  }
  if (input.instagramType) {
    body.instagramData = { type: input.instagramType }
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Mc-Auth': creds.userToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red'
    return input.providers.map(network => ({
      network, postId: null, status: 'failed', error: msg,
    }))
  }

  // Capturar el cuerpo como texto primero para diagnóstico
  const rawText = await res.text().catch(() => '')
  let json: any = {}
  try { json = rawText ? JSON.parse(rawText) : {} } catch { json = { _raw: rawText } }

  if (!res.ok) {
    const msg = (json && (json.error || json.message || json._raw)) || `Metricool ${res.status}: ${rawText.slice(0, 300)}`
    return input.providers.map(network => ({
      network, postId: null, status: 'failed', error: String(msg).slice(0, 500), raw: json,
    }))
  }

  // La respuesta puede traer un array de posts (uno por provider) o uno único.
  const data = json?.data ?? json
  const posts: any[] = Array.isArray(data) ? data : (data ? [data] : [])

  // Si hay un post por provider, mapear por network; si no, replicar a todas
  if (posts.length === input.providers.length) {
    return input.providers.map((network, i) => {
      const p = posts[i] || {}
      const pid = String(p.id ?? p.postId ?? p.post_id ?? '')
      const ok = res.ok && pid
      return {
        network,
        postId: pid || null,
        status: ok ? 'scheduled' : 'failed',
        error: ok ? undefined : 'Respuesta sin postId',
        raw: p,
      } as SchedulePostResult
    })
  }

  // Respuesta única → replicar postId a todas las redes pedidas
  const single = posts[0] || {}
  const pid = String(single.id ?? single.postId ?? single.post_id ?? '')
  return input.providers.map(network => ({
    network,
    postId: pid || null,
    status: pid ? 'scheduled' : 'failed',
    error: pid ? undefined : 'Respuesta sin postId',
    raw: single,
  }))
}