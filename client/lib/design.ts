// DISEÑOS — contratos de /api/design/* tal como los sirve el backend
// (rutas de otro agente; aquí solo types + helpers de UI).
// Tolerancia: la lista llega con page_count (columna BD) u pageCount según
// quién serialice, y el detalle puede venir como {template} o objeto directo —
// los parsers de abajo aceptan las dos formas sin filtrar nada al usuario.

export type DesignKind = 'story' | 'carousel'

export type DesignBehavior =
  | 'user_text'
  | 'ai_text'
  | 'brand_text'
  | 'user_image'
  | 'keep_default'

export type DesignDatasetType = 'text' | 'image' | 'chart' | 'sheet'

/** Zona calibrada de un binding: porcentajes 0-100 sobre la página del preview. */
export interface DesignBindingZone {
  page: number
  x: number
  y: number
  w: number
  h: number
}

export interface DesignBinding {
  behavior: DesignBehavior
  label?: string
  purpose?: string
  maxLength?: number
  instructions?: string
  zone?: DesignBindingZone
}

export interface DesignTemplate {
  id: string
  name: string
  category: string | null
  kind: DesignKind
  pageCount: number
  previewUrl: string | null
  previewUrls?: string[]
  dataset: Record<string, DesignDatasetType>
  bindings: Record<string, DesignBinding>
}

/** GET /api/design/templates → { templates: [...] } */
export interface TemplatesResponse {
  templates: DesignTemplate[]
}

/** POST /api/design/generate → { ok, projectId, generatedDesignId, pages, usesRemaining } */
export interface GeneratedPage {
  page: number
  url: string
}

export interface DesignGenerateResponse {
  ok: boolean
  projectId: string
  generatedDesignId: string
  pages: GeneratedPage[]
  usesRemaining: number
}

/** POST /api/design/photo → { ok, path, signedUrl } */
export interface DesignPhotoResponse {
  ok: boolean
  path: string
  signedUrl: string
}

/** POST /api/design/ai-texts → { texts: {campo: string} } */
export interface DesignAiTextsResponse {
  texts: Record<string, string>
}

const KNOWN_BEHAVIORS: DesignBehavior[] = [
  'user_text', 'ai_text', 'brand_text', 'user_image', 'keep_default',
]

// ─── Parsers tolerantes a ambas serializaciones ───────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

export function parseTemplate(raw: unknown): DesignTemplate | null {
  if (!isRecord(raw)) return null
  const r = raw
  const id = typeof r.id === 'string' ? r.id : ''
  if (!id) return null
  const pageCountRaw =
    typeof r.pageCount === 'number' ? r.pageCount : (typeof r.page_count === 'number' ? r.page_count : null)
  const preview = typeof r.previewUrl === 'string' && r.previewUrl ? r.previewUrl : r.preview_url
  // previewUrls (nuevo, aditivo): una firma por página. Tolerante a camello y snake.
  const urlsRaw = Array.isArray(r.previewUrls) ? r.previewUrls : Array.isArray(r.preview_urls) ? r.preview_urls : []
  const previewUrls = (urlsRaw as unknown[]).filter(
    (u): u is string => typeof u === 'string' && u.trim() !== '',
  )
  const kind = r.kind === 'carousel' ? 'carousel' : 'story'
  return {
    id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name : 'Plantilla',
    category: typeof r.category === 'string' ? r.category : null,
    kind,
    pageCount: pageCountRaw && pageCountRaw > 0 ? Math.round(pageCountRaw) : 1,
    previewUrl: typeof preview === 'string' && preview ? preview : (previewUrls[0] ?? null),
    dataset: isRecord(r.dataset) ? (r.dataset as Record<string, DesignDatasetType>) : {},
    bindings: isRecord(r.bindings) ? (r.bindings as Record<string, DesignBinding>) : {},
    ...(previewUrls.length > 0 ? { previewUrls } : {}),
  }
}

/** null = payload inválido (no confundir con lista vacía válida). */
export function parseTemplateList(raw: unknown): DesignTemplate[] | null {
  const list = (raw as { templates?: unknown } | null)?.templates
  if (!Array.isArray(list)) return null
  return list.map(parseTemplate).filter((t): t is DesignTemplate => t !== null)
}

// ─── Errores: los rutas traen mensajes humanos, con excepciones ────

const NON_HUMAN_ERRORS: Record<string, string> = {
  // 503 de isServerAIConfigured — técnico; se humaniza en la UI.
  'AI not configured': 'La IA no está disponible en este momento. Puedes escribir el texto a mano.',
}

export function humanizeDesignError(err: unknown, fallback: string): string {
  const raw = typeof err === 'string' ? err : undefined
  if (!raw) return fallback
  return NON_HUMAN_ERRORS[raw] ?? raw
}

// ─── Helpers de etiquetas ─────────────────────────────────────────
// s1_headline → "Headline página 1" (prefijo sN/pN = página del diseño).

function titleizePart(raw: string): string {
  return raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function humanizeFieldName(field: string): string {
  const m = field.match(/^(?:s|p)(\d+)[-_](.+)$/i)
  if (m) return `${titleizePart(m[2])} página ${m[1]}`
  return titleizePart(field)
}

export function fieldLabel(field: string, binding?: DesignBinding): string {
  return binding?.label ?? humanizeFieldName(field)
}

export function behaviorOf(template: DesignTemplate, field: string): DesignBehavior {
  const behavior = (template.bindings?.[field] as DesignBinding | undefined)?.behavior
  return KNOWN_BEHAVIORS.includes(behavior as DesignBehavior)
    ? (behavior as DesignBehavior)
    : 'user_text'
}

export function kindLabel(kind: DesignKind): string {
  return kind === 'story' ? 'Historia' : 'Carrusel'
}

/** Aspecto del preview según formato: 4:5 historias, 3:2 carruseles. */
export function kindAspect(kind: DesignKind): string {
  return kind === 'story' ? '4 / 5' : '3 / 2'
}

/** Campos en orden natural del dataset, filtrando lo que la clienta no ve. */
export function visibleFields(template: DesignTemplate): string[] {
  return Object.keys(template.dataset || {}).filter(
    f => behaviorOf(template, f) !== 'keep_default',
  )
}

export function isTextField(template: DesignTemplate, field: string): boolean {
  return (template.dataset?.[field] ?? 'text') === 'text'
}

export function maxLengthOf(template: DesignTemplate, field: string): number {
  return template.bindings?.[field]?.maxLength ?? 120
}

// ─── Zonas calibradas (fase EDITOR) ────────────────────────────────
// bindings[campo].zone → rectángulo en % de la página (page 1-based) del
// preview. La API puede traerlas para cualquier behavior (incluso candados);
// los parsers leen con tolerancia y devuelven null si vienen mal.

/** Zona calibrada de un binding o null (tolerante a shapes raros). */
export function zoneOf(binding?: DesignBinding | null): DesignBindingZone | null {
  const z = binding?.zone as unknown
  if (!isRecord(z)) return null
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null
  const page = num(z.page)
  const x = num(z.x)
  const y = num(z.y)
  const w = num(z.w)
  const h = num(z.h)
  if (page === null || x === null || y === null || w === null || h === null) return null
  if (page < 1 || w <= 0 || h <= 0) return null
  // Recorte al lienzo 0-100: el overlay nunca se sale del preview.
  const nx = Math.min(Math.max(x, 0), 100)
  const ny = Math.min(Math.max(y, 0), 100)
  const nw = Math.min(w, 100 - nx)
  const nh = Math.min(h, 100 - ny)
  if (nw <= 0 || nh <= 0) return null
  return { page: Math.round(page), x: nx, y: ny, w: nw, h: nh }
}

/** ¿La plantilla trae al menos una zona calibrada? → MODO ZONAS. */
export function templateHasZones(template: DesignTemplate): boolean {
  return Object.values(template.bindings || {}).some(b => zoneOf(b) !== null)
}

/** Urls firmadas de preview por página; recurre a previewUrl (página 1). */
export function previewPages(template: DesignTemplate): string[] {
  if (template.previewUrls && template.previewUrls.length > 0) return template.previewUrls
  return template.previewUrl ? [template.previewUrl] : []
}

export interface PageZone {
  field: string
  zone: DesignBindingZone
  behavior: DesignBehavior
}

/** Zonas calibradas de UNA página (1-based), en orden del dataset y luego extras. */
export function zonesOnPage(template: DesignTemplate, page: number): PageZone[] {
  const out: PageZone[] = []
  const seen = new Set<string>()
  for (const field of Object.keys(template.dataset || {})) {
    const zone = zoneOf(template.bindings?.[field])
    if (zone?.page === page) {
      out.push({ field, zone, behavior: behaviorOf(template, field) })
      seen.add(field)
    }
  }
  for (const [field, binding] of Object.entries(template.bindings || {})) {
    if (seen.has(field)) continue
    const zone = zoneOf(binding)
    if (zone?.page === page) {
      out.push({ field, zone, behavior: behaviorOf(template, field) })
      seen.add(field)
    }
  }
  return out
}