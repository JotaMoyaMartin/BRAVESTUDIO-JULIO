import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { canUseTeam, currentUser, ensureMaterialBucket, isMissingTable } from '@/lib/equipo/server'
import { MATERIAL_BUCKET, MAX_FILES, MAX_FILE_MB, materialPath, type Archivo } from '@/lib/equipo/types'

/**
 * MI EQUIPO BRÄVE (clientas del servicio).
 * GET                       → sus peticiones (material e ideas) con su estado.
 * POST {accion:'subir', archivos:[{name,size,type}]} → enlaces para subir fotos/vídeos directo al almacenamiento.
 * POST {accion:'enviar', tipo, titulo?, mensaje?, archivos?, origen?} → crea la petición para el equipo.
 */

export async function GET() {
  const me = await currentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUseTeam(me.role)) return NextResponse.json({ error: 'Solo para clientas del servicio' }, { status: 403 })
  const db = createAdminClient()
  const { data, error } = await db.from('equipo_peticiones').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(50)
  if (error) return isMissingTable(error) ? NextResponse.json({ missingTable: true, peticiones: [] }) : NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ peticiones: data ?? [] })
}

export async function POST(req: NextRequest) {
  const me = await currentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUseTeam(me.role)) return NextResponse.json({ error: 'Solo para clientas del servicio' }, { status: 403 })
  const rl = rateLimit(`equipo:${me.id}`, 30, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Demasiados envíos seguidos. Espera unos minutos.' }, { status: 429 })

  let body: {
    accion?: 'subir' | 'enviar'
    archivos?: Array<Partial<Archivo>>
    tipo?: 'material' | 'idea'
    titulo?: string
    mensaje?: string
    origen?: { seccion?: string; texto?: string }
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const db = createAdminClient()

  if (body.accion === 'subir') {
    const files = (body.archivos ?? []).slice(0, MAX_FILES)
    if (!files.length) return NextResponse.json({ error: 'No hay archivos' }, { status: 400 })
    for (const f of files) {
      if (!/^(image|video)\//.test(f.type ?? '')) return NextResponse.json({ error: `«${f.name}» no es una foto ni un vídeo.` }, { status: 400 })
      if ((f.size ?? 0) > MAX_FILE_MB * 1024 * 1024) return NextResponse.json({ error: `«${f.name}» pesa más de ${MAX_FILE_MB} MB.` }, { status: 413 })
    }
    await ensureMaterialBucket(db)
    const batch = Date.now().toString(36)
    const out = []
    for (const f of files) {
      const path = materialPath(me.id, batch, f.name ?? 'archivo')
      const { data, error } = await db.storage.from(MATERIAL_BUCKET).createSignedUploadUrl(path)
      if (error || !data) return NextResponse.json({ error: 'No se ha podido preparar la subida.' }, { status: 500 })
      out.push({ path, token: data.token, name: f.name, size: f.size, type: f.type })
    }
    return NextResponse.json({ subidas: out, bucket: MATERIAL_BUCKET })
  }

  if (body.accion === 'enviar') {
    const tipo = body.tipo === 'material' ? 'material' : 'idea'
    const titulo = (body.titulo ?? '').trim().slice(0, 140) || null
    const mensaje = (body.mensaje ?? '').trim().slice(0, 4000) || null
    const archivos = (body.archivos ?? [])
      .filter(a => typeof a.path === 'string' && a.path.startsWith(`u/${me.id}/`))
      .slice(0, MAX_FILES)
      .map(a => ({ path: a.path!, name: String(a.name ?? '').slice(0, 120), size: Number(a.size) || 0, type: String(a.type ?? '') }))
    if (tipo === 'material' && !archivos.length) return NextResponse.json({ error: 'Sube al menos una foto o un vídeo.' }, { status: 400 })
    if (tipo === 'idea' && !titulo && !mensaje) return NextResponse.json({ error: 'Cuéntale a tu equipo tu idea.' }, { status: 400 })
    const origen = body.origen ? { seccion: String(body.origen.seccion ?? '').slice(0, 60), texto: String(body.origen.texto ?? '').slice(0, 4000) } : null
    const { data, error } = await db.from('equipo_peticiones').insert({ user_id: me.id, tipo, titulo, mensaje, archivos, origen } as never).select('*').single()
    if (error) return isMissingTable(error) ? NextResponse.json({ missingTable: true }, { status: 409 }) : NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ peticion: data })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
