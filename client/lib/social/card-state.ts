/**
 * Estado de la tarjeta «Tu Instagram» (Inicio y Mi Marca) — SOLO server.
 * Si algo falla, devuelve 'preparing' y la tarjeta no se pinta: nunca rompe
 * la página que la usa.
 */
import { getConnectInfo, isSocialProviderReady } from './repo'
import { getSavedReport } from './analysis'
import { FORMAT_LABEL } from './profile-stats'
import { showInstagram } from '@/lib/features'
import type { InstagramHomeState, InstagramHomeSummary } from '@/components/home/InstagramHomeCard'

export interface InstagramCardProps {
  state: InstagramHomeState
  username?: string | null
  summary?: InstagramHomeSummary | null
}

export async function getInstagramCardState(userId: string): Promise<InstagramCardProps> {
  // Oculto hasta que Meta apruebe la app: sin tarjeta en Inicio ni Mi Marca.
  if (!showInstagram()) return { state: 'preparing' }
  try {
    if (!isSocialProviderReady()) return { state: 'preparing' }
    const conn = await getConnectInfo(userId, 'instagram')
    if (!conn.connected) return { state: 'disconnected' }
    if (conn.needsReauth) return { state: 'expired', username: conn.info.username }
    const report = await getSavedReport(userId)
    return {
      state: 'connected',
      username: conn.info.username,
      summary: report
        ? {
            followers: report.profile.followers,
            postsPerWeek: report.stats.postsPerWeek,
            bestFormat: report.stats.bestFormat ? FORMAT_LABEL[report.stats.bestFormat] : null,
            tip: report.advice?.que_mejorar[0] ?? null,
          }
        : null,
    }
  } catch {
    return { state: 'preparing' }
  }
}
