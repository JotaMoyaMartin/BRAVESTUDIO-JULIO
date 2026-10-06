import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret, isSocialCryptoConfigured } from '@/lib/crypto'
import { isInstagramConfigured } from './instagram'
import type {
  SocialConnectInfo,
  SocialConnectionStatus,
  SocialDayPoint,
  SocialMediaSnapshot,
  SocialProvider,
} from './types'
import type {
  SocialConnectionRow,
  SocialMediaRow,
  SocialMetricsDailyRow,
} from '@/types/database'

/**
 * Acceso a datos sociales — SOLO server. Todas las escrituras usan el
 * admin client: el token cifrado nunca viaja por la sesión de RLS y el
 * `userId` SIEMPRE viene de la sesión ya validada en la API route.
 */

export type SocialConnectState =
  | { connected: true; info: SocialConnectInfo; needsReauth: boolean }
  | { connected: false; info: null; needsReauth: false }

/** true si la red está lista: credenciales de IG + clave de cifrado. */
export function isSocialProviderReady(): boolean {
  return isInstagramConfigured() && isSocialCryptoConfigured()
}

function toInfo(
  row: SocialConnectionRow | null,
  provider: SocialProvider,
): SocialConnectInfo | null {
  if (!row) return null
  return {
    provider,
    username: row.username,
    accountType: row.account_type,
    status: row.status as SocialConnectionStatus,
    lastSyncAt: row.last_sync_at,
    connectedAt: row.created_at,
    configured: isSocialProviderReady(),
  }
}

export async function getConnectInfo(
  userId: string,
  provider: SocialProvider,
): Promise<SocialConnectState> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('social_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()
  const row = (data as SocialConnectionRow | null) ?? null
  if (!row) return { connected: false, info: null, needsReauth: false }
  const info = toInfo(row, provider)
  if (!info) return { connected: false, info: null, needsReauth: false }
  return {
    connected: true,
    needsReauth: info.status === 'token_expired' || info.status === 'revoked',
    info,
  }
}

export interface SaveConnectionInput {
  providerAccountId: string
  accessToken: string
  expiresInSeconds?: number | null
  scopes?: string[]
  username?: string | null
  accountType?: string | null
  avatarUrl?: string | null
}

/** Upsert por (user_id, provider) — token SIEMPRE cifrado, status active. */
export async function saveConnection(
  userId: string,
  provider: SocialProvider,
  input: SaveConnectionInput,
): Promise<void> {
  const tokenExpiresAt =
    input.expiresInSeconds && input.expiresInSeconds > 0
      ? new Date(Date.now() + input.expiresInSeconds * 1000).toISOString()
      : null
  const admin = createAdminClient()
  const { error } = await admin
    .from('social_connections')
    .upsert(
      {
        user_id: userId,
        provider,
        provider_account_id: input.providerAccountId,
        username: input.username ?? null,
        account_type: input.accountType ?? null,
        avatar_url: input.avatarUrl ?? null,
        access_token_encrypted: encryptSecret(input.accessToken),
        token_expires_at: tokenExpiresAt,
        scopes: input.scopes ?? [],
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    )
  if (error) throw new Error(`No se pudo guardar la conexión social: ${error.message}`)
}

/** Solo token: rotación en el refresco — sin tocar username/avatar/status. */
export async function updateToken(
  userId: string,
  provider: SocialProvider,
  accessToken: string,
  expiresInSeconds: number | null,
): Promise<void> {
  const tokenExpiresAt =
    expiresInSeconds && expiresInSeconds > 0
      ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      : null
  const admin = createAdminClient()
  await admin
    .from('social_connections')
    .update({
      access_token_encrypted: encryptSecret(accessToken),
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', provider)
}

export async function updateConnectionStatus(
  userId: string,
  provider: SocialProvider,
  status: SocialConnectionStatus,
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('social_connections')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', provider)
}

export async function markSynced(userId: string, provider: SocialProvider): Promise<void> {
  const now = new Date().toISOString()
  const admin = createAdminClient()
  await admin
    .from('social_connections')
    .update({ last_sync_at: now, updated_at: now })
    .eq('user_id', userId)
    .eq('provider', provider)
}

/** Refresco de username/avatar tras getProfile (no crea conexión). */
export async function updateConnectionProfile(
  userId: string,
  provider: SocialProvider,
  fields: { username?: string | null; accountType?: string | null; avatarUrl?: string | null },
): Promise<void> {
  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() }
  if (fields.username !== undefined) patch.username = fields.username
  if (fields.accountType !== undefined) patch.account_type = fields.accountType
  if (fields.avatarUrl !== undefined) patch.avatar_url = fields.avatarUrl
  const admin = createAdminClient()
  await admin.from('social_connections').update(patch).eq('user_id', userId).eq('provider', provider)
}

/**
 * Desconectar = borrar la conexión Y TODOS los datos sociales de esa
 * usuaria (media, métricas diarias, log Y diagnóstico). Sin vuelta atrás.
 */
export async function deleteConnectionAndData(
  userId: string,
  provider: SocialProvider,
): Promise<void> {
  const admin = createAdminClient()
  await Promise.all([
    admin.from('social_media').delete().eq('user_id', userId).eq('provider', provider),
    admin.from('social_metrics_daily').delete().eq('user_id', userId).eq('provider', provider),
    admin.from('social_sync_log').delete().eq('user_id', userId).eq('provider', provider),
    admin.from('social_diagnoses').delete().eq('user_id', userId).eq('provider', provider),
    admin.from('social_connections').delete().eq('user_id', userId).eq('provider', provider),
  ])
}

// ─── Datos ───────────────────────────────────────────────────────────

export async function upsertDailyPoints(
  userId: string,
  provider: SocialProvider,
  points: SocialDayPoint[],
): Promise<number> {
  if (points.length === 0) return 0
  const rows = points.map(p => ({
    user_id: userId,
    provider,
    date: p.date,
    followers: p.followers,
    reach: p.reach,
    views: p.views,
    total_interactions: p.totalInteractions,
    accounts_engaged: p.accountsEngaged,
    follows: p.follows,
    unfollows: p.unfollows,
    profile_links_taps: p.profileLinksTaps,
    raw: null,
  }))
  const admin = createAdminClient()
  const { error } = await admin
    .from('social_metrics_daily')
    .upsert(rows, { onConflict: 'user_id,provider,date' })
  if (error) throw new Error(`No se pudieron guardar las métricas diarias: ${error.message}`)
  return rows.length
}

export async function upsertMedia(
  userId: string,
  provider: SocialProvider,
  items: SocialMediaSnapshot[],
): Promise<number> {
  if (items.length === 0) return 0
  const fetchedAt = new Date().toISOString()
  const rows = items.map(m => ({
    user_id: userId,
    provider,
    media_id: m.providerMediaId,
    media_type: m.mediaType ?? null,
    media_product_type: m.mediaProductType ?? null,
    caption: m.caption ?? null,
    posted_at: m.postedAt ?? null,
    permalink: m.permalink ?? null,
    thumbnail_url: m.thumbnailUrl ?? null,
    metrics: (m.metrics ?? {}) as Record<string, unknown>,
    fetched_at: fetchedAt,
  }))
  const admin = createAdminClient()
  const { error } = await admin
    .from('social_media')
    .upsert(rows, { onConflict: 'user_id,provider,media_id' })
  if (error) throw new Error(`No se pudieron guardar los contenidos sociales: ${error.message}`)
  return rows.length
}

export async function getRecentMedia(
  userId: string,
  provider: SocialProvider,
  limit = 50,
): Promise<SocialMediaRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('social_media')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  return (data as SocialMediaRow[]) ?? []
}

export async function getDaily(
  userId: string,
  provider: SocialProvider,
  days = 30,
): Promise<SocialMetricsDailyRow[]> {
  const sinceDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  const admin = createAdminClient()
  const { data } = await admin
    .from('social_metrics_daily')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .gte('date', sinceDate)
    .order('date', { ascending: true })
  return (data as SocialMetricsDailyRow[]) ?? []
}

/** Contadores para la UI de /analisis (piezas y días de historial). */
export async function getConnectionCounts(
  userId: string,
  provider: SocialProvider,
): Promise<{ media: number; dailyDays: number }> {
  const admin = createAdminClient()
  const [mediaRes, dailyRes] = await Promise.all([
    admin
      .from('social_media')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('provider', provider),
    admin
      .from('social_metrics_daily')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('provider', provider),
  ])
  return { media: mediaRes.count ?? 0, dailyDays: dailyRes.count ?? 0 }
}

// ─── Log ─────────────────────────────────────────────────────────────

export async function logSync(
  userId: string,
  provider: SocialProvider,
  kind: string,
  result: string,
  error?: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient()
  await admin.from('social_sync_log').insert({
    user_id: userId,
    provider,
    kind,
    result,
    error: error ?? null,
  })
}

/** Filas de conexión activas de un provider (para el cron). */
export async function listActiveConnections(
  provider: SocialProvider,
): Promise<{ userId: string; status: string }[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('social_connections')
    .select('user_id, status')
    .eq('provider', provider)
    .eq('status', 'active')
  return ((data as { user_id: string; status: string }[]) ?? []).map(r => ({
    userId: r.user_id,
    status: r.status,
  }))
}