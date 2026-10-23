import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseSkoolCsv } from '@/lib/skool/members'
import { isMissingTable, syncSkoolList } from '@/lib/skool/sync'

/**
 * Sincronización semanal de Skool para un agente automático.
 * POST con «Authorization: Bearer SKOOL_SYNC_SECRET» y el CSV exportado de
 * Skool como cuerpo (text/csv). ?preview=1 solo devuelve el resumen.
 * Si la lista es sospechosamente corta NO se aplica (protege de borrar a todas):
 * hay que subirla a mano desde Admin → Skool.
 */
export const maxDuration = 60

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function POST(req: NextRequest) {
  const secret = process.env.SKOOL_SYNC_SECRET
  if (!secret?.trim()) return NextResponse.json({ error: 'skool_sync_not_configured' }, { status: 503 })
  if (!safeEqual(req.headers.get('authorization') ?? '', `Bearer ${secret}`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const text = await req.text()
  if (text.length > 5_000_000) return NextResponse.json({ error: 'too_big' }, { status: 413 })
  const { rows } = parseSkoolCsv(text)
  try {
    const r = await syncSkoolList(createAdminClient(), rows, { apply: req.nextUrl.searchParams.get('preview') !== '1', force: false, by: 'agente-semanal' })
    return NextResponse.json(r.body, { status: r.status })
  } catch (e) {
    if (isMissingTable(e)) return NextResponse.json({ error: 'falta SQL-ACCESO-SKOOL.sql' }, { status: 409 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
