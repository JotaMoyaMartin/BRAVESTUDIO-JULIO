import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIStatus, runAIProbe } from '@/lib/ai/monitor'

/**
 * Estado de la IA para el panel de admin.
 * GET  → resumen (luz verde/ámbar/rojo, fallos de hoy, último fallo).
 * POST → «Probar ahora»: hace una pregunta real a la IA y devuelve el estado.
 */

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return !!profile && (profile.role === 'admin' || profile.role === 'superadmin')
}

async function status() {
  try {
    return NextResponse.json({ status: await getAIStatus() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // La tabla aún no existe: falta pegar el SQL en Supabase.
    if (/ai_status_log|relation|schema cache/i.test(msg)) return NextResponse.json({ status: null, missingTable: true })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return status()
}

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const probe = await runAIProbe()
  const res = await status()
  const body = await res.json()
  return NextResponse.json({ ...body, probe })
}
