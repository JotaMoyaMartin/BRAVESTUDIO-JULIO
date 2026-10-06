import { decryptSecret } from '@/lib/crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { GraphApiError } from './instagram'
import { getSocialProvider } from './provider'
import {
  logSync,
  markSynced,
  updateConnectionProfile,
  updateConnectionStatus,
  updateToken,
  upsertDailyPoints,
  upsertMedia,
} from './repo'
import type {
  SocialDayPoint,
  SocialMediaSnapshot,
  SocialProvider,
  SocialSyncSummary,
} from './types'
import type { SocialConnectionRow } from '@/types/database'

/**
 * Motor de sincronización social compartido por /api/social/sync (manual)
 * y /api/social/cron (diaria). La política de errores es tolerante:
 * fallos por pieza (insights de un media concreto, stories) van al array
 * `errors` del summary — la sync continúa; solo un fallo de token o de
 * perfil aborta el proceso y marca la conexión.
 */

export type RunSyncResult =
  | { ok: true; summary: SocialSyncSummary }
  | {
      ok: false
      errorCode: 'provider_unsupported' | 'not_connected' | 'token_expired' | 'internal'
      message?: string
    }

const MEDIA_LIMIT = 50
/** IG renueva tokens long-lived desde 24 h antes de caducar; avisamos antes. */
const REFRESH_THRESHOLD_MS = 14 * 86_400_000
const DAILY_HISTORY_DAYS = 30

const errMsg = (err: unknown): string => (err instanceof Error ? err.message : 'error desconocido')

export async function runSync(userId: string, provider: SocialProvider): Promise<RunSyncResult> {
  const client = getSocialProvider(provider)
  if (!client) {
    return {
      ok: false,
      errorCode: 'provider_unsupported',
      message: 'Los datos de esta red llegarán en próximas fases.',
    }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('social_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()
  const conn = (data as SocialConnectionRow | null) ?? null
  if (!conn) {
    return { ok: false, errorCode: 'not_connected' }
  }

  const summary: SocialSyncSummary = { daily: 0, media: 0, stories: 0, errors: [] }

  try {
    // ── Token: descifrar + renovar si vence en < 14 días ───────────
    let token: string
    try {
      token = decryptSecret(conn.access_token_encrypted)
    } catch (err) {
      await updateConnectionStatus(userId, provider, 'error')
      await logSync(userId, provider, 'sync', 'error', { stage: 'decrypt', message: errMsg(err) })
      return {
        ok: false,
        errorCode: 'internal',
        message: 'No se pudo leer el token de la cuenta — reconecta Instagram.',
      }
    }

    const expiresMs = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : null
    if (expiresMs && expiresMs - Date.now() < REFRESH_THRESHOLD_MS) {
      try {
        const refreshed = await client.refreshToken(token)
        await updateToken(userId, provider, refreshed.accessToken, refreshed.expiresInSeconds)
        token = refreshed.accessToken
      } catch (err) {
        if (err instanceof GraphApiError && err.code === 190) {
          // El token ya no es renovable — reconexión forzosa.
          await updateConnectionStatus(userId, provider, 'token_expired')
          await logSync(userId, provider, 'sync', 'error', { stage: 'refresh', code: 190 })
          return {
            ok: false,
            errorCode: 'token_expired',
            message: 'Instagram revocó el acceso — vuelve a conectar tu cuenta.',
          }
        }
        // Fallo transitorio de red/Meta: el token sigue vivo, seguimos con él.
        summary.errors.push(`renovación de token: ${errMsg(err)}`)
      }
    }

    // ── Perfil (identidad al día; 190 aquí = token muerto) ─────────
    try {
      const profile = await client.getProfile(token)
      if (
        profile.username !== conn.username ||
        profile.accountType !== conn.account_type ||
        profile.avatarUrl !== conn.avatar_url
      ) {
        await updateConnectionProfile(userId, provider, {
          username: profile.username,
          accountType: profile.accountType,
          avatarUrl: profile.avatarUrl,
        })
      }
    } catch (err) {
      if (err instanceof GraphApiError && err.code === 190) {
        await updateConnectionStatus(userId, provider, 'token_expired')
        await logSync(userId, provider, 'sync', 'error', { stage: 'profile', code: 190 })
        return {
          ok: false,
          errorCode: 'token_expired',
          message: 'Instagram revocó el acceso — vuelve a conectar tu cuenta.',
        }
      }
      summary.errors.push(`perfil: ${errMsg(err)}`)
    }

    // ── Feed reciente + insights por pieza ─────────────────────────
    let mediaItems: SocialMediaSnapshot[] = []
    try {
      mediaItems = await client.listRecentMedia(token, MEDIA_LIMIT)
    } catch (err) {
      if (err instanceof GraphApiError && err.code === 190) {
        await updateConnectionStatus(userId, provider, 'token_expired')
        await logSync(userId, provider, 'sync', 'error', { stage: 'media', code: 190 })
        return {
          ok: false,
          errorCode: 'token_expired',
          message: 'Instagram revocó el acceso — vuelve a conectar tu cuenta.',
        }
      }
      summary.errors.push(`contenidos: ${errMsg(err)}`)
    }

    const savedMedia: SocialMediaSnapshot[] = []
    const seen = new Set<string>()
    for (const item of mediaItems) {
      if (seen.has(item.providerMediaId)) continue
      seen.add(item.providerMediaId)
      let insights: Partial<SocialMediaSnapshot['metrics']> | null = null
      try {
        if (item.mediaProductType === 'CAROUSEL_ALBUM') {
          // La Graph API rechaza insights de carrusel (400) — no se piden.
          insights = null
        } else {
          insights = await client.getMediaInsights(token, item.providerMediaId, item.mediaProductType)
        }
      } catch (err) {
        // Tolerante: una pieza sin datos no bloquea el resto.
        summary.errors.push(`insights de ${item.providerMediaId}: ${errMsg(err)}`)
      }
      savedMedia.push({ ...item, metrics: { ...(item.metrics ?? {}), ...(insights ?? {}) } })
    }

    let saved = 0
    let savedStories = 0

    let dailyItems: SocialDayPoint[] = []
    try {
      const sinceMs = conn.last_sync_at
        ? Math.max(
            new Date(conn.last_sync_at).getTime() - 2 * 86_400_000, // solape por zona horaria
            Date.now() - DAILY_HISTORY_DAYS * 86_400_000,
          )
        : Date.now() - DAILY_HISTORY_DAYS * 86_400_000
      dailyItems = await client.getAccountDaily(token, new Date(sinceMs).toISOString())
    } catch (err) {
      if (err instanceof GraphApiError && err.code === 190) {
        await updateConnectionStatus(userId, provider, 'token_expired')
        await logSync(userId, provider, 'sync', 'error', { stage: 'daily', code: 190 })
        return {
          ok: false,
          errorCode: 'token_expired',
          message: 'Instagram revocó el acceso — vuelve a conectar tu cuenta.',
        }
      }
      summary.errors.push(`métricas diarias: ${errMsg(err)}`)
    }

    // ── Stories activas (24 h) con insights ────────────────────────
    let storyItems: SocialMediaSnapshot[] = []
    try {
      storyItems = await client.getActiveStoriesInsights(token)
    } catch (err) {
      summary.errors.push(`stories: ${errMsg(err)}`)
    }

    try {
      if (savedMedia.length > 0) saved = await upsertMedia(userId, provider, savedMedia)
      if (storyItems.length > 0) {
        await upsertMedia(userId, provider, storyItems)
        savedStories = storyItems.length
      }
      if (dailyItems.length > 0) summary.daily = await upsertDailyPoints(userId, provider, dailyItems)
    } catch (err) {
      await logSync(userId, provider, 'sync', 'error', { stage: 'persist', message: errMsg(err) })
      return { ok: false, errorCode: 'internal', message: `No se pudieron guardar los datos: ${errMsg(err)}` }
    }
    summary.media = saved
    summary.stories = savedStories

    await markSynced(userId, provider)
    await logSync(userId, provider, 'sync', 'success', {
      counts: { daily: summary.daily, media: summary.media, stories: summary.stories },
      warnings: summary.errors,
    })
    return { ok: true, summary }
  } catch (err) {
    const message = errMsg(err)
    await logSync(userId, provider, 'sync', 'error', { message })
    return { ok: false, errorCode: 'internal', message }
  }
}