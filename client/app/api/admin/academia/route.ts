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
  // Accept both /share/VIDEO_ID and /embed/VIDEO_ID
  const match = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
  if (match) return `https://www.loom.com/embed/${match[1]}`
  // If it's already an embed URL without www
  if (trimmed.includes('/embed/')) return trimmed.replace(/^http:\/\//, 'https://')
  // Fallback: return as-is (might be a full embed URL already)
  return trimmed
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const [modulesRes, lessonsRes] = await Promise.all([
    auth.admin.from('academia_modules').select('*').order('sort_order', { ascending: true }),
    auth.admin.from('academia_lessons').select('*').order('sort_order', { ascending: true }),
  ])
  if (modulesRes.error) return NextResponse.json({ error: modulesRes.error.message }, { status: 500 })
  if (lessonsRes.error) return NextResponse.json({ error: lessonsRes.error.message }, { status: 500 })
  return NextResponse.json({
    modules: (modulesRes.data as AcademiaModule[]) || [],
    lessons: (lessonsRes.data as AcademiaLesson[]) || [],
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const body = await request.json()
  const { type } = body

  if (type === 'module') {
    const { title, description, sort_order, status } = body
    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })
    }
    const payload = {
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      sort_order: typeof sort_order === 'number' ? sort_order : 0,
      status: status === 'hidden' ? 'hidden' : 'active',
    }
    const { data, error } = await auth.admin.from('academia_modules').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data as AcademiaModule })
  }

  if (type === 'lesson') {
    const { module_id, title, description, loom_url, sort_order, status } = body
    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })
    }
    if (!loom_url || !String(loom_url).trim()) {
      return NextResponse.json({ error: 'La URL de Loom es obligatoria' }, { status: 400 })
    }
    const payload = {
      module_id: module_id || null,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      loom_url: normalizeLoomUrl(String(loom_url)),
      sort_order: typeof sort_order === 'number' ? sort_order : 0,
      status: status === 'hidden' ? 'hidden' : 'active',
    }
    const { data, error } = await auth.admin.from('academia_lessons').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data as AcademiaLesson })
  }

  return NextResponse.json({ error: 'Tipo inválido (usar "module" o "lesson")' }, { status: 400 })
}