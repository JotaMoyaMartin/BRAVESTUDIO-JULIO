import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Vista previa de la planificación para la CLIENTA (enlace público, sin cuenta).
 * Antes leía y guardaba en el navegador de quien lo abría: las aprobaciones
 * nunca llegaban al equipo. Ahora va contra la base de datos.
 * GET  ?token=…                              → planificación y nombre del salón.
 * POST {token, accion:'aprobar'|'cambios'|'prioridad', texto?} → la guarda y avisa a su CM (tarea + aviso).
 */

type Planning = { id: string; clientId: string; week: number; status: string; clientComment?: string; shareToken?: string | null; [k: string]: unknown }
type Client = { id: string; name?: string; salonName?: string; cmId?: string | null }

async function find(token: string) {
  const db = createAdminClient()
  const { data } = await db.from('team_records').select('id, data').eq('kind', 'planning').eq('deleted', false).eq('data->>shareToken', token).limit(1).maybeSingle()
  if (!data) return null
  const planning = (data as { data: Planning }).data
  const { data: c } = await db.from('team_records').select('data').eq('kind', 'client').eq('id', planning.clientId).maybeSingle()
  return { db, planning, client: ((c as { data?: Client } | null)?.data ?? null) as Client | null }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  if (token.length < 8) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const r = await find(token).catch(() => null)
  if (!r) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ planning: r.planning, client: r.client ? { id: r.client.id, name: r.client.name, salonName: r.client.salonName } : null })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (!rateLimit(`preview:${ip}`, 20, 10 * 60_000).ok) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })
  let b: { token?: string; accion?: string; texto?: string }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const r = await find(String(b.token ?? '')).catch(() => null)
  if (!r) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const { db, planning, client } = r
  const texto = String(b.texto ?? '').trim().slice(0, 4000)
  const now = new Date().toISOString()
  const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const name = client?.name ?? 'La clienta'
  const rows: Array<{ kind: string; id: string; data: unknown }> = []

  if (b.accion === 'aprobar') {
    rows.push({ kind: 'planning', id: planning.id, data: { ...planning, status: 'aprobada', clientComment: '', updatedAt: now } })
    rows.push({ kind: 'notification', id: `n-${stamp()}`, data: { id: `n-${stamp()}`, type: 'approval', message: `${name} ha aprobado la planificación (sem ${planning.week}).`, clientId: planning.clientId, createdAt: now, read: false } })
  } else if (b.accion === 'cambios' || b.accion === 'prioridad') {
    if (!texto) return NextResponse.json({ error: 'Escribe tu comentario' }, { status: 400 })
    const cambios = b.accion === 'cambios'
    if (cambios) rows.push({ kind: 'planning', id: planning.id, data: { ...planning, status: 'cambios', clientComment: texto, updatedAt: now } })
    const taskId = `task-${stamp()}`
    rows.push({
      kind: 'task', id: taskId, data: {
        id: taskId, clientId: planning.clientId, planningId: planning.id, publicationId: null,
        title: cambios ? `Correcciones de ${name} (sem ${planning.week})` : `Prioridad para próxima semana · ${name}`,
        description: texto, type: cambios ? 'correction' : 'priority_note', status: 'pendiente', priority: 'alta',
        assignedTo: client?.cmId ?? null, requestedByRole: 'client', requestedById: null, attachments: [], referenceLinks: [],
        createdAt: now, updatedAt: now, dueDate: null,
      },
    })
    const nId = `n-${stamp()}`
    rows.push({ kind: 'notification', id: nId, data: { id: nId, type: cambios ? 'change' : 'review', message: cambios ? `${name} ha pedido cambios en la planificación (sem ${planning.week}). Revisa las tareas.` : `${name} ha dejado una nota de prioridad para la próxima semana.`, clientId: planning.clientId, createdAt: now, read: false } })
  } else {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  const { error } = await db.from('team_records').upsert(rows.map(x => ({ ...x, deleted: false, updated_at: now })) as never, { onConflict: 'kind,id' })
  if (error) return NextResponse.json({ error: 'No se ha podido guardar' }, { status: 500 })
  return NextResponse.json({ ok: true, planning: rows.find(x => x.kind === 'planning')?.data ?? planning })
}
