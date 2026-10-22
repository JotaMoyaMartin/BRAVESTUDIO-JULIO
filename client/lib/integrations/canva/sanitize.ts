/**
 * Saneo de la calibración del módulo "Diseños": zoneStyle de las bindings,
 * defaultPhotoPath y bg_paths (source JSONB) + aspecto. Allowlist ESTRICTA —
 * nada de lo que llega por PATCH/POST pasa verbatim a BD.
 *
 * Lo comparten las rutas admin (app/api/canva/*) y lib/design/server.ts
 * (serialización hacia la clienta) — misma gramática que asBindings.
 */

/** Path de asset de plantilla en design-exports: templates/{designId}/{archivo}.{ext}. */
export const TEMPLATE_ASSET_PATH_RE = /^templates\/[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+\.(png|jpg|jpeg)$/

/** Válido solo si matchea el patrón de preview_storage_path (sin traversal). */
export function isTemplateAssetPath(value: unknown): value is string {
  return typeof value === 'string' && TEMPLATE_ASSET_PATH_RE.test(value) && !value.includes('..')
}

/** Página embebida en el path ({preview|bare|photo}-p{n}-...); null si no la lleva. */
export function templateAssetPage(path: string): number | null {
  const m = path.match(/-p(\d+)-[^/]+\.(?:png|jpg|jpeg)$/)
  if (!m) return null
  const page = Number(m[1])
  return Number.isInteger(page) && page >= 1 ? page : null
}

/**
 * source.bg_paths: array POSICIONAL por página (índice i = página i+1) donde
 * '' = página sin fondo. Válido si cada hueco es '' o un path de plantilla.
 */
export function asTemplateAssetPathList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 60) return null
  for (const p of value) {
    if (p === '') continue
    if (!isTemplateAssetPath(p)) return null
  }
  return value as string[]
}

/** Aspecto CSS "W / H" — normaliza '4/5', '4:5', ' 4 / 5 ' a "4 / 5". */
export function asAspectValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.trim().match(/^(\d{1,3})\s*[/:]\s*(\d{1,3})$/)
  if (!m) return null
  const w = Number(m[1])
  const h = Number(m[2])
  if (w < 1 || h < 1 || w > 99 || h > 99) return null
  return `${w} / ${h}`
}

const WEIGHTS = new Set(['400', '600', '700', '800'])
const FONT_STYLES = new Set(['normal', 'italic'])
const TEXT_ALIGNS = new Set(['start', 'center', 'end'])
// Hex #rgb/#rgba/#rrggbb/#rrggbbaa o palabra CSS sencilla (p. ej. 'transparent').
const COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^[a-zA-Z]{1,30}$/

/**
 * zoneStyle de un binding de texto: claves permitidas con formato validado.
 * Claves desconocidas se descartan (copia solo la allowlist).
 * Objeto vacío tras sanear → null (se omite el campo).
 */
export function asZoneStyle(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const out: Record<string, unknown> = {}

  const family = raw.fontFamily
  if (typeof family === 'string') {
    const f = family.trim()
    // Charset cerrado (sin ;, :, {} y demás): se renderiza como font-family CSS.
    if (f.length > 0 && f.length <= 80 && /^[a-zA-Z0-9 ,"'()\-_.%]+$/.test(f)) out.fontFamily = f
  }

  const size = raw.fontSize
  if (typeof size === 'string') {
    const s = size.trim()
    if (/^\d+(\.\d+)?cqw$/.test(s)) out.fontSize = s
  }

  for (const key of ['color', 'bg'] as const) {
    const v = raw[key]
    if (typeof v === 'string') {
      const c = v.trim()
      if (c.length > 0 && c.length <= 30 && COLOR_RE.test(c)) out[key] = c
    }
  }

  if (typeof raw.fontWeight === 'string' && WEIGHTS.has(raw.fontWeight)) out.fontWeight = raw.fontWeight
  if (typeof raw.fontStyle === 'string' && FONT_STYLES.has(raw.fontStyle)) out.fontStyle = raw.fontStyle
  if (typeof raw.textAlign === 'string' && TEXT_ALIGNS.has(raw.textAlign)) out.textAlign = raw.textAlign

  const spacing = raw.letterSpacing
  if (typeof spacing === 'string' && /^\d+(\.\d+)?px$/.test(spacing.trim())) out.letterSpacing = spacing.trim()

  const line = raw.lineHeight
  if (typeof line === 'number' && Number.isFinite(line) && line > 0 && line <= 3) {
    out.lineHeight = Math.round(line * 100) / 100
  }

  return Object.keys(out).length > 0 ? out : null
}