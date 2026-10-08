/**
 * Tipos de la integración Canva REST ("Outside Canva") para BRÄVE Studio.
 *
 * Fuente de verdad: https://www.canva.dev/docs/apps/rest-apis/ (verificado 8-oct-2026):
 * - Base URL: https://api.canva.com/rest/v1 (Authorization: Bearer).
 * - Dataset: GET /designs/{id}/dataset → { dataset: { campo: { type } } }, tipos
 *   text | image | chart | sheet. Sin defaults.
 * - Autofill: POST /autofills con type "create_from_design" (crea design NUEVO,
 *   el original queda intacto). Campos imagen SOLO aceptan asset_id — no URLs.
 * - Exports: POST /exports (format png) → job → urls[] (una por página, 24h).
 */

/** Tipos de campo que puede declarar un dataset de Autofill en Canva. */
export type CanvaFieldType = 'text' | 'image' | 'chart' | 'sheet'

/** Un campo dinámico detectado en el dataset del diseño. */
export interface CanvaDatasetField {
  name: string
  type: CanvaFieldType
}

/** Metadata del diseño que devuelven getDesign (subset que BRÄVE usa). */
export interface CanvaDesign {
  id: string
  title: string
  pageCount: number
  updatedAt: number | null
  canvaEditUrl: string | null
}

/** Dataset completo de un diseño: nombre de campo → tipo. */
export type CanvaDataset = Record<string, CanvaFieldType>

/** Comportamiento BRÄVE asignado a un campo (13 del prompt del producto). */
export type CanvaBindingBehavior =
  | 'user_text'    // texto editable por la usuaria
  | 'ai_text'      // texto adaptado por BRÄVE IA
  | 'brand_text'   // sale de Mi Marca (p. ej. handle de Instagram)
  | 'user_image'   // foto reemplazable por la usuaria
  | 'keep_default' // valor original del diseño (no se envía al autofill)

export interface CanvaBinding {
  behavior: CanvaBindingBehavior
  label?: string
  purpose?: string       // propósito IA (hook, desarrollo, cta...)
  maxLength?: number     // máximo de caracteres para textos
  instructions?: string  // instrucciones IA opcionales
}

/** Mapa campo → comportamiento, el source of truth de bindings en BRÄVE. */
export type CanvaBindingMap = Record<string, CanvaBinding>

/** Conexión Canva del equipo (una por owner admin). */
export interface CanvaConnectionRow {
  id: string
  owner_id: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  expires_at: string
  scopes: string
  status: 'active' | 'token_expired' | 'revoked' | 'error'
  account_metadata: Record<string, unknown> | null
  last_refreshed_at: string | null
  last_error: string | null
}

/** Par de tokens descifrados, SOLO para uso server interno. */
export interface CanvaTokens {
  accessToken: string
  refreshToken: string
}

/** Respuesta del token endpoint de Canva (authorization code / refresh). */
export interface CanvaTokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number
  scope: string
}

/** Estados de un job (autofill o export). */
export type CanvaJobStatus = 'in_progress' | 'success' | 'failed'

/** Error normalizado de la API de Canva. */
export interface CanvaApiError {
  status: number
  code: string
  message: string
}

export class CanvaError extends Error implements CanvaApiError {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}