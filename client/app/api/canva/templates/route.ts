import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CanvaBindingMap,
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
    const b = raw as { behavior?: string; label?: string; purpose?: string; maxLength?: number; instructions?: string }
    if (
      b.behavior === 'user_text' || b.behavior === 'ai_text' || b.behavior === 'brand_text' ||
      b.behavior === 'user_image' || b.behavior === 'keep_default'
    ) {
      out[field] = { behavior: b.behavior }
      if (b.label) out[field].label = b.label.slice(0, 120)
      if (b.purpose) out[field].purpose = b.purpose.slice(0, 200)
      if (typeof b.maxLength === 'number' && b.maxLength > 0) out[field].maxLength = Math.round(b.maxLength)
      if (b.instructions) out[field].instructions = b.instructions.slice(0, 500)
    }
  }
  return out
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
  created_at: string
  updated_at: string
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
  // Preview original (PNG en Storage privado) → signed URL de 24h para la UI.
  await Promise.all(rows.map(async row => {
    if (!row.preview_storage_path) return
    const { data: signed } = await admin.storage
      .from(DESIGN_EXPORTS_BUCKET)
      .createSignedUrl(row.preview_storage_path, 86_400)
    ;(row as unknown as { preview_url?: string | null }).preview_url = signed?.signedUrl ?? null
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
    | { designRef?: string; name?: string; category?: string; kind?: string; bindings?: unknown }
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

    const row = {
      provider: 'canva',
      provider_design_id: designId,
      name,
      category: (body.category ?? '').trim() || null,
      kind: body.kind === 'carousel' ? ('carousel' as const) : ('story' as const),
      page_count: design.pageCount,
      dataset: dataset as unknown as Record<string, unknown>,
      bindings: asBindings(body.bindings) as unknown as Record<string, unknown>,
      created_by: auth.userId,
      source: { canva_edit_url: design.canvaEditUrl, canva_updated_at: design.updatedAt },
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
      const { data: up, error } = await admin
        .from('design_templates')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', (existing as { id: string }).id)
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: dbUserError(error) }, { status: 500 })
      templateId = (up as { id: string }).id
      updated = true
    } else {
      const { data: inserted, error } = await admin
        .from('design_templates')
        .insert(row)
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: dbUserError(error) }, { status: 500 })
      templateId = (inserted as { id: string }).id
      updated = false
    }

    // Preview original persistente (page 1 → PNG → Storage BRÄVE). Best-effort:
    // el import NO debe fallar si Canva no puede exportar en este momento.
    let previewPath: string | null = null
    let previewUrl: string | null = null
    let previewNote: string | null = null
    try {
      previewPath = await createTemplatePreview({ accessToken, designId })
      const { error: pErr } = await admin
        .from('design_templates')
        .update({ preview_storage_path: previewPath })
        .eq('id', templateId)
      if (pErr) {
        previewNote = `Preview exportado pero no se guardó la referencia: ${pErr.message}`
      } else {
        const { data: signed } = await admin.storage
          .from(DESIGN_EXPORTS_BUCKET)
          .createSignedUrl(previewPath, 86_400)
        previewUrl = signed?.signedUrl ?? null
      }
    } catch (perr) {
      previewNote = perr instanceof CanvaError
        ? `Preview no disponible (${perr.code}) — la plantilla queda guardada.`
        : `Preview no disponible — la plantilla queda guardada.`
    }

    return NextResponse.json({ ok: true, id: templateId, updated, previewPath, previewUrl, previewNote })
  } catch (err) {
    if (err instanceof CanvaError) return NextResponse.json({ error: err.message, code: err.code }, { status: 502 })
    return NextResponse.json({ error: dbUserError(err as Error) }, { status: 500 })
  }
}

/** Export PNG (page 1) del diseño ORIGINAL → Storage BRÄVE → path. */
async function createTemplatePreview(args: { accessToken: string; designId: string }): Promise<string> {
  const { accessToken, designId } = args
  await ensureDesignExportsBucket(createAdminClient())
  const exportJob = await createPngExport({ accessToken, designId, pages: [1] })
  const urls = await awaitExportUrls({ accessToken, jobId: exportJob.jobId })
  const buffer = await fetchExportPng(urls[0])
  const path = `templates/${designId}/preview-${Date.now().toString(36)}.png`
  const admin = createAdminClient()
  const { error } = await admin.storage.from(DESIGN_EXPORTS_BUCKET).upload(path, buffer, {
    contentType: 'image/png',
    cacheControl: '31536000',
  })
  if (error) throw new Error(`Storage: ${error.message}`)
  return path
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const body = (await request.json().catch(() => null)) as
    | { id?: string; status?: string; name?: string }
    | null
  if (!body?.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status && ['draft', 'published', 'archived'].includes(body.status)) patch.status = body.status
  if (body.name?.trim()) patch.name = body.name.trim()
  const admin = createAdminClient()
  const { error } = await admin.from('design_templates').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}