import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { activateSkoolAccess } from '@/lib/skool/server'

/**
 * Paso 2 de «Entra con tu email», ya con sesión: si su email está en la lista
 * de Skool, se activa (o se renueva) su acceso. Devuelve a dónde ir.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let active = false
  try {
    active = await activateSkoolAccess(user.id, user.email)
  } catch (e) {
    console.error('[skool] activar', e)
  }
  return NextResponse.json({ ok: true, active })
}
