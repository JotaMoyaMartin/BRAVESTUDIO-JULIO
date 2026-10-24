import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * EQUIPO BRÄVE · cuentas y roles (admin).
 * GET                                          → personas del equipo.
 * POST {accion:'crear', email, name, role, member_id} → cuenta (si no existe) + ficha en el equipo.
 *                                                Devuelve una contraseña temporal si la cuenta es nueva.
 * POST {accion:'quitar', profile_id}           → deja de ser del equipo (la cuenta no se borra).
 * POST {accion:'nueva-clave', profile_id}      → contraseña temporal nueva.
 */

const ROLES = ['admin', 'cm', 'editor', 'designer']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (data as { role?: string } | null)?.role
  return role === 'admin' || role === 'superadmin' ? createAdminClient() : null
}

const tempPassword = () => `Brave-${randomBytes(5).toString('hex')}`

function missing(e: { message?: string } | null) {
  return !!e && /team_members|relation|schema cache/i.test(e.message ?? '')
}

export async function GET() {
  const db = await requireAdmin()
  if (!db) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db.from('team_members').select('profile_id, member_id, name, role, created_at').order('created_at')
  if (error) return missing(error) ? NextResponse.json({ missingTable: true, miembros: [] }) : NextResponse.json({ error: error.message }, { status: 500 })
  const ids = (data ?? []).map(r => (r as { profile_id: string }).profile_id)
  const { data: profs } = ids.length ? await db.from('profiles').select('id, email').in('id', ids) : { data: [] }
  const email = new Map((profs ?? []).map(p => [(p as { id: string }).id, (p as { email: string }).email]))
  return NextResponse.json({ miembros: (data ?? []).map(r => ({ ...r, email: email.get((r as { profile_id: string }).profile_id) ?? null })) })
}

export async function POST(req: NextRequest) {
  const db = await requireAdmin()
  if (!db) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let b: Record<string, string>
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (b.accion === 'crear') {
    const email = String(b.email ?? '').trim().toLowerCase()
    const name = String(b.name ?? '').trim().slice(0, 80)
    const role = String(b.role ?? '')
    const memberId = String(b.member_id ?? '').trim() || `tm-${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}`
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return NextResponse.json({ error: 'Email no válido' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Pon el nombre' }, { status: 400 })
    if (!ROLES.includes(role)) return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })

    let password: string | null = null
    const { data: existing } = await db.from('profiles').select('id').ilike('email', email).maybeSingle()
    let profileId = (existing as { id?: string } | null)?.id ?? null
    if (!profileId) {
      password = tempPassword()
      const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
      if (error || !created.user) return NextResponse.json({ error: error?.message ?? 'No se ha podido crear la cuenta' }, { status: 500 })
      profileId = created.user.id
      await db.from('profiles').update({ full_name: name } as never).eq('id', profileId)
    }
    const { error } = await db.from('team_members').upsert({ profile_id: profileId, member_id: memberId, name, role } as never, { onConflict: 'profile_id' })
    if (error) {
      if (missing(error)) return NextResponse.json({ missingTable: true }, { status: 409 })
      if (/member_id/.test(error.message)) return NextResponse.json({ error: 'Esa ficha del panel ya la tiene otra persona.' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, password })
  }

  if (b.accion === 'quitar') {
    const { error } = await db.from('team_members').delete().eq('profile_id', String(b.profile_id))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (b.accion === 'nueva-clave') {
    const password = tempPassword()
    const { error } = await db.auth.admin.updateUserById(String(b.profile_id), { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, password })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
