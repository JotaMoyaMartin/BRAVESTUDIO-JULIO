/**
 * Tipos compartidos de la capa social (Fase 1 — Fase 3 añade el motor
 * de diagnóstico, no estos tipos).
 */

export type SocialProvider = 'instagram' | 'tiktok' | 'google_business'

export type SocialConnectionStatus = 'active' | 'token_expired' | 'revoked' | 'error'

/** Info de conexión que llega a la UI — JAMÁS incluye el token. */
export interface SocialConnectInfo {
  provider: SocialProvider
  username: string | null
  accountType: string | null
  status: SocialConnectionStatus
  lastSyncAt: string | null
  connectedAt: string | null
  /** Credenciales de la app presentes (appId/secret/clave de cifrado). */
  configured: boolean
}

/** Punto diario de métricas de cuenta (huecos → null en ese campo). */
export interface SocialDayPoint {
  date: string
  followers: number | null
  reach: number | null
  views: number | null
  totalInteractions: number | null
  accountsEngaged: number | null
  follows: number | null
  unfollows: number | null
  profileLinksTaps: number | null
}

export interface SocialMediaMetrics {
  reach?: number
  views?: number
  likes?: number
  comments?: number
  saved?: number
  shares?: number
  totalInteractions?: number
  /** Media de tiempo de visionado del reel en ms (IG: ig_reels_avg_watch_time). */
  avgWatchTimeMs?: number
}

/** Snapshot de una pieza (feed o story) normalizada desde la Graph API. */
export interface SocialMediaSnapshot {
  providerMediaId: string
  mediaType: string | null
  mediaProductType: string | null
  caption?: string | null
  postedAt?: string | null
  permalink?: string | null
  thumbnailUrl?: string | null
  metrics?: SocialMediaMetrics
}

/** Resultado de una sincronización (lo que muestran sync route y cron). */
export interface SocialSyncSummary {
  daily: number
  media: number
  stories: number
  errors: string[]
}

/** Perfil de cuenta que devuelve getProfile(token). */
export interface SocialProfile {
  providerAccountId: string
  username: string | null
  accountType: string | null
  avatarUrl: string | null
  followers: number | null
}

/**
 * Página de Facebook autorizada tras el login (Facebook Login for Business).
 * Es el ancla de la API con Login de Instagram no existe: la cuenta de IG
 * profesional se localiza como `instagram_business_account` de una Página.
 */
export interface SocialResolvedPage {
  pageId: string
  pageName: string | null
  /** Page access token derivado del user token long-lived — no caduca. */
  pageToken: string
  instagram: {
    id: string
    username: string | null
    accountType: string | null
    avatarUrl: string | null
    followers: number | null
  } | null
}

/**
 * Resultado de exchangeCode. Para el flujo de Facebook el token es el
 * long-lived de USUARIO — el que se guarda realmente (el de Página, que
 * no caduca) se elige del array `pages` en el callback.
 */
export interface SocialExchangeResult {
  accessToken: string
  providerAccountId: string
  /** Vida útil del long-lived token en segundos (null si no la informa). */
  expiresInSeconds: number | null
  scopes: string[]
  /** Páginas autorizadas con su cuenta IG profesional, si la hay. */
  pages?: SocialResolvedPage[]
}

export interface SocialRefreshResult {
  accessToken: string
  expiresInSeconds: number | null
}