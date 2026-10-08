import crypto from 'node:crypto'
import { CanvaTokenResponse } from './types'

/**
 * OAuth 2.0 de Canva — Authorization Code flow con PKCE S256 (OBLIGATORIO)
 * + client_secret confidencial (server-only). Verificado contra la doc oficial
 * 8-oct-2026:
 * - authorize:  https://www.canva.com/api/oauth/authorize
 * - token:      https://api.canva.com/rest/v1/oauth/token  (Basic auth o body)
 * - revoke:     https://api.canva.com/rest/v1/oauth/revoke
 * - Refresh token single-use: cada refresh devuelve access + refresh nuevos.
 * - expires_in en segundos (hoy 14400 = 4h). No existe expires_at.
 */

export const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize'
export const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'
export const CANVA_REVOKE_URL = 'https://api.canva.com/rest/v1/oauth/revoke'

/** Scopes mínimos viables para el spike (doc: los media de autofill exigen asset:*, ver assets.ts). */
export const CANVA_SCOPES = [
  'design:meta:read',
  'design:content:read',
  'design:content:write',
  'asset:read',
  'asset:write',
  'profile:read',
].join(' ')

/** Nombres exactos de las variables de entorno que hace falta configurar. */
export interface CanvaEnv {
  clientId: string
  clientSecret: string
  redirectUri: string
}

const DEV_REDIRECT_DEFAULT = 'http://127.0.0.1:3000/api/canva/oauth/callback'

/** Lee las credenciales de Canva del entorno (null si no están configuradas). */
export function getCanvaEnv(): CanvaEnv | null {
  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  const redirectUri = process.env.CANVA_REDIRECT_URI || DEV_REDIRECT_DEFAULT
  return { clientId, clientSecret, redirectUri }
}

export function isCanvaConfigured(): boolean {
  return getCanvaEnv() !== null
}

/** base64url aleatorio seguro (verifier/state). */
export function randomBase64Url(bytes: number): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

/** base64url(sha256(x)) — el code_challenge S256 de Canva. */
export function sha256Base64Url(input: string): string {
  return crypto.createHash('sha256').update(input, 'ascii').digest('base64url')
}

/** Par verifier/challenge PKCE (verifier 43-128 chars ASCII). */
export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBase64Url(64) // 86 chars base64url
  return { verifier, challenge: sha256Base64Url(verifier) }
}

/** URL de autorización completa para redirigir al admin. */
export function buildAuthorizationUrl(args: {
  env: CanvaEnv
  state: string
  codeChallenge: string
}): string {
  const { env, state, codeChallenge } = args
  const params = new URLSearchParams({
    code_challenge: codeChallenge,
    code_challenge_method: 's256',
    scope: CANVA_SCOPES,
    response_type: 'code',
    client_id: env.clientId,
    state,
    // redirect_uri explícito: con 2 URLs registradas (dev/prod) Canva lo exige.
    redirect_uri: env.redirectUri,
  })
  return `${CANVA_AUTH_URL}?${params.toString()}`
}

interface TokenEndpointArgs {
  env: CanvaEnv
  body: Record<string, string>
}

/** Llamada al token endpoint (Basic auth) → respuesta tipada de Canva. */
async function callTokenEndpoint(args: TokenEndpointArgs): Promise<CanvaTokenResponse> {
  const { env, body } = args
  const credentials = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64')
  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
  const json = (await res.json().catch(() => null)) as
    | (CanvaTokenResponse & { error?: string; error_description?: string })
    | null
  if (!res.ok || !json || !json.access_token) {
    throw new Error(
      `Token Canva (${res.status}): ${json?.error ?? 'sin respuesta'} ${json?.error_description ?? ''}`.trim(),
    )
  }
  return json as CanvaTokenResponse
}

/** Intercambia el código del callback por el par de tokens. */
export function exchangeCode(args: {
  env: CanvaEnv
  code: string
  codeVerifier: string
}): Promise<CanvaTokenResponse> {
  return callTokenEndpoint({
    env: args.env,
    body: {
      grant_type: 'authorization_code',
      code: args.code,
      code_verifier: args.codeVerifier,
      redirect_uri: args.env.redirectUri,
    },
  })
}

/** Refresh (single-use): devuelve access + refresh tokens nuevos. */
export function refreshAccessToken(args: {
  env: CanvaEnv
  refreshToken: string
}): Promise<CanvaTokenResponse> {
  return callTokenEndpoint({
    env: args.env,
    body: { grant_type: 'refresh_token', refresh_token: args.refreshToken },
  })
}

/**
 * Extrae el Design ID de una referencia Canva: acepta el ID pelado
 * ("DAFvZtcvd9z") o URLs tipo https://www.canva.com/design/DAF.../edit
 */
export function parseDesignRef(ref: string): string | null {
  const value = ref.trim()
  if (!value) return null
  const idMatch = value.match(/^DA[A-Za-z0-9_-]{5,}$/)
  if (idMatch) return idMatch[0]
  const urlMatch = value.match(/canva\.com\/(?:designs?\/)?(DA[A-Za-z0-9_-]{5,})/)
  if (urlMatch) return urlMatch[1]
  return null
}