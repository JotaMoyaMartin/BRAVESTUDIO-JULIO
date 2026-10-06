import type {
  SocialDayPoint,
  SocialExchangeResult,
  SocialMediaMetrics,
  SocialMediaSnapshot,
  SocialProfile,
  SocialProvider,
  SocialRefreshResult,
} from './types'
import { InstagramProviderClient } from './instagram'

/**
 * Contrato que implementará el cliente de cada red social. La capa de
 * sync (lib/social/sync.ts) y las API routes solo conocen esta interfaz:
 * añadir TikTok/Google Business en el futuro = nueva implementación,
 * sin tocar sync ni rutas.
 */
export interface SocialProviderClient {
  /** Canjea `code` del OAuth por un token long-lived. */
  exchangeCode(code: string, redirectUri: string): Promise<SocialExchangeResult>

  /**
   * Perfil actual de la cuenta. `igUserId` = la cuenta concreta a consultar
   * (para proveedores con token multi-cuenta; el cliente IG puede ignorarlo).
   */
  getProfile(token: string, igUserId?: string): Promise<SocialProfile>

  /** Renueva el token long-lived (IG: +60 días por llamada). */
  refreshToken(token: string): Promise<SocialRefreshResult>

  /** Piezas recientes del feed (sin insights por pieza). */
  listRecentMedia(token: string, limit?: number, igUserId?: string): Promise<SocialMediaSnapshot[]>

  /**
   * Insights de UNA pieza. Devuelve null si la red no expone métricas
   * (p. ej. carrusel en IG) o si la métrica no alcanza el mínimo
   * (< 5 cuentas alcanzadas → error code 10, no es un fallo real).
   */
  getMediaInsights(
    token: string,
    mediaId: string,
    mediaProductType?: string | null,
  ): Promise<Partial<SocialMediaMetrics> | null>

  /** Series diarias de la cuenta desde `sinceISO` (inclusive). */
  getAccountDaily(token: string, sinceISO: string, igUserId?: string): Promise<SocialDayPoint[]>

  /** Stories activas (24 h) con sus insights. Vacío si no hay. */
  getActiveStoriesInsights(token: string, igUserId?: string): Promise<SocialMediaSnapshot[]>
}

/**
 * Fábrica de clientes por red. Solo Instagram está implementado en Fase 1
 * — tiktok y google_business quedan TODO para fases siguientes (devuelven
 * null y las rutas responden con un error claro).
 */
export function getSocialProvider(provider: SocialProvider): SocialProviderClient | null {
  switch (provider) {
    case 'instagram':
      return new InstagramProviderClient()
    case 'tiktok':
    case 'google_business':
      // TODO (F3): TikTok Business API / Google Business Profile API.
      return null
    default:
      return null
  }
}