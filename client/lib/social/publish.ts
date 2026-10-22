/**
 * PUBLICAR EN INSTAGRAM (preparado, DESACTIVADO — 22-oct-2026).
 *
 * Content Publishing API con Instagram Login (graph.instagram.com):
 *   1. POST /{ig-user-id}/media           → contenedor (imagen, vídeo/reel, story, hijo de carrusel)
 *   2. GET  /{container-id}?fields=status_code  → esperar FINISHED (los vídeos tardan)
 *   3. POST /{ig-user-id}/media_publish   → creation_id = contenedor → id de la publicación
 *   Límite: GET /{ig-user-id}/content_publishing_limit (Meta: 100 publicaciones / 24 h).
 *
 * Requisitos (ver ../../docs/INSTAGRAM-PUBLICAR.md):
 *   - Permiso instagram_business_content_publish APROBADO en App Review.
 *   - INSTAGRAM_PUBLISH_ENABLED=1 en el servidor (si no, nada de esto se ejecuta).
 *   - La estilista reconecta para conceder el permiso nuevo.
 *   - Imágenes JPEG y vídeos en una URL PÚBLICA en el momento de publicar.
 */
import { GraphApiError, PUBLISH_SCOPE, isInstagramPublishEnabled } from './instagram'

const GRAPH = 'https://graph.instagram.com/v25.0'

export type PublishKind = 'image' | 'carousel' | 'reel' | 'story'

export interface PublishInput {
  kind: PublishKind
  /** JPEG públicas. image/story-imagen: 1; carousel: 2–10. */
  imageUrls?: string[]
  /** MP4 público (reel o story de vídeo). */
  videoUrl?: string
  caption?: string
  /** Portada del reel (JPEG pública), opcional. */
  coverUrl?: string
  /** Reel también en el feed (por defecto sí). */
  shareToFeed?: boolean
}

/** Un paso de creación de contenedor: parámetros del POST /media. */
export type ContainerParams = Record<string, string>

export interface PublishPlan {
  children: ContainerParams[]
  /** Contenedor final (o único). `children` se rellena con los ids al ejecutarse. */
  main: ContainerParams
  isVideo: boolean
}

const CAPTION_MAX = 2200
const CAROUSEL_MIN = 2
/** Meta admite hasta 20 en la docs actual; usamos 10 (lo seguro en todas las versiones). */
const CAROUSEL_MAX = 10

const isHttps = (u: string | undefined): u is string => !!u && /^https:\/\//i.test(u)
const looksJpeg = (u: string) => /\.jpe?g(\?|$)/i.test(u)

/**
 * Valida y traduce lo que se quiere publicar a las llamadas de la API.
 * Lógica pura (testeable). Devuelve errores en español sencillo.
 */
export function buildPublishPlan(input: PublishInput): { ok: true; plan: PublishPlan } | { ok: false; error: string } {
  const caption = (input.caption || '').trim()
  if (caption.length > CAPTION_MAX) return { ok: false, error: `El texto es demasiado largo (máximo ${CAPTION_MAX} caracteres).` }
  const imgs = input.imageUrls ?? []
  if (imgs.some(u => !isHttps(u))) return { ok: false, error: 'Las imágenes tienen que estar en una dirección pública (https).' }
  if (imgs.some(u => !looksJpeg(u))) return { ok: false, error: 'Instagram solo acepta imágenes JPEG para publicar.' }

  switch (input.kind) {
    case 'image': {
      if (imgs.length !== 1) return { ok: false, error: 'Para una foto hace falta exactamente una imagen.' }
      return { ok: true, plan: { children: [], main: { image_url: imgs[0], ...(caption ? { caption } : {}) }, isVideo: false } }
    }
    case 'carousel': {
      if (imgs.length < CAROUSEL_MIN || imgs.length > CAROUSEL_MAX) {
        return { ok: false, error: `Un carrusel lleva entre ${CAROUSEL_MIN} y ${CAROUSEL_MAX} imágenes.` }
      }
      return {
        ok: true,
        plan: {
          children: imgs.map(u => ({ image_url: u, is_carousel_item: 'true' })),
          main: { media_type: 'CAROUSEL', ...(caption ? { caption } : {}) },
          isVideo: false,
        },
      }
    }
    case 'reel': {
      if (!isHttps(input.videoUrl)) return { ok: false, error: 'El reel tiene que estar en una dirección pública (https).' }
      if (input.coverUrl && !isHttps(input.coverUrl)) return { ok: false, error: 'La portada tiene que estar en una dirección pública (https).' }
      return {
        ok: true,
        plan: {
          children: [],
          main: {
            media_type: 'REELS',
            video_url: input.videoUrl,
            share_to_feed: input.shareToFeed === false ? 'false' : 'true',
            ...(input.coverUrl ? { cover_url: input.coverUrl } : {}),
            ...(caption ? { caption } : {}),
          },
          isVideo: true,
        },
      }
    }
    case 'story': {
      if (isHttps(input.videoUrl)) {
        return { ok: true, plan: { children: [], main: { media_type: 'STORIES', video_url: input.videoUrl }, isVideo: true } }
      }
      if (imgs.length !== 1) return { ok: false, error: 'Una story lleva una imagen o un vídeo.' }
      return { ok: true, plan: { children: [], main: { media_type: 'STORIES', image_url: imgs[0] }, isVideo: false } }
    }
    default:
      return { ok: false, error: 'Tipo de publicación no válido.' }
  }
}

export function canPublish(scopes: string[] | null | undefined): boolean {
  return isInstagramPublishEnabled() && !!scopes?.includes(PUBLISH_SCOPE)
}

// ─── Ejecución (red) ─────────────────────────────────────────────────

async function graph(path: string, token: string, init?: { method?: 'GET' | 'POST'; params?: Record<string, string> }) {
  const params = new URLSearchParams({ ...(init?.params ?? {}), access_token: token })
  const method = init?.method ?? 'GET'
  const url = method === 'GET' ? `${GRAPH}${path}?${params}` : `${GRAPH}${path}`
  const res = await fetch(url, {
    method,
    ...(method === 'POST' ? { body: params } : {}),
    signal: AbortSignal.timeout(30_000),
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  const err = body.error as Record<string, unknown> | undefined
  if (!res.ok || err) {
    throw new GraphApiError(String(err?.message ?? `Instagram respondió ${res.status}.`), Number(err?.code ?? 0), res.status)
  }
  return body
}

async function createContainer(igUserId: string, token: string, params: ContainerParams): Promise<string> {
  const body = await graph(`/${igUserId}/media`, token, { method: 'POST', params })
  const id = typeof body.id === 'string' ? body.id : null
  if (!id) throw new GraphApiError('Instagram no devolvió el contenedor.', 0, 502)
  return id
}

/** Espera a que el contenedor esté listo (Meta: consultar ≤ 1/min, máx. 5 min; aquí 10 s para fotos). */
async function waitReady(containerId: string, token: string, isVideo: boolean): Promise<void> {
  const interval = isVideo ? 15_000 : 3_000
  const deadline = Date.now() + (isVideo ? 5 * 60_000 : 30_000)
  while (Date.now() < deadline) {
    const body = await graph(`/${containerId}`, token, { params: { fields: 'status_code' } })
    const status = String(body.status_code ?? '')
    if (status === 'FINISHED') return
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new GraphApiError(`Instagram no pudo procesar el archivo (${status}).`, 0, 422)
    }
    await new Promise(r => setTimeout(r, interval))
  }
  throw new GraphApiError('Instagram tardó demasiado en procesar el archivo.', 0, 504)
}

/** Publicaciones restantes en las últimas 24 h (null si Meta no lo dice). */
export async function remainingQuota(igUserId: string, token: string): Promise<number | null> {
  try {
    const body = await graph(`/${igUserId}/content_publishing_limit`, token, { params: { fields: 'quota_usage,config' } })
    const row = (Array.isArray(body.data) ? body.data[0] : null) as Record<string, unknown> | null
    const used = Number(row?.quota_usage)
    const total = Number((row?.config as Record<string, unknown> | undefined)?.quota_total)
    return Number.isFinite(used) && Number.isFinite(total) ? Math.max(0, total - used) : null
  } catch {
    return null
  }
}

/**
 * Publica de verdad. SOLO se llama desde /api/social/publish, que comprueba
 * antes: permiso activado, permiso concedido y confirmación explícita.
 */
export async function publishToInstagram(igUserId: string, token: string, input: PublishInput): Promise<{ mediaId: string }> {
  if (!isInstagramPublishEnabled()) throw new Error('Publicar en Instagram no está activado.')
  const built = buildPublishPlan(input)
  if (!built.ok) throw new Error(built.error)
  const { plan } = built

  const quota = await remainingQuota(igUserId, token)
  if (quota === 0) throw new GraphApiError('Has llegado al límite de publicaciones de Instagram por hoy.', 0, 429)

  const main = { ...plan.main }
  if (plan.children.length) {
    const ids: string[] = []
    for (const child of plan.children) {
      const id = await createContainer(igUserId, token, child)
      await waitReady(id, token, false)
      ids.push(id)
    }
    main.children = ids.join(',')
  }
  const containerId = await createContainer(igUserId, token, main)
  await waitReady(containerId, token, plan.isVideo)
  const published = await graph(`/${igUserId}/media_publish`, token, { method: 'POST', params: { creation_id: containerId } })
  const mediaId = typeof published.id === 'string' ? published.id : null
  if (!mediaId) throw new GraphApiError('Instagram no confirmó la publicación.', 0, 502)
  return { mediaId }
}
