import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReelTransition } from '@/types/database'

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

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const { data, error } = await auth.admin
    .from('reel_transitions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: (data as ReelTransition[]) || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const body = await request.json()
  const { title, short_description, description, idea_text, why_text, how_text, cover_image, instagram_url, status } = body
  if (!title || !short_description || !description || !cover_image) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }
  const payload = {
    title: String(title).trim(),
    short_description: String(short_description).trim(),
    description: String(description).trim(),
    idea_text: idea_text ? String(idea_text).trim() : null,
    why_text: why_text ? String(why_text).trim() : null,
    how_text: how_text ? String(how_text).trim() : null,
    cover_image: String(cover_image),
    instagram_url: instagram_url ? String(instagram_url).trim() : null,
    status: status === 'hidden' ? 'hidden' : 'active',
  }
  const { data, error } = await auth.admin.from('reel_transitions').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data as ReelTransition })
}