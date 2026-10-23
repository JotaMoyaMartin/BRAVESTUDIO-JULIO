import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isEmail, normalizeEmail, type SkoolRow } from '@/lib/skool/members'
import { isMissingTable, syncSkoolList } from '@/lib/skool/sync'

/**
 * MIEMBROS DE SKOOL (admin).
 * GET               → resumen (activas, bajas, última subida) y, con ?q=, el estado de un email.
 * POST {rows}       → vista previa: altas, bajas y alumnas de la app afectadas. No cambia nada.
 * POST {rows, apply}→ aplica: altas activas; bajas con margen de días; quien vuelve recupera el acceso.
 * POST {add}        → añade un email suelto (alguien que acaba de entrar en Skool).
 */

type DB = ReturnType<typeof createAdminClient>

async function requireAdmin(): Promise<{ db: DB; email: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) return null
  return { db: createAdminClient(), email: user.email ?? '' }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { db } = auth
  try {
    const q = normalizeEmail(req.nextUrl.searchParams.get('q') ?? '')
    if (q) {
      const { data: m } = await db.from('skool_members').select('email, name, status, first_seen_at, last_seen_at, removed_at').eq('email', q).maybeSingle()
      const { data: p } = await db.from('profiles').select('full_name, access_source, access_status, access_expires_at').ilike('email', q).maybeSingle()
      return NextResponse.json({ member: m, profile: p })
    }
    const [{ count: activas, error: e1 }, { count: bajas }, { data: last }] = await Promise.all([
      db.from('skool_members').select('email', { count: 'exact', head: true }).eq('status', 'activo'),
      db.from('skool_members').select('email', { count: 'exact', head: true }).eq('status', 'baja'),
      db.from('skool_imports').select('created_at, total, nuevas, bajas').order('created_at', { ascending: false }).limit(1),
    ])
    if (e1) throw e1
    return NextResponse.json({ activas: activas ?? 0, bajas: bajas ?? 0, ultima: last?.[0] ?? null })
  } catch (e) {
    if (isMissingTable(e)) return NextResponse.json({ missingTable: true })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { db } = auth
  let body: { rows?: SkoolRow[]; apply?: boolean; force?: boolean; add?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  try {
    // Añadir un email suelto.
    if (body.add !== undefined) {
      const email = normalizeEmail(body.add)
      if (!isEmail(email)) return NextResponse.json({ error: 'Email no válido' }, { status: 400 })
      const { error } = await db.from('skool_members').upsert({ email, status: 'activo', last_seen_at: new Date().toISOString(), removed_at: null } as never, { onConflict: 'email' })
      if (error) throw error
      // Si ya usaba la app y estaba en margen de baja, recupera el acceso.
      await db.from('profiles').update({ access_expires_at: null, access_status: 'active', is_active: true } as never).ilike('email', email).eq('access_source', 'skool')
      return NextResponse.json({ ok: true })
    }

    const r = await syncSkoolList(db, body.rows ?? [], { apply: !!body.apply, force: !!body.force, by: auth.email })
    return NextResponse.json(r.body, { status: r.status })
  } catch (e) {
    if (isMissingTable(e)) return NextResponse.json({ missingTable: true }, { status: 409 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
