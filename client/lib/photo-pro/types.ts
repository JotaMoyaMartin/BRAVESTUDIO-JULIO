/**
 * FOTO PRO — Retoque Pro · tipos compartidos (puro, sin side effects).
 *
 * La edición fotográfica va sobre la foto ORIGINAL: conservamos identidad,
 * pose, ropa, encuadre y resultado del trabajo de peluquería. Los presets
 * (presets/) traducen modo + intensidad a instrucciones para el
 * ImageEditProvider (provider.ts, server-only).
 */

export type PhotoMode = 'face' | 'hair' | 'background' | 'general'

export type PhotoJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

/** El contexto es opcional a propósito: la edición no necesita copy de marca. */
export interface EditContext {
  /** Notas libres del preset (p. ej. microcopy elegido) para depuración. */
  modeLabel?: string
  intensityLabel?: string
}

/** Instrucciones estructuradas que produce cada preset. */
export interface EditInstructions {
  /** Qué mejorar, en lenguaje natural directo al proveedor de edición. */
  goal: string
  /** Lo que NUNCA debe cambiar (identidad, técnica de color, escena…). */
  preserve: string[]
  /** Prohibiciones concretas (nada de pele plástica, nada de peluca…). */
  avoid: string[]
}

export interface EditRequest {
  /** Imagen fuente en base64 (sin prefijo data:) */
  sourceBase64: string
  sourceMime: string
  instructions: EditInstructions
  mode: PhotoMode
  intensity: number
  metadata?: EditContext
}

/** El proveedor devuelve SIEMPRE bytes de imagen listos para guardar. */
export interface ImageEditResult {
  /** base64 de la imagen resultante */
  resultBase64: string
  mime: string
  /** Modelo/proveedor usado, para el registro del job. */
  model: string
}

/** Error del proveedor de edición con código estable para la UX. */
export type ProviderEditErrorCode =
  | 'provider_not_configured'
  | 'provider_timeout'
  | 'provider_error'
  | 'no_image_returned'
  | 'source_unreadable'
  | 'db_error'

export class ProviderEditError extends Error {
  code: ProviderEditErrorCode

  constructor(code: ProviderEditError['code'], message?: string) {
    super(message || code)
    this.name = 'ProviderEditError'
    this.code = code
  }
}

/** Contrato único de proveedor — sustituir proveedor sin tocar Retoque Pro. */
export interface ImageEditProvider {
  id: string
  editImage(req: EditRequest): Promise<ImageEditResult>
}