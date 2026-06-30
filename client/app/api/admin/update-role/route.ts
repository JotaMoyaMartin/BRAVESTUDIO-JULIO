import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ROLES = ['user', 'admin', 'superadmin'] as const
type Role = (typeof VALID_ROLES)[number]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!myProfile || (myProfile.role !== 'admin' && myProfile.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { userId, role } = await request.json()

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
  }

  // No cambiar el propio rol
  if (userId === user.id) {
    return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
  }

  // Leer el perfil objetivo para comprobar su rol actual
  const adminClient = createAdminClient()
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const targetRole = targetProfile.role as Role
  const myRole = myProfile.role as Role

  // Solo superadmin puede asignar superadmin
  if (role === 'superadmin' && myRole !== 'superadmin') {
    return NextResponse.json({ error: 'Solo un superadmin puede asignar el rol superadmin' }, { status: 403 })
  }

  // Solo superadmin puede modificar el rol de un superadmin
  if (targetRole === 'superadmin' && myRole !== 'superadmin') {
    return NextResponse.json({ error: 'Sin permisos para modificar a un superadmin' }, { status: 403 })
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}