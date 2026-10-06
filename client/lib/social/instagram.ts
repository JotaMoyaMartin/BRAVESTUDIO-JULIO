import type { SocialProviderClient } from './provider'
import type {
  SocialDayPoint,
  SocialExchangeResult,
  SocialMediaMetrics,
  SocialMediaSnapshot,
  SocialProfile,
  SocialRefreshResult,
} from './types'

/**
 * Cliente de la Instagram Platform vía INSTAGRAM LOGIN — la decisión de
 * producto para BRÄVE: la estilista conecta SOLO su cuenta de Instagram
 * profesional, sin Facebook ni Página (más simple y con los mismos
 * insights que la vía de Facebook para V1).
 *
 * Graph API pinnear v25.0 — si Meta saca versiones nuevas, aquí se cambia.
 *
 * Docs clave:
 *   - OAuth: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 *   - Insights: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/insights
 *
 * Env necesarias (server): INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET — el
 * Instagram App ID y su App Secret del setup "API with Instagram login"
 * de la app de Meta (NO el App ID general de la app).
 * Notas de la Graph API que este cliente tolera:
 *   - CAROUSEL_ALBUM no acepta insights (Meta responde 400) → no se piden.
 *   - Métricas con menos de 5 cuentas alcanzadas → error code 10 → null
 *     (no es un fallo real, solo falta de audiencia suficiente).
 *   - follows_and_unfollows llega como DOS series con `title`
 *     ("Follows" / "Unfollows"); el parser usa title si existe.
 */

const GRAPH_HOST = 'https://graph.instagram.com'
const GRAPH_VERSION = 'v25.0'
const TOKEN_EXCHANGE_HOST = 'https://api.instagram.com'

const AUTH_BASE = 'https://www.instagram.com/oauth/authorize'
const SCOPES = ['instagram_business_basic', 'instagram_business_manage_insights']

const TIMEOUT_MS = 20_000
const RETRY_DELAY_MS = 800

export function isInstagramConfigured(): boolean {
  return !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET)
}

/** Error normalizado de la Graph API (code + message). */
export class GraphApiError extends Error {
  code: number
  status: number
  constructor(message: string, code: number, status: number) {
    super(message)
    this.name = 'GraphApiError'
    this.code = code
    this.status = status
  }
}

// ─────────────────────────────────────────────────────────────────────
// Normalizadores (exportados para tests — lógica pura, sin red)
// ─────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null
const str = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null

/**
 * Métricas que admite cada tipo de pieza (según Graph API v25).
 * `null` = piezas SIN insights (CAROUSEL: la API responde 400).
 */
export function mediaInsightsMetric(mediaProductType?: string | null): string[] | null {
  switch (mediaProductType) {
    case 'REELS':
      return ['views', 'reach', 'total_interactions', 'likes', 'comments', 'saved', 'shares', 'ig_reels_avg_watch_time']
    case 'STORY':
      // Solo válidas mientras la story está activa (24 h).
      return ['views', 'reach', 'replies', 'shares', 'follows', 'profile_visits']
    case 'CAROUSEL_ALBUM':
      return null
    case 'IMAGE':
    case 'VIDEO':
      return ['views', 'reach', 'total_interactions', 'likes', 'comments', 'saved', 'shares']
    default:
      return ['views', 'reach', 'total_interactions', 'likes', 'comments', 'saved', 'shares']
  }
}

/** Parsea la respuesta de /{media_id}/insights → métricas normalizadas. */
export function parseMediaInsights(raw: unknown): Partial<SocialMediaMetrics> {
  const metrics: Partial<SocialMediaMetrics> = {}
  const rows: Row[] = Array.isArray((raw as Row)?.data)
    ? ((raw as { data: unknown[] }).data as Row[])
    : []

  for (const entry of rows) {
    const name = str(entry.name)
    if (!name) continue
    const values = (entry.values as Row[] | undefined) || []
    const value = num(values[0]?.value)
    if (value === null) continue
    switch (name) {
      case 'views': metrics.views = value; break
      case 'reach': metrics.reach = value; break
      case 'likes': metrics.likes = value; break
      case 'comments': metrics.comments = value; break
      case 'saved': metrics.saved = value; break
      case 'shares': metrics.shares = value; break
      case 'total_interactions': metrics.totalInteractions = value; break
      case 'ig_reels_avg_watch_time': metrics.avgWatchTimeMs = value; break
      default: break
    }
  }
  return metrics
}

/** Parsea /me/insights → puntos diarios fusionados (huecos → null). */
export function normalizeAccountInsights(raw: unknown): SocialDayPoint[] {
  const rows: Row[] = Array.isArray((raw as Row)?.data)
    ? ((raw as { data: unknown[] }).data as Row[])
    : []
  const byDate = new Map<string, SocialDayPoint>()

  const point = (date: string): SocialDayPoint => {
    let p = byDate.get(date)
    if (!p) {
      p = {
        date,
        followers: null, reach: null, views: null,
        totalInteractions: null, accountsEngaged: null,
        follows: null, unfollows: null, profileLinksTaps: null,
      }
      byDate.set(date, p)
    }
    return p
  }

  const readSeries = (entry: Row, field: keyof Omit<SocialDayPoint, 'date'>) => {
    const values = (entry.values as Row[] | undefined) || []
    for (const v of values) {
      const end = str(v.end_time)
      const value = num(v.value)
      if (!end || value === null) continue
      point(end.slice(0, 10))[field] = value
    }
  }

  for (const entry of rows) {
    const name = str(entry.name)
    if (!name) continue
    switch (name) {
      case 'follower_count': readSeries(entry, 'followers'); break
      case 'views': readSeries(entry, 'views'); break
      case 'reach': readSeries(entry, 'reach'); break
      case 'total_interactions': readSeries(entry, 'totalInteractions'); break
      case 'accounts_engaged': readSeries(entry, 'accountsEngaged'); break
      case 'profile_links_taps': readSeries(entry, 'profileLinksTaps'); break
      case 'follows': readSeries(entry, 'follows'); break
      case 'unfollows': readSeries(entry, 'unfollows'); break
      case 'follows_and_unfollows': {
        // Meta devuelve DOS series con `title` ("Follows"/"Unfollows");
        // si solo llega una sin título, se asume follows.
        const title = (str(entry.title) || '').toLowerCase()
        if (title.includes('unfollow')) readSeries(entry, 'unfollows')
        else readSeries(entry, 'follows')
        break
      }
      default: break
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Parsea una fila de /me/media (o /me/stories) → snapshot. Las métricas de
 * like_count/comments_count ya vienen en la ficha del media; los insights
 * enriquecen después. Devuelve null si la fila no tiene id.
 */
export function normalizeMediaItem(
  row: unknown,
  insights?: Partial<SocialMediaMetrics> | null,
  forcedProductType?: string | null,
): SocialMediaSnapshot | null {
  const r = (row ?? {}) as Row
  const id = str(r.id)
  if (!id) return null
  const metrics: Partial<SocialMediaMetrics> = {}
  const likes = num(r.like_count)
  const comments = num(r.comments_count)
  if (likes !== null) metrics.likes = likes
  if (comments !== null) metrics.comments = comments
  return {
    providerMediaId: id,
    mediaType: str(r.media_type),
    mediaProductType: forcedProductType ?? str(r.media_product_type),
    caption: str(r.caption),
    postedAt: str(r.timestamp),
    permalink: str(r.permalink),
    thumbnailUrl: str(r.thumbnail_url),
    metrics: { ...metrics, ...(insights ?? {}) },
  }
}

// ─────────────────────────────────────────────────────────────────────
// Transporte
// ─────────────────────────────────────────────────────────────────────

async function fetchJson(url: string, init?: RequestInit, attempt = 0): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new GraphApiError('Instagram tardó demasiado en responder (timeout 20s).', 0, 0)
    }
    throw err
  }
  // 1 retry en 429/5xx (fallo transitorio real de Meta).
  if ((res.status === 429 || res.status >= 500) && attempt < 1) {
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
    return fetchJson(url, init, attempt + 1)
  }
  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    // cuerpo no JSON: se trata como error HTTP puro más abajo
  }
  if (!res.ok) {
    const body =
      payload && typeof payload === 'object'
        ? ((payload as Row).error as Row | undefined) ?? (payload as Row)
        : undefined
    const message =
      str(body?.message) ?? str(body?.error_message) ?? `Instagram respondió ${res.status}.`
    const code = num(body?.code) ?? 0
    throw new GraphApiError(message, code, res.status)
  }
  // Graph también puede devolver 200 con error embebido ({error:{...}}).
  const graphError =
    payload && typeof payload === 'object'
      ? ((payload as Row).error as Row | undefined)
      : undefined
  if (graphError && typeof graphError === 'object' && (graphError.code || graphError.message)) {
    throw new GraphApiError(
      str(graphError.message) ?? 'Error de la Graph API de Instagram.',
      num(graphError.code) ?? 0,
      res.status,
    )
  }
  return payload
}

const q = (v: string): string => encodeURIComponent(v)

/**
 * Errores de insights que NO son fallos reales: la métrica con < 5 cuentas
 * alcanzadas (code 10) o la pieza ya borrada/caducada (9007/4007) → null.
 */
export function isInsightlessError(err: unknown): boolean {
  return (
    err instanceof GraphApiError &&
    (err.code === 10 || err.code === 9007 || err.code === 4007)
  )
}

// ─────────────────────────────────────────────────────────────────────
// Cliente
// ─────────────────────────────────────────────────────────────────────

export class InstagramProviderClient implements SocialProviderClient {
  /** URL de pantalla de consentimiento (state va en query, se verifica en callback). */
  authorizeUrl(state: string, redirectUri: string): string {
    if (!isInstagramConfigured()) {
      throw new Error('INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET no configurados — no se puede iniciar la conexión con Instagram.')
    }
    const appId = process.env.INSTAGRAM_APP_ID as string
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(','),
      state,
    })
    return `${AUTH_BASE}?${params.toString()}`
  }

  /**
   * code → token corto (POST en api.instagram.com, según exige la docs)
   * → token long-lived (~60 días, ig_exchange_token) de LA cuenta IG que
   * autorizó. El token va ligado a esa única cuenta: los métodos siguientes
   * ignoran `igUserId` (reservado a otros proveedores multicanal).
   */
  async exchangeCode(code: string, redirectUri: string): Promise<SocialExchangeResult> {
    if (!isInstagramConfigured()) {
      throw new Error('Faltan INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET en el servidor.')
    }
    const appId = process.env.INSTAGRAM_APP_ID as string
    const appSecret = process.env.INSTAGRAM_APP_SECRET as string

    const short = (await fetchJson(`${TOKEN_EXCHANGE_HOST}/oauth/access_token`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })) as Row
    const shortToken = str(short.access_token)
    if (!shortToken) throw new GraphApiError('Instagram no devolvió access_token.', 0, 502)

    const longUrl =
      `${GRAPH_HOST}/access_token?grant_type=ig_exchange_token` +
      `&client_secret=${q(appSecret)}&access_token=${q(shortToken)}`
    let accessToken = shortToken
    let expiresInSeconds: number | null = null
    try {
      const long = (await fetchJson(longUrl)) as Row
      const longToken = str(long.access_token)
      if (longToken) accessToken = longToken
      const exp = num(long.expires_in)
      if (exp !== null) expiresInSeconds = exp
    } catch {
      // Si el canje a long-lived falla usamos el token corto (menos vida,
      // pero la conexión funciona) — el token_expired lo detectará el sync.
    }

    return {
      accessToken,
      providerAccountId: str(short.user_id) ?? '',
      expiresInSeconds,
      scopes: SCOPES,
    }
  }

  /** Perfil de la cuenta IG (el token va ligado a la cuenta → /me). */
  async getProfile(token: string): Promise<SocialProfile> {
    const url =
      `${GRAPH_HOST}/${GRAPH_VERSION}/me?fields=${q('id,username,account_type,followers_count,follows_count,media_count,profile_picture_url')}` +
      `&access_token=${q(token)}`
    const raw = (await fetchJson(url)) as Row
    return {
      providerAccountId: str(raw.id) ?? '',
      username: str(raw.username),
      accountType: str(raw.account_type),
      avatarUrl: str(raw.profile_picture_url),
      followers: num(raw.followers_count),
    }
  }

  async refreshToken(token: string): Promise<SocialRefreshResult> {
    const url =
      `${GRAPH_HOST}/${GRAPH_VERSION}/refresh_access_token?grant_type=ig_refresh_token` +
      `&access_token=${q(token)}`
    const raw = (await fetchJson(url)) as Row
    const accessToken = str(raw.access_token)
    if (!accessToken) throw new GraphApiError('Instagram no devolvió token renovado.', 0, 502)
    return { accessToken, expiresInSeconds: num(raw.expires_in) }
  }

  async listRecentMedia(token: string, limit = 50): Promise<SocialMediaSnapshot[]> {
    const fields = 'id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,like_count,comments_count'
    const url =
      `${GRAPH_HOST}/${GRAPH_VERSION}/me/media?fields=${q(fields)}&limit=${Math.min(limit, 100)}` +
      `&access_token=${q(token)}`
    const raw = (await fetchJson(url)) as Row
    const items: Row[] = (raw.data as Row[] | undefined) ?? []
    // 1 página extra de paginación como máximo (los últimos ~50 cubren el
    // análisis del mes; no paginar infinito). `paging.next` ya trae el cursor.
    if (items.length >= limit) {
      const nextPath = str(((raw.paging as Row | undefined) ?? {}).next)
      if (nextPath) {
        try {
          const page2 = (await fetchJson(`${nextPath}&access_token=${q(token)}`)) as Row
          const extra: Row[] = (page2.data as Row[] | undefined) ?? []
          items.push(...extra)
        } catch {
          // paginación best-effort: si falla, quedan los de la primera página
        }
      }
    }
    return items
      .map(item => normalizeMediaItem(item))
      .filter((m): m is SocialMediaSnapshot => !!m)
      .slice(0, limit * 2)
  }

  async getMediaInsights(
    token: string,
    mediaId: string,
    mediaProductType?: string | null,
  ): Promise<Partial<SocialMediaMetrics> | null> {
    const metricList = mediaInsightsMetric(mediaProductType)
    if (!metricList) return null // CAROUSEL_ALBUM: Meta responde 400 → ni pedirlo
    const url =
      `${GRAPH_HOST}/${GRAPH_VERSION}/${q(mediaId)}/insights?metric=${q(metricList.join(','))}` +
      `&access_token=${q(token)}`
    try {
      const raw = await fetchJson(url)
      return parseMediaInsights(raw)
    } catch (err) {
      // code 10 = métrica con < 5 cuentas alcanzadas (dato vacío, no error);
      // 9007/4007 = pieza borrada o story caducada entre listado e insights.
      if (isInsightlessError(err)) {
        return null
      }
      throw err
    }
  }

  async getAccountDaily(token: string, sinceISO: string): Promise<SocialDayPoint[]> {
    const since = Math.floor(new Date(sinceISO).getTime() / 1000)
    const url =
      `${GRAPH_HOST}/${GRAPH_VERSION}/me/insights?metric=${q('follower_count,views,reach,total_interactions,accounts_engaged,profile_links_taps,follows_and_unfollows')}` +
      `&period=day&since=${since}&access_token=${q(token)}`
    const raw = await fetchJson(url)
    return normalizeAccountInsights(raw)
  }

  async getActiveStoriesInsights(token: string): Promise<SocialMediaSnapshot[]> {
    const url =
      `${GRAPH_HOST}/${GRAPH_VERSION}/me/stories?fields=${q('id,timestamp,permalink,media_type')}` +
      `&limit=20&access_token=${q(token)}`
    const raw = (await fetchJson(url)) as Row
    const items: Row[] = (raw.data as Row[] | undefined) ?? []
    const out: SocialMediaSnapshot[] = []
    for (const item of items) {
      const base = normalizeMediaItem(item, null, 'STORY')
      if (!base) continue
      try {
        const insights = await this.getMediaInsights(token, base.providerMediaId, 'STORY')
        out.push({ ...base, metrics: { ...base.metrics, ...(insights ?? {}) } })
      } catch {
        // story sin datos (borrada / caducada entre listado e insights) → se omiten sus métricas
        out.push(base)
      }
    }
    return out
  }
}