import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AcademiaModule, AcademiaLesson } from '@/types/database'

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

function normalizeLoomUrl(url: string): string {
  const trimmed = url.trim()
  const match = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
  if (match) return `https://www.loom.com/embed/${match[1]}`
  return trimmed
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const body = await request.json()
  const { type } = body

  if (type === 'module') {
    const update: Record<string, unknown> = {}
    if (body.title !== undefined) update.title = String(body.title).trim()
    if (body.description !== undefined) update.description = body.description ? String(body.description).trim() : null
    if (body.sort_order !== undefined) update.sort_order = body.sort_order
    if (body.status !== undefined) update.status = body.status === 'hidden' ? 'hidden' : 'active'
    update.updated_at = new Date().toISOString()

    const { data, error } = await auth.admin.from('academia_modules').update(update).eq('id', params.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data as AcademiaModule })
  }

  if (type === 'lesson') {
    const update: Record<string, unknown> = {}
    if (body.module_id !== undefined) update.module_id = body.module_id || null
    if (body.title !== undefined) update.title = String(body.title).trim()
    if (body.description !== undefined) update.description = body.description ? String(body.description).trim() : null
    if (body.loom_url !== undefined) update.loom_url = normalizeLoomUrl(String(body.loom_url))
    if (body.sort_order !== undefined) update.sort_order = body.sort_order
    if (body.status !== undefined) update.status = body.status === 'hidden' ? 'hidden' : 'active'
    update.updated_at = new Date().toISOString()

    const { data, error } = await auth.admin.from('academia_lessons').update(update).eq('id', params.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data as AcademiaLesson })
  }

  return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const { type } = await _request.json().catch(() => ({ type: '' }))

  if (type === 'module') {
    const { error } = await auth.admin.from('academia_modules').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Default: delete lesson
  const { error } = await auth.admin.from('academia_lessons').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}