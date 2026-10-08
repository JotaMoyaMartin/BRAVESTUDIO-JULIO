import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import {
  getCanvaEnv,
  refreshAccessToken,
} from './auth'
import { CanvaConnectionRow, CanvaTokenResponse, CanvaTokens } from './types'

/**
 * Almacenamiento server-only de la conexión Canva. Tokens SIEMPRE cifrados
 * (AES-256-GCM, lib/crypto.ts) en canva_connections; jamás al browser.
 * Escrituras con el cliente service_role (RLS sin policies = solo server).
 */

const REFRESH_MARGIN_MS = 120_000 // refrescar con 2 minutos de margen

/** Última conexión activa del owner (admin client, una por owner). */
export async function getConnectionRow(ownerId: string): Promise<CanvaConnectionRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('canva_connections')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    // Tabla sin crear (SQL pendiente) → mensaje accionable, no 500 ciego.
    if (error.code === 'PGRST205' || error.code === 'PGRST202') {
      throw new Error('Falta la tabla canva_connections — pega SQL-CANVA-SPIKE.sql en Supabase.')
    }
    throw new Error(`No se pudo leer la conexión Canva: ${error.message}`)
  }
  return (data as unknown as CanvaConnectionRow) || null
}

/** Guarda (reemplazando) la conexión tras el OAuth exchange. */
export async function saveNewConnection(args: {
  ownerId: string
  tokenRes: CanvaTokenResponse
  accountMetadata?: Record<string, unknown> | null
}): Promise<void> {
  const admin = createAdminClient()
  const expiresAt = new Date(Date.now() + args.tokenRes.expires_in * 1000).toISOString()
  const upsert = {
    owner_id: args.ownerId,
    access_token_encrypted: encryptSecret(args.tokenRes.access_token),
    refresh_token_encrypted: encryptSecret(args.tokenRes.refresh_token),
    expires_at: expiresAt,
    scopes: args.tokenRes.scope,
    status: 'active' as const,
    account_metadata: args.accountMetadata ?? null,
    last_refreshed_at: new Date().toISOString(),
    last_error: null,
  }
  await admin.from('canva_connections').delete().eq('owner_id', args.ownerId)
  const { error } = await admin.from('canva_connections').insert(upsert)
  if (error) throw new Error(`No se pudo guardar la conexión Canva: ${error.message}`)
}

/**
 * Token de acceso SIEMPRE fresco: descifra, refresca si expira pronto y
 * persiste el par nuevo (refresh token es single-use en Canva).
 */
export async function ensureFreshToken(ownerId: string): Promise<CanvaTokens> {
  const row = await getConnectionRow(ownerId)
  if (!row) throw new Error('No hay conexión Canva — conecta la cuenta en /admin/canva-test.')
  if (row.status === 'revoked') throw new Error('La conexión Canva fue revocada — vuelve a conectarla.')

  const env = getCanvaEnv()
  if (!env) throw new Error('Falta CANVA_CLIENT_ID / CANVA_CLIENT_SECRET en el servidor.')
  let accessToken = ''
  try {
    accessToken = decryptSecret(row.access_token_encrypted)
  } catch {
    throw new Error('El token de Canva no se pudo descifrar — revisa SOCIAL_TOKEN_SECRET.')
  }

  const expiresAtMs = new Date(row.expires_at).getTime()
  if (expiresAtMs - REFRESH_MARGIN_MS <= Date.now()) {
    const refreshToken = decryptSecret(row.refresh_token_encrypted)
    const renewed = await refreshAccessToken({ env, refreshToken })
    await saveNewConnection({ ownerId, tokenRes: renewed })
    return { accessToken: renewed.access_token, refreshToken: renewed.refresh_token }
  }
  return { accessToken, refreshToken: '' }
}

/** Desconecta: revoke en Canva (best-effort) + borrado de la fila. */
export async function disconnectConnection(ownerId: string): Promise<void> {
  const row = await getConnectionRow(ownerId)
  if (row) {
    try {
      const env = getCanvaEnv()
      if (env) {
        const accessToken = decryptSecret(row.access_token_encrypted)
        await fetch('https://api.canva.com/rest/v1/oauth/revoke', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token: accessToken }).toString(),
        })
      }
    } catch {
      // Revoke best-effort: aun así borrada en BRÄVE.
    }
    const admin = createAdminClient()
    await admin.from('canva_connections').delete().eq('owner_id', ownerId)
  }
}

/** Marca la conexión con error (p. ej. refresh_token inválido). */
export async function markConnectionError(ownerId: string, message: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('canva_connections')
    .update({ status: 'error', last_error: message.slice(0, 500) })
    .eq('owner_id', ownerId)
}