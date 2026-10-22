/**
 * ANÁLISIS DE PERFIL · orquestador server (22-oct-2026).
 * perfil fresco (bio, nombre, seguidores) + últimas 30 publicaciones ya
 * sincronizadas → números (profile-stats) → consejos IA → se guarda en
 * social_diagnoses (una fila por usuaria) para no regenerar en cada visita.
 */
import { decryptSecret } from '@/lib/crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { callLLM, isServerAIConfigured } from '@/lib/ai/llm'
import { extractJSON } from '@/lib/ai/extract'
import { buildBrandContextForUser } from '@/lib/team/api-helpers'
import { buildProfileAnalysisPrompt, parseProfileAdvice, type ProfileAdvice } from '@/lib/ai/prompts/profile-analysis'
import { GraphApiError, InstagramProviderClient } from './instagram'
import { computeProfileStats, type ProfileStats, type StatsMediaInput } from './profile-stats'
import { getRecentMedia, updateConnectionStatus } from './repo'
import { runSync } from './sync'
import type { SocialConnectionRow } from '@/types/database'

export interface ProfileReport {
  version: 1
  generatedAt: string
  /** true = ejemplo con datos de muestra (modo demo), nunca datos reales. */
  demo?: boolean
  profile: {
    username: string | null
    name: string | null
    biography: string | null
    bioAvailable: boolean
    avatarUrl: string | null
    followers: number | null
    mediaCount: number | null
  }
  stats: ProfileStats
  /** null = la IA no estaba disponible: el informe trae solo los números. */
  advice: ProfileAdvice | null
  /** Avisos honestos (qué no se ha podido leer o calcular). */
  missing: string[]
}

export type AnalysisResult =
  | { ok: true; report: ProfileReport }
  | { ok: false; error: 'not_connected' | 'token_expired' | 'no_posts' | 'internal'; message: string }

export async function getSavedReport(userId: string): Promise<ProfileReport | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('social_diagnoses')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle()
  const payload = (data as { payload: unknown } | null)?.payload as ProfileReport | null
  return payload && payload.version === 1 ? payload : null
}

export async function generateProfileReport(
  userId: string,
  opts: { bioOverride?: string | null } = {},
): Promise<AnalysisResult> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('social_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'instagram')
    .maybeSingle()
  const conn = (data as SocialConnectionRow | null) ?? null
  if (!conn) return { ok: false, error: 'not_connected', message: 'Conecta tu Instagram primero.' }
  if (conn.status === 'token_expired' || conn.status === 'revoked') {
    return { ok: false, error: 'token_expired', message: 'El acceso de Instagram caducó — vuelve a conectar tu cuenta.' }
  }

  let token: string
  try {
    token = decryptSecret(conn.access_token_encrypted)
  } catch {
    return { ok: false, error: 'internal', message: 'No se pudo leer el acceso a tu cuenta — vuelve a conectar Instagram.' }
  }

  const client = new InstagramProviderClient()
  let details
  try {
    details = await client.getProfileDetails(token)
  } catch (err) {
    if (err instanceof GraphApiError && err.code === 190) {
      await updateConnectionStatus(userId, 'instagram', 'token_expired')
      return { ok: false, error: 'token_expired', message: 'El acceso de Instagram caducó — vuelve a conectar tu cuenta.' }
    }
    return { ok: false, error: 'internal', message: 'Instagram no respondió al leer tu perfil — inténtalo en unos minutos.' }
  }

  // Sin publicaciones guardadas aún (recién conectada) → primera sync ahora.
  let media = await getRecentMedia(userId, 'instagram', 80)
  if (media.length === 0) {
    const sync = await runSync(userId, 'instagram')
    if (!sync.ok && sync.errorCode === 'token_expired') {
      return { ok: false, error: 'token_expired', message: 'El acceso de Instagram caducó — vuelve a conectar tu cuenta.' }
    }
    media = await getRecentMedia(userId, 'instagram', 80)
  }

  const bioOverride = opts.bioOverride?.trim() || null
  const profileInput = {
    username: details.username,
    name: details.name,
    biography: bioOverride ?? details.biography,
    followers: details.followers,
    mediaCount: details.mediaCount,
  }
  const stats = computeProfileStats(profileInput, media as unknown as StatsMediaInput[])
  if (stats.postsAnalyzed === 0) {
    return { ok: false, error: 'no_posts', message: 'No hemos encontrado publicaciones en tu feed para analizar.' }
  }

  const missing = [...stats.notes]
  if (!details.bioAvailable && !bioOverride) {
    missing.push('Instagram no nos deja leer tu bio con este permiso: pégala abajo para que te propongamos versiones mejores.')
  }

  let advice: ProfileAdvice | null = null
  if (isServerAIConfigured()) {
    try {
      const brand = await buildBrandContextForUser(userId).catch(() => null)
      const { content } = await callLLM({
        prompt: buildProfileAnalysisPrompt(profileInput, stats, brand),
        temperature: 0.6,
        maxTokens: 2500,
        timeoutMs: 90_000,
      })
      advice = parseProfileAdvice(extractJSON(content))
    } catch (err) {
      console.error('[social/analysis] IA', err)
    }
  }
  if (!advice) missing.push('Los consejos escritos no se han podido generar ahora; los números sí son reales. Prueba «Analizar de nuevo» en un rato.')

  const report: ProfileReport = {
    version: 1,
    generatedAt: new Date().toISOString(),
    profile: {
      username: details.username,
      name: details.name,
      biography: bioOverride ?? details.biography,
      bioAvailable: details.bioAvailable || !!bioOverride,
      avatarUrl: details.avatarUrl,
      followers: details.followers,
      mediaCount: details.mediaCount,
    },
    stats,
    advice,
    missing,
  }

  await admin
    .from('social_diagnoses')
    .upsert(
      { user_id: userId, provider: 'instagram', payload: report as unknown as Record<string, unknown>, generated_at: report.generatedAt },
      { onConflict: 'user_id' },
    )

  return { ok: true, report }
}
