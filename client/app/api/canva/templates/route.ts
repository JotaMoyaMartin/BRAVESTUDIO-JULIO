import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CanvaBindingMap,
  CanvaDataset,
  CanvaError,
  ensureFreshToken,
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: (data ?? []) as unknown as TemplateRow[] })
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

    if (existing) {
      const { data: updated, error } = await admin
        .from('design_templates')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', (existing as { id: string }).id)
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: (updated as { id: string }).id, updated: true })
    }
    const { data: inserted, error } = await admin
      .from('design_templates')
      .insert(row)
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: (inserted as { id: string }).id, updated: false })
  } catch (err) {
    if (err instanceof CanvaError) return NextResponse.json({ error: err.message, code: err.code }, { status: 502 })
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
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