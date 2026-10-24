import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentUser, isMissingTable, isTeam } from '@/lib/equipo/server'
import { MATERIAL_BUCKET } from '@/lib/equipo/types'

/**
 * EQUIPO BRÄVE (admin): lo que envían las clientas del servicio y su calendario.
 * GET ?vista=peticiones[&estado=]       → peticiones de todas, con nombre del salón.
 * POST {accion:'peticion', id, estado?, respuesta?}
 * POST {accion:'archivo', path}          → enlace temporal para ver/descargar.
 */

const ESTADOS_PET = ['nueva', 'en-marcha', 'hecha']

async function guard() {
  const me = await currentUser()
  return me && isTeam(me.role) ? createAdminClient() : null
}

function fail(e: unknown) {
  if (isMissingTable(e)) return NextResponse.json({ missingTable: true }, { status: 409 })
  return NextResponse.json({ error: (e as { message?: string })?.message ?? 'error' }, { status: 500 })
}

export async function GET(req: NextRequest) {
  const db = await guard()
  if (!db) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const p = req.nextUrl.searchParams
  try {
    if (p.get('vista') === 'enlaces') {
      const [{ data: cl, error: e1 }, { data: cuentas }] = await Promise.all([
        db.from('team_records').select('id, data').eq('kind', 'client').eq('deleted', false),
        db.from('profiles').select('id, email, full_name, salon_name').eq('role', 'premium').order('salon_name'),
      ])
      if (e1) throw e1
      const clientes = (cl ?? []).map(r => {
        const d = (r as { data: { name?: string; salonName?: string; supabase_user_id?: string } }).data
        return { id: (r as { id: string }).id, name: d.name ?? '', salonName: d.salonName ?? '', supabase_user_id: d.supabase_user_id ?? null }
      }).sort((a, b) => a.name.localeCompare(b.name))
      return NextResponse.json({ clientes, cuentas: cuentas ?? [] })
    }
    let q = db.from('equipo_peticiones').select('*').order('created_at', { ascending: false }).limit(200)
    const estado = p.get('estado')
    if (estado && ESTADOS_PET.includes(estado)) q = q.eq('estado', estado)
    const { data, error } = await q
    if (error) throw error
    const ids = [...new Set((data ?? []).map(r => (r as { user_id: string }).user_id))]
    const { data: profs } = ids.length ? await db.from('profiles').select('id, email, full_name, salon_name').in('id', ids) : { data: [] }
    const byId = new Map((profs ?? []).map(x => [(x as { id: string }).id, x]))
    return NextResponse.json({ peticiones: (data ?? []).map(r => ({ ...r, perfil: byId.get((r as { user_id: string }).user_id) ?? null })) })
  } catch (e) { return fail(e) }
}

export async function POST(req: NextRequest) {
  const db = await guard()
  if (!db) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)
  const now = new Date().toISOString()
  try {
    switch (b.accion) {
      case 'peticion': {
        const patch: Record<string, unknown> = { updated_at: now }
        if (typeof b.estado === 'string' && ESTADOS_PET.includes(b.estado)) patch.estado = b.estado
        if (b.respuesta !== undefined) patch.respuesta = str(b.respuesta, 2000) || null
        const { error } = await db.from('equipo_peticiones').update(patch as never).eq('id', String(b.id))
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'archivo': {
        const path = String(b.path ?? '')
        if (!path.startsWith('u/')) return NextResponse.json({ error: 'Ruta no válida' }, { status: 400 })
        const { data, error } = await db.storage.from(MATERIAL_BUCKET).createSignedUrl(path, 3600, { download: b.descargar === true })
        if (error || !data) throw error ?? new Error('sin enlace')
        return NextResponse.json({ url: data.signedUrl })
      }
      case 'enlazar': {
        // Enlaza la ficha de la clienta en el panel del equipo con su cuenta de la app.
        const id = String(b.client_id ?? '')
        const { data: row, error: e1 } = await db.from('team_records').select('data').eq('kind', 'client').eq('id', id).maybeSingle()
        if (e1 || !row) return NextResponse.json({ error: 'Clienta no encontrada' }, { status: 404 })
        const data = { ...(row as { data: Record<string, unknown> }).data }
        if (typeof b.user_id === 'string' && b.user_id) data.supabase_user_id = b.user_id
        else delete data.supabase_user_id
        const { error } = await db.from('team_records').update({ data, updated_at: now } as never).eq('kind', 'client').eq('id', id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  } catch (e) { return fail(e) }
}
