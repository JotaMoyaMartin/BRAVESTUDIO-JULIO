import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, admin: createAdminClient() }
}

/** PATCH plantilla — campos editables. `slides` llega como JSON parseado del editor del admin. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const body = await request.json()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim()
  if (typeof body.category === 'string' && body.category.trim()) patch.category = body.category.trim()
  if (typeof body.description === 'string') patch.description = body.description
  if (typeof body.recommended_use === 'string') patch.recommended_use = body.recommended_use
  if (typeof body.cover_image === 'string') patch.cover_image = body.cover_image || null
  if (typeof body.status === 'string' && ['draft', 'published', 'archived'].includes(body.status)) patch.status = body.status
  if (typeof body.sort === 'number') patch.sort = body.sort
  if (Array.isArray(body.slides)) {
    // Validación mínima: cada slide con su orden, fondo, layout y elementos
    for (const sl of body.slides) {
      if (typeof sl !== 'object' || !sl || !Array.isArray(sl.elements)) {
        return NextResponse.json({ error: 'slides mal formados (se espera {order, background, layoutType, elements[]})' }, { status: 400 })
      }
    }
    patch.slides = body.slides
  }
  const { data: updated, error } = await auth.admin
    .from('story_design_templates').update(patch).eq('id', params.id).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: (updated as { id: string }).id })
}

/** POST — duplicar la plantilla (copia en draft con nuevo slug). */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const { data: src } = await auth.admin
    .from('story_design_templates').select('*').eq('id', params.id).maybeSingle()
  if (!src) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  const base = String(src.slug).replace(/-c[a-z0-9]+$/, '')
  const suffix = Date.now().toString(36).slice(-5)
  const { data: copy, error } = await auth.admin
    .from('story_design_templates')
    .insert({
      pack_id: (src as { pack_id: string }).pack_id,
      slug: `${base}-c${suffix}`,
      title: `${String(src.title).replace(/\s*\(copia.*\)$/, '')} (copia)`,
      category: src.category,
      description: src.description,
      recommended_use: src.recommended_use,
      cover_image: null,
      is_locked: false,
      status: 'draft',
      sort: (typeof src.sort === 'number' ? src.sort : 0) + 1,
      tags: ['nuevo'],
      default_style: src.default_style ?? {},
      slides: src.slides,
    })
    .select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: (copy as { id: string }).id })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const { error } = await auth.admin.from('story_design_templates').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}