import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CanvaBindingMap,
  CanvaBindingZone,
  CanvaDataset,
  CanvaError,
  DESIGN_EXPORTS_BUCKET,
  awaitExportUrls,
  createPngExport,
  ensureDesignExportsBucket,
  ensureFreshToken,
  fetchExportPng,
  getDesign,
  getDesignDataset,
  parseDesignRef,
} from '@/lib/integrations/canva'

/**
 * Persistencia de plantillas importadas (source of truth BRÄVE).
 * Canva queda como source of truth del DISEÑO; aquí solo metadata,
 * bindings, categoría y status (draft | published | archived).
 */

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, userId: user.id }
}

function asBindings(value: unknown): CanvaBindingMap {
  const out: CanvaBindingMap = {}
  if (typeof value !== 'object' || !value) return out
  for (const [field, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'object' || !raw) continue
    const b = raw as { behavior?: string; label?: string; purpose?: string; maxLength?: number; instructions?: string; zone?: unknown }
    if (
      b.behavior === 'user_text' || b.behavior === 'ai_text' || b.behavior === 'brand_text' ||
      b.behavior === 'user_image' || b.behavior === 'keep_default'
    ) {
      out[field] = { behavior: b.behavior }
      if (b.label) out[field].label = b.label.slice(0, 120)
      if (b.purpose) out[field].purpose = b.purpose.slice(0, 200)
      if (typeof b.maxLength === 'number' && b.maxLength > 0) out[field].maxLength = Math.round(b.maxLength)
      if (b.instructions) out[field].instructions = b.instructions.slice(0, 500)
      const zone = asBindingZone(b.zone)
      if (zone) out[field].zone = zone
    }
  }
  return out
}

/**
 * Zona calibrada sobre el preview: page 1-based + x/y/w/h en % (0-100).
 * Inválida → null (se descarta la zone, el binding sobrevive sin ella).
 */
function asBindingZone(value: unknown): CanvaBindingZone | null {
  if (typeof value !== 'object' || value === null) return null
  const z = value as { page?: unknown; x?: unknown; y?: unknown; w?: unknown; h?: unknown }
  const nums = [z.x, z.y, z.w, z.h]
  if (nums.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100)) return null
  if (typeof z.page !== 'number' || !Number.isInteger(z.page) || z.page < 1) return null
  return { page: z.page, x: z.x as number, y: z.y as number, w: z.w as number, h: z.h as number }
}

interface TemplateRow {
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
  source: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/** Paths de preview persistidos: usa source.preview_paths si existe (1 por página) y si no el path page-1 antiguo. */
function previewPathsOf(row: TemplateRow): string[] {
  const raw = (row.source as { preview_paths?: unknown } | null)?.preview_paths
  if (Array.isArray(raw)) {
    const paths = raw.filter((p): p is string => typeof p === 'string' && p.length > 0)
    if (paths.length > 0) return paths
  }
  return row.preview_storage_path ? [row.preview_storage_path] : []
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('design_templates')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: dbUserError(error) }, { status: 500 })
  const rows = (data ?? []) as unknown as TemplateRow[]
  // Previews (PNG en Storage privado) → signed URLs de 24h para la UI.
  // preview_urls = TODAS las páginas (una por source.preview_paths);
  // preview_url = página 1, por compatibilidad con la UI existente.
  await Promise.all(rows.map(async row => {
    const paths = previewPathsOf(row)
    if (paths.length === 0) return
    const signed = await Promise.all(paths.map(async p => {
      const { data: url } = await admin.storage
        .from(DESIGN_EXPORTS_BUCKET)
        .createSignedUrl(p, 86_400)
      return url?.signedUrl ?? null
    }))
    const urls = signed.filter((u): u is string => u !== null)
    const mutable = row as unknown as { preview_url?: string | null; preview_urls?: string[] }
    mutable.preview_url = urls[0] ?? null
    mutable.preview_urls = urls
  }))
  return NextResponse.json({ templates: rows })
}

/** PGRST205/202 = falta el SQL de las tablas Canva. */
function dbUserError(err: { message: string }): string {
  if (err.message?.includes('PGRST205') || err.message?.includes('PGRST202')) {
    return 'Falta el SQL de las tablas Canva — pega SQL-CANVA-SPIKE.sql en el SQL Editor de Supabase.'
  }
  return err.message
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const body = (await request.json().catch(() => null)) as
    | { designRef?: string; name?: string; category?: string; kind?: string; publish?: boolean; bindings?: unknown }
    | null
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  const designId = parseDesignRef(body.designRef ?? '')
  if (!designId) return NextResponse.json({ error: 'Design ID/URL inválido' }, { status: 400 })
  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Falta el nombre de la plantilla' }, { status: 400 })

  try {
    const { accessToken } = await ensureFreshToken(auth.userId)
    const design = await getDesign({ accessToken, designId })
    const dataset = await getDesignDataset({ accessToken, designId })
    const admin = createAdminClient()

    // publish → status (publish true = publicar, false = despublicar).
    // Sin publish (undefined) NO se toca el status al actualizar: re-guardar
    // bindings de una plantilla publicada no debe despublicarla.
    const statusPatch =
      body.publish === true ? { status: 'published' as const }
      : body.publish === false ? { status: 'draft' as const }
      : {}
    const bindingsRow: Record<string, unknown> | undefined =
      body.bindings === undefined ? undefined : asBindings(body.bindings) as unknown as Record<string, unknown>

    const baseRow = {
      provider: 'canva',
      provider_design_id: designId,
      name,
      category: (body.category ?? '').trim() || null,
      kind: body.kind === 'carousel' ? ('carousel' as const) : ('story' as const),
      page_count: design.pageCount,
      dataset: dataset as unknown as Record<string, unknown>,
      created_by: auth.userId,
      source: { canva_edit_url: design.canvaEditUrl, canva_updated_at: design.updatedAt },
      ...statusPatch,
    }

    const { data: existing } = await admin
      .from('design_templates')
      .select('id')
      .eq('provider', 'canva')
      .eq('provider_design_id', designId)
      .maybeSingle()

    let templateId: string
    let updated: boolean
    if (existing) {
      // Al actualizar: bindings solo si llegaron (guardar sin bindings no
      // reescribe el mapper, y despublicar no debe borrarlo).
      const withBindings = bindingsRow === undefined ? baseRow : { ...baseRow, bindings: bindingsRow }
      const { data: up, error } = await admin
        .from('design_templates')
        .update({ ...withBindings, updated_at: new Date().toISOString() })
        .eq('id', (existing as { id: string }).id)
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: dbUserError(error) }, { status: 500 })
      templateId = (up as { id: string }).id
      updated = true
    } else {
      const { data: inserted, error } = await admin
        .from('design_templates')
        .insert({ ...baseRow, bindings: bindingsRow ?? {} })
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: dbUserError(error) }, { status: 500 })
      templateId = (inserted as { id: string }).id
      updated = false
    }

    // Previews persistentes de TODAS las páginas (PNG → Storage BRÄVE).
    // Best-effort: el import NO debe fallar si Canva no puede exportar ahora.
    let previewPath: string | null = null
    let previewUrl: string | null = null
    let previewUrls: string[] = []
    let previewNote: string | null = null
    try {
      const { paths } = await createTemplatePreviews({ accessToken, designId, pageCount: design.pageCount })
      previewPath = paths[0] ?? null
      // El array de paths vive en source (JSONB ya existente, sin SQL nuevo);
      // preview_storage_path sigue apuntando a la página 1 (compat). Los
      // previews viejos de re-guards anteriores quedan huérfanos en Storage.
      const sourceRow = {
        ...(baseRow.source as Record<string, unknown>),
        preview_paths: paths,
      }
      const { error: pErr } = await admin
        .from('design_templates')
        .update({ preview_storage_path: previewPath, source: sourceRow })
        .eq('id', templateId)
      if (pErr) {
        previewNote = `Previews exportados pero no se guardaron las referencias: ${pErr.message}`
      } else {
        const signed = await Promise.all(paths.map(async p => {
          const { data: url } = await admin.storage
            .from(DESIGN_EXPORTS_BUCKET)
            .createSignedUrl(p, 86_400)
          return url?.signedUrl ?? null
        }))
        previewUrls = signed.filter((u): u is string => u !== null)
        previewUrl = previewUrls[0] ?? null
      }
    } catch (perr) {
      previewNote = perr instanceof CanvaError
        ? `Preview no disponible (${perr.code}) — la plantilla queda guardada.`
        : `Preview no disponible — la plantilla queda guardada.`
    }

    return NextResponse.json({ ok: true, id: templateId, updated, previewPath, previewUrl, previewUrls, previewNote })
  } catch (err) {
    if (err instanceof CanvaError) return NextResponse.json({ error: err.message, code: err.code }, { status: 502 })
    return NextResponse.json({ error: dbUserError(err as Error) }, { status: 500 })
  }
}

/**
 * Export PNG de las páginas [1..pageCount] del diseño ORIGINAL → Storage
 * BRÄVE → paths (uno por página, en orden). URLs de Canva: una por página
 * pedida, en el orden de `pages`. pageCount 1 mantiene el path plano antiguo
 * (compat). El preview VIEJO de un re-guard anterior queda huérfano en Storage.
 */
async function createTemplatePreviews(args: {
  accessToken: string
  designId: string
  pageCount: number
}): Promise<{ paths: string[] }> {
  const { accessToken, designId, pageCount } = args
  await ensureDesignExportsBucket(createAdminClient())
  const pages = Array.from({ length: Math.max(1, pageCount) }, (_, i) => i + 1)
  const exportJob = await createPngExport({ accessToken, designId, pages })
  const urls = await awaitExportUrls({ accessToken, jobId: exportJob.jobId })
  const admin = createAdminClient()
  const stamp = Date.now().toString(36)
  const count = Math.min(pages.length, urls.length)
  const paths: string[] = []
  for (let i = 0; i < count; i++) {
    const buffer = await fetchExportPng(urls[i])
    const path = count === 1
      ? `templates/${designId}/preview-${stamp}.png`
      : `templates/${designId}/preview-p${pages[i]}-${stamp}.png`
    const { error } = await admin.storage.from(DESIGN_EXPORTS_BUCKET).upload(path, buffer, {
      contentType: 'image/png',
      cacheControl: '31536000',
    })
    if (error) throw new Error(`Storage: ${error.message}`)
    paths.push(path)
  }
  if (paths.length === 0) throw new Error('Export sin páginas')
  return { paths }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const body = (await request.json().catch(() => null)) as
    | { id?: string; status?: string; name?: string; category?: string; bindings?: unknown }
    | null
  if (!body?.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status && ['draft', 'published', 'archived'].includes(body.status)) patch.status = body.status
  if (body.name?.trim()) patch.name = body.name.trim()
  if (body.category !== undefined) patch.category = body.category.trim() || null
  // Bindings COMPLETOS (mapa entero con zonas) — el PATCH reemplaza la columna.
  if (body.bindings !== undefined) patch.bindings = asBindings(body.bindings)
  const admin = createAdminClient()
  const { error } = await admin.from('design_templates').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}