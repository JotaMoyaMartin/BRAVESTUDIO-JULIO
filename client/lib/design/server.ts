import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasActiveAccess } from '@/lib/access'
import {
  CanvaBindingMap,
  CanvaDataset,
  DESIGN_EXPORTS_BUCKET,
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
  created_at: string
  updated_at: string
}

/** Payload seguro para la UI clienta (sin created_by/source/updated_at). */
export interface DesignTemplateLite {
  id: string
  name: string
  category: string | null
  kind: 'story' | 'carousel'
  page_count: number
  dataset: CanvaDataset
  bindings: CanvaBindingMap
  previewUrl: string | null
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

/** Preview (PNG en Storage privado) → signed URL de 7 días para la UI. */
export async function templatePreviewUrl(
  admin: ReturnType<typeof createAdminClient>,
  row: DesignTemplateRow,
): Promise<string | null> {
  if (!row.preview_storage_path) return null
  const { data: signed } = await admin.storage
    .from(DESIGN_EXPORTS_BUCKET)
    .createSignedUrl(row.preview_storage_path, 7 * 24 * 3600)
  return signed?.signedUrl ?? null
}

export function toTemplateLite(
  previewUrl: string | null,
  row: DesignTemplateRow,
): DesignTemplateLite {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    kind: row.kind,
    page_count: row.page_count,
    dataset: (row.dataset ?? {}) as CanvaDataset,
    bindings: (row.bindings ?? {}) as CanvaBindingMap,
    previewUrl,
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
    toTemplateLite(await templatePreviewUrl(admin, row), row),
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