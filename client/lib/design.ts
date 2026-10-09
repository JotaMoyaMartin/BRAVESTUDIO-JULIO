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

export interface DesignBinding {
  behavior: DesignBehavior
  label?: string
  purpose?: string
  maxLength?: number
  instructions?: string
}

export interface DesignTemplate {
  id: string
  name: string
  category: string | null
  kind: DesignKind
  pageCount: number
  previewUrl: string | null
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
  const preview = typeof r.previewUrl === 'string' ? r.previewUrl : r.preview_url
  const kind = r.kind === 'carousel' ? 'carousel' : 'story'
  return {
    id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name : 'Plantilla',
    category: typeof r.category === 'string' ? r.category : null,
    kind,
    pageCount: pageCountRaw && pageCountRaw > 0 ? Math.round(pageCountRaw) : 1,
    previewUrl: typeof preview === 'string' && preview ? preview : null,
    dataset: isRecord(r.dataset) ? (r.dataset as Record<string, DesignDatasetType>) : {},
    bindings: isRecord(r.bindings) ? (r.bindings as Record<string, DesignBinding>) : {},
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