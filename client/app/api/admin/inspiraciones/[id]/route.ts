import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReelInspiration } from '@/types/database'

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const k of ['title', 'short_description', 'description', 'idea_text', 'why_text', 'how_text', 'cover_image', 'instagram_url', 'status']) {
    if (body[k] !== undefined) update[k] = body[k]
  }
  if (update.title !== undefined) update.title = String(update.title).trim()
  if (update.short_description !== undefined) update.short_description = String(update.short_description).trim()
  if (update.description !== undefined) update.description = String(update.description).trim()
  if (update.idea_text !== undefined) update.idea_text = update.idea_text ? String(update.idea_text).trim() : null
  if (update.why_text !== undefined) update.why_text = update.why_text ? String(update.why_text).trim() : null
  if (update.how_text !== undefined) update.how_text = update.how_text ? String(update.how_text).trim() : null
  if (update.instagram_url !== undefined) update.instagram_url = update.instagram_url ? String(update.instagram_url).trim() : null
  if (update.status !== undefined) update.status = update.status === 'hidden' ? 'hidden' : 'active'

  const { data, error } = await auth.admin.from('reel_inspirations').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data as ReelInspiration })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const { error } = await auth.admin.from('reel_inspirations').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  // Duplicar
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const { data: orig } = await auth.admin.from('reel_inspirations').select('*').eq('id', params.id).single()
  if (!orig) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  const { id: _id, created_at: _c, ...rest } = orig as ReelInspiration
  const { data, error } = await auth.admin.from('reel_inspirations').insert({
    ...rest,
    title: (orig as ReelInspiration).title + ' (copia)',
    status: 'hidden',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data as ReelInspiration })
}