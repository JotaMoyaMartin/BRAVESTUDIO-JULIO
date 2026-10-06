// Helpers puros de la cámara de Foto Inspo (estilo cámara nativa).
// Cero DOM aquí: todo número/cadena dentro → rect, zoom o clasificación.
// El pipeline real vive en `components/foto-inspo/useInspoCamera.ts`, que
// reutiliza los helpers ya probados del teleprompter (coverCrop, etc.). Ver
// ARCHITECTURE §5.8.

import { coverCrop } from '@/components/teleprompter/useCameraRecorder'

// ── Lentes (0.5 / 1 / 2 de la cámara nativa) ─────────────────────

export type LensFactor = 0.5 | 1 | 2

export interface InspoLens {
  id: string // deviceId del MediaDeviceInfo
  label: string
  factor: LensFactor
}

/**
 * Clasifica el label de un device en el equivalente de la cámara nativa.
 * Devuelve null cuando no se puede asegurar (labels vacíos de Firefox,
 * ids opacos tipo "camera2 0, facing back") — el llamador NO lista chips
 * para devices sin clasificar: mejor pocos chips seguros que chips mentirosos.
 */
export function classifyLens(label: string): LensFactor | null {
  const l = (label || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
  // Quitamos los decimales ("0.5x", "0,45") antes de buscar "Nx" para que
  // el "5x" de "0.5x" no se confunda con un tele. Se comprueban por orden:
  // ultra → tele → wide ("Back Ultra Wide" pega en wide si no van en orden).
  // "Gran angular" a secas es la PRINCIPAL (así la llama Samsung); la ultra
  // es "super/ultra gran angular".
  if (/ultra|super\s*wide|super\s*gran|fisheye|ojo\s*de\s*pez/.test(l) || /0[.,](45|5|6)(\D|$)/.test(l)) return 0.5
  const clean = l.replace(/\d+[.,]\d+x?/g, ' ')
  // El "Nx" entero se busca solo en clean: en "0.7x" el "7x" pegaría por
  // word-boundary (el punto no es word char) y clasificaría mal un ultra.
  if (/tele|periscop|teleobj|telefoto|2[.,]5x/.test(l) || /\b[2-9]x\b/.test(clean)) return 2
  // "facing back" es posición, NO focal → sin info (labels genéricos de
  // samsung/chrome, donde todas las traseras comparten ese texto). El token
  // focal real (ultra/tele/wide) ya se resolvió arriba.
  if (/\bfacing\b/.test(l)) return null
  if (/(^|[^\d])1x(\D|$)/.test(clean) || /wide|gran\s*angular|principal|back|trasera|camara/.test(l)) return 1
  return null
}

/**
 * De MediaDeviceInfo[] → chips "0.5 | 1 | 2". Solo traseras clasificables,
 * deduplicadas por factor (algunos Android etiquetan igual a todas sus
 * cámaras traseras: colapsan a una → los chips se ocultan solos).
 * En iPhone (1 trasera) y Firefox (labels vacíos) devuelve ≤1.
 */
export function listBackLenses(devices: { kind?: unknown; deviceId?: string; label?: string }[]): InspoLens[] {
  const byFactor = new Map<LensFactor, InspoLens>()
  for (const d of devices) {
    if (!d || !d.deviceId || !d.label) continue
    const l = d.label.toLowerCase()
    if (/front|frontal|\buser\b/.test(l)) continue // la frontal no es una lente trasera
    const factor = classifyLens(d.label)
    if (factor === null || byFactor.has(factor)) continue
    byFactor.set(factor, { id: d.deviceId, label: d.label, factor })
  }
  return [...byFactor.values()].sort((a, b) => a.factor - b.factor)
}

// ── Zoom digital + pinch ─────────────────────────────────────────

export const ZOOM_MAX = 4
export const PHOTO_JPEG_QUALITY = 0.95

export type ZoomMode = 'none' | 'constraint' | 'digital'
export interface ZoomRange {
  min: number
  max: number
}
export type InspoQuality = 'hd' | 'uhd'

/**
 * Rect fuente ÚNICO que compone zoom digital × cover-crop sobre el frame
 * crudo, con el aspecto del target (9:16 en foto, canvas de grabación en
 * vídeo). Partimos del cover-rect que rellenaría el target y lo encojemos
 * ×1/zoom alrededor de su centro — en preview el equivalente es
 * `transform: scale(zoom)` sobre el <video> con object-cover, así lo que se
 * ve es exactamente la región que se guarda (zoom 1 bit-idéntico a coverCrop).
 */
export function zoomedCoverRect(
  vw: number,
  vh: number,
  targetW: number,
  targetH: number,
  zoom: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const base = coverCrop(vw, vh, targetW, targetH)
  const z = clampZoom(zoom)
  const sw = base.sw / z
  const sh = base.sh / z
  return {
    sx: base.sx + (base.sw - sw) / 2,
    sy: base.sy + (base.sh - sh) / 2,
    sw,
    sh,
  }
}

export function clampZoom(zoom: number, max: number = ZOOM_MAX): number {
  return Math.min(Math.max(zoom, 1), max)
}

export interface PointerPoint {
  x: number
  y: number
}

export function pointerDistance(a: PointerPoint, b: PointerPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Dos punteros vivos (Pointer Events sobre el visor). Distancias ≤8px
 *  (dedos casi solapados) no mueven el zoom: en móvil son ruido. */
export function pinchToZoom(prevDist: number, nextDist: number, currentZoom: number, max: number = ZOOM_MAX): number {
  if (!(prevDist > 8) || !(nextDist > 8)) return currentZoom
  return clampZoom(currentZoom * (nextDist / prevDist), max)
}

export function isDoubleTap(nowMs: number, lastTapMs: number, gapMs = 300): boolean {
  if (lastTapMs <= 0) return false
  return nowMs - lastTapMs <= gapMs
}

// ── Capabilities del track (zoom constraint + torch) ─────────────
// El lib.dom instalado no declara zoom/torch en MediaTrackCapabilities —
// extensión local (real en Android Chrome/Firefox, ausente en iOS Safari).

export type TrackCapabilitiesZoom = MediaTrackCapabilities & {
  zoom?: { min?: number; max?: number }
  torch?: boolean
}

/** Rango REAL de zoom del track, o null si no lo soporta (iOS). */
export function readZoomRange(caps: TrackCapabilitiesZoom | undefined | null): ZoomRange | null {
  const z = caps?.zoom
  if (!z || typeof z.min !== 'number' || typeof z.max !== 'number' || !(z.max > z.min)) return null
  return { min: z.min, max: z.max }
}

/** Zoom máximo de UI (factor) que permite un rango de constraint.
 *  Samsung usa rangos porcentuales (100–400): el factor = max/min. */
export function zoomMaxFromRange(range: ZoomRange, hard: number = 8): number {
  const raw = range.min > 2 ? range.max / range.min : range.max
  return Math.max(1, Math.min(raw || 1, hard))
}

/** UI (1..max) → valor físico del constraint. Rangos porcentuales (min>2):
 *  value = min × factor; rangos tipo factor (min 1): value = factor. */
export function mapUiZoomToConstraint(zoom: number, range: ZoomRange): number {
  const value = range.min > 2 ? range.min * clampZoom(zoom, zoomMaxFromRange(range)) : zoom
  return Math.min(Math.max(value, range.min), range.max)
}

/** settings.zoom del track (si existe) → factor de UI equivalente. */
export function uiZoomFromSettings(settingsZoom: number | undefined | null, range: ZoomRange | null): number | null {
  if (!settingsZoom || settingsZoom <= 0 || !range) return null
  const maxUi = zoomMaxFromRange(range)
  const ui = range.min > 2 ? settingsZoom / range.min : settingsZoom
  return Math.min(Math.max(ui, 1), maxUi)
}

// ── Detección de entorno (SSR-safe) ──────────────────────────────

/** ¿Pantalla táctil? El botón "Cámara nativa" solo ahí (desktop no tiene
 *  la app Cámara); en SSR devuelve false y el cliente lo corrige post-mount. */
export function isTouchDevice(): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true
  } catch {
    /* navegadores raros */
  }
  try {
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}

export function supportsCanvasCapture(): boolean {
  return (
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
  )
}

// ── Preferencias persistentes (try/catch, patrón del teleprompter) ──

export const FOTOINSPO_QUALITY_KEY = 'brave_fotoinspo_quality' // 'hd' | 'uhd'
export const FOTOINSPO_LENS_KEY = 'brave_fotoinspo_lens' // deviceId elegido

export function readStoredQuality(): InspoQuality {
  try {
    if (typeof window === 'undefined') return 'hd'
    return window.localStorage.getItem(FOTOINSPO_QUALITY_KEY) === 'uhd' ? 'uhd' : 'hd'
  } catch {
    return 'hd'
  }
}

export function writeStoredQuality(q: InspoQuality): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(FOTOINSPO_QUALITY_KEY, q)
  } catch {
    /* storage bloqueado (modo privado): preferencia no persistente, sin drama */
  }
}

export function readStoredLens(): string | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(FOTOINSPO_LENS_KEY)
  } catch {
    return null
  }
}

export function writeStoredLens(id: string | null): void {
  try {
    if (typeof window === 'undefined') return
    if (id) window.localStorage.setItem(FOTOINSPO_LENS_KEY, id)
    else window.localStorage.removeItem(FOTOINSPO_LENS_KEY)
  } catch {
    /* storage bloqueado */
  }
}