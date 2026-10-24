import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { KINDS, findDataUrls, replaceStrings, type Change } from '@/lib/team/sync/records'

/**
 * EQUIPO · SINCRONIZACIÓN (Fase 1).
 * GET  ?since=ISO   → registros del equipo (cambiados desde «since», o todos).
 * POST {changes}    → guarda cambios. Las imágenes incrustadas (data:…) se suben
 *                     al almacenamiento y se guardan como enlace (no pesan en la base).
 * El middleware ya exige sesión de alguien del equipo.
 */
export const maxDuration = 60
const MEDIA_BUCKET = 'team-media'
const MAX_CHANGES = 500

async function session() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { supabase, user } : null
}

export async function GET(req: NextRequest) {
  const s = await session()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const since = req.nextUrl.searchParams.get('since')
  const out: unknown[] = []
  for (let from = 0; ; from += 1000) {
    let q = s.supabase.from('team_records').select('kind, id, data, deleted, updated_at').order('updated_at').range(from, from + 999)
    if (since) q = q.gt('updated_at', since)
    const { data, error } = await q
    if (error) {
      if (/team_records|relation|schema cache/i.test(error.message)) return NextResponse.json({ missingTable: true, records: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return NextResponse.json({ records: out, now: new Date().toISOString() })
}

async function uploadDataUrls(data: unknown, kind: string, id: string): Promise<unknown> {
  const found = findDataUrls(data)
  if (!found.size) return data
  const admin = createAdminClient()
  const { data: buckets } = await admin.storage.listBuckets()
  if (!(buckets ?? []).some(b => b.name === MEDIA_BUCKET)) await admin.storage.createBucket(MEDIA_BUCKET, { public: true })
  const map = new Map<string, string>()
  for (const url of found) {
    const m = url.match(/^data:([^;]+);base64,([\s\S]*)$/)
    if (!m) continue
    const bytes = Buffer.from(m[2], 'base64')
    const ext = (m[1].split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin'
    const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 16)
    const path = `${kind}/${id.replace(/[^a-zA-Z0-9_-]/g, '_')}/${hash}.${ext}`
    const { error } = await admin.storage.from(MEDIA_BUCKET).upload(path, bytes, { contentType: m[1], upsert: true })
    if (error) continue // si falla, se guarda tal cual (no se pierde nada)
    map.set(url, admin.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl)
  }
  return replaceStrings(data, map)
}

export async function POST(req: NextRequest) {
  const s = await session()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { changes?: Change[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const changes = (body.changes ?? []).filter(c => (KINDS as readonly string[]).includes(c?.kind) && typeof c.id === 'string' && c.id.length <= 200).slice(0, MAX_CHANGES)
  if (!changes.length) return NextResponse.json({ ok: true, saved: [] })

  const now = new Date().toISOString()
  const rows = []
  const replaced: Array<{ kind: string; id: string; data: unknown }> = []
  for (const c of changes) {
    if (c.deleted) { rows.push({ kind: c.kind, id: c.id, data: {}, deleted: true, updated_at: now, updated_by: s.user.id }); continue }
    const data = await uploadDataUrls(c.data, c.kind, c.id)
    if (data !== c.data) replaced.push({ kind: c.kind, id: c.id, data })
    rows.push({ kind: c.kind, id: c.id, data, deleted: false, updated_at: now, updated_by: s.user.id })
  }
  const { error } = await s.supabase.from('team_records').upsert(rows as never, { onConflict: 'kind,id' })
  if (error) {
    if (/team_records|relation|schema cache/i.test(error.message)) return NextResponse.json({ missingTable: true }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // Devuelve los elementos cuyas imágenes pasaron a enlace, para actualizar la copia local.
  return NextResponse.json({ ok: true, now, replaced })
}
