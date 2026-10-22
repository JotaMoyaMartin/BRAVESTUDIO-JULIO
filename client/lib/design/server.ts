import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasActiveAccess } from '@/lib/access'
import {
  CanvaBindingMap,
  CanvaDataset,
  DESIGN_EXPORTS_BUCKET,
  isTemplateAssetPath,
} from '@/lib/integrations/canva'

/**
 * Soporte server-only de las rutas /api/design/* (módulo clienta "Diseños").
 *
 * Gate común: sesión de la clienta + hasActiveAccess (misma gramática del
 * middleware — Premium/admin ya pasan por hasActiveAccess, no hace falta
 * duplicarla). Lecturas de plantillas SIEMPRE con createAdminClient
 * (service role), nunca exponiendo filas borrador de otras.
 * Nada de tokens ni secretos pasa por aquí: solo paths firmados.
 */

// ── Tipos (types/database.ts no tiene estas tablas aún — locales, sin any) ──

export interface DesignTemplateRow {
  id: string
  provider: string
  provider_design_id: string
  name: string
  category: string | null
  kind: 'story' | 'carousel'
  page_count: number
  status: 'draft' | 'published' | 'archived'
  dataset: CanvaDataset
  bindings: CanvaBindingMap
  preview_storage_path: string | null
  source?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/** Payload seguro para la UI clienta (sin created_by/updated_at). */
export interface DesignTemplateLite {
  id: string
  name: string
  category: string | null
  kind: 'story' | 'carousel'
  page_count: number
  dataset: CanvaDataset
  bindings: CanvaBindingMap
  previewUrl: string | null
  previewUrls: string[]
  /** Fondos "bare" sin texto (PNG firmados 7d, posicional por página). Solo si cubren TODAS las páginas. */
  bg_urls?: string[]
  /** Override de aspect-ratio del diseño (source.aspect, 'W / H'). */
  aspect?: string
}

// ── Gate ─────────────────────────────────────────────────────────────────────

export type DesignAccess =
  | { ok: true; userId: string }
  | { ok: false; status: number; msg: string }

export async function requireDesignAccess(): Promise<DesignAccess> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('access_status, subscription_status, is_active, access_source, access_expires_at')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !hasActiveAccess(profile)) {
    return { ok: false, status: 403, msg: 'Sin acceso activo' }
  }
  return { ok: true, userId: user.id }
}

// ── Plantillas ───────────────────────────────────────────────────────────────

/** PGRST205/202 = falta el SQL de las tablas Canva (mismo aviso que el spike). */
export function dbUserError(err: { message: string }): string {
  if (err.message?.includes('PGRST205') || err.message?.includes('PGRST202')) {
    return 'Falta el SQL de las tablas Canva — pega SQL-CANVA-SPIKE.sql en el SQL Editor de Supabase.'
  }
  return err.message
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export async function fetchPublishedTemplate(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
): Promise<DesignTemplateRow | null> {
  const { data, error } = await admin
    .from('design_templates')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw new Error(dbUserError(error))
  return ((data as unknown as DesignTemplateRow) ?? null)
}

/** Paths de preview persistidos: source.preview_paths (1 por página) o, en su defecto, el path page-1 antiguo. */
function sourcePreviewPaths(row: DesignTemplateRow): string[] {
  const raw = (row.source as { preview_paths?: unknown } | null)?.preview_paths
  if (Array.isArray(raw)) {
    const paths = raw.filter((p): p is string => typeof p === 'string' && p.length > 0)
    if (paths.length > 0) return paths
  }
  return row.preview_storage_path ? [row.preview_storage_path] : []
}

/**
 * Previews de TODAS las páginas (PNG en Storage privado) → signed URLs de
 * 7 días para la UI clienta. bindings (con zonas) viajan completos en el Lite.
 */
export async function templatePreviewUrls(
  admin: ReturnType<typeof createAdminClient>,
  row: DesignTemplateRow,
): Promise<string[]> {
  const paths = sourcePreviewPaths(row)
  if (paths.length === 0) return []
  const signed = await Promise.all(paths.map(async p => {
    const { data } = await admin.storage
      .from(DESIGN_EXPORTS_BUCKET)
      .createSignedUrl(p, 7 * 24 * 3600)
    return data?.signedUrl ?? null
  }))
  return signed.filter((u): u is string => u !== null)
}

/** Preview página 1 (compat con la UI existente). */
export async function templatePreviewUrl(
  admin: ReturnType<typeof createAdminClient>,
  row: DesignTemplateRow,
): Promise<string | null> {
  const urls = await templatePreviewUrls(admin, row)
  return urls[0] ?? null
}

/**
 * Paths de fondo "bare" (source.bg_paths, posicional por página con '' = hueco).
 * V1: SOLO si cubren TODAS las páginas — si falta alguna/huecos/demás, se
 * omite y el editor cae a los previews (nunca URLs desalineadas).
 */
function sourceBgPaths(row: DesignTemplateRow): string[] {
  const raw = (row.source as { bg_paths?: unknown } | null)?.bg_paths
  if (!Array.isArray(raw)) return []
  const paths = raw
    .filter((p): p is string => typeof p === 'string' && isTemplateAssetPath(p))
  const count = typeof row.page_count === 'number' && row.page_count > 0 ? Math.round(row.page_count) : 0
  if (count > 0 && paths.length !== count) return []
  return paths
}

/** Firmas de 7 días para los bg paths (mismo helper de firma que los previews). */
async function templateBgUrls(
  admin: ReturnType<typeof createAdminClient>,
  row: DesignTemplateRow,
): Promise<string[]> {
  const paths = sourceBgPaths(row)
  if (paths.length === 0) return []
  const signed = await Promise.all(paths.map(async p => {
    const { data } = await admin.storage
      .from(DESIGN_EXPORTS_BUCKET)
      .createSignedUrl(p, 7 * 24 * 3600)
    return data?.signedUrl ?? null
  }))
  // Una sola firma fallida ⇒ se omite TODO el campo (nunca crash, nunca huecos).
  if (signed.some(u => u === null)) return []
  return signed.filter((u): u is string => u !== null)
}

/**
 * defaultPhotoPath → defaultPhotoUrl firmada (7d), ADITIVO sobre bindings
 * verbatim: la clienta renderiza la capa default con la URL; el path queda
 * para trazabilidad. Sin path válido o firma fallida → binding intacto.
 */
async function bindingsWithDefaultPhotoUrls(
  admin: ReturnType<typeof createAdminClient>,
  row: DesignTemplateRow,
): Promise<CanvaBindingMap> {
  const bindings = (row.bindings ?? {}) as CanvaBindingMap
  const withPhoto = Object.entries(bindings).filter(([, b]) => isTemplateAssetPath(b?.defaultPhotoPath))
  if (withPhoto.length === 0) return bindings
  const out: CanvaBindingMap = { ...bindings }
  await Promise.all(withPhoto.map(async ([field, binding]) => {
    const { data } = await admin.storage
      .from(DESIGN_EXPORTS_BUCKET)
      .createSignedUrl(binding.defaultPhotoPath as string, 7 * 24 * 3600)
    if (data?.signedUrl && out[field]) {
      out[field] = { ...out[field], defaultPhotoUrl: data.signedUrl }
    }
  }))
  return out
}

export async function toTemplateLite(
  previewUrls: string[],
  row: DesignTemplateRow,
  admin: ReturnType<typeof createAdminClient>,
): Promise<DesignTemplateLite> {
  const [bgUrls, bindings] = await Promise.all([
    templateBgUrls(admin, row),
    bindingsWithDefaultPhotoUrls(admin, row),
  ])
  const aspectRaw = (row.source as { aspect?: unknown } | null)?.aspect
  const aspect = typeof aspectRaw === 'string' && aspectRaw.trim() !== '' ? aspectRaw : undefined
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    kind: row.kind,
    page_count: row.page_count,
    dataset: (row.dataset ?? {}) as CanvaDataset,
    bindings,
    previewUrl: previewUrls[0] ?? null,
    previewUrls,
    ...(bgUrls.length > 0 ? { bg_urls: bgUrls } : {}),
    ...(aspect ? { aspect } : {}),
  }
}

/** Listado clienta: SOLO publicadas, más nuevas primero. */
export async function listPublishedTemplates():
  Promise<DesignTemplateLite[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('design_templates')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) throw new Error(dbUserError(error))
  const rows = (data ?? []) as unknown as DesignTemplateRow[]
  const lites = await Promise.all(rows.map(async row =>
    toTemplateLite(await templatePreviewUrls(admin, row), row, admin),
  ))
  return lites
}

/** Saneo de nombres de campo del dataset (convenio de las plantillas BRÄVE). */
const FIELD_RE = /^(s\d+_[a-z_]+|[a-z_]+)$/
export function sanitizeField(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const field = value.trim().toLowerCase()
  return FIELD_RE.test(field) ? field : null
}