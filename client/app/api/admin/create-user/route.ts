import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const body = await request.json()
  const { email, password, full_name, role, grantAccess, city, salon_name, professional_role } = body as {
    email?: string
    password?: string
    full_name?: string
    role?: 'user' | 'admin' | 'superadmin'
    grantAccess?: boolean
    city?: string
    salon_name?: string
    professional_role?: string
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }
  if (role && role !== 'user' && role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
  }
  // Solo superadmin puede crear admins
  if (role && role !== 'user' && myProfile.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo un superadmin puede asignar roles de admin' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // 1. Crear el usuario en auth.users con email ya confirmado (sin necesidad de validar email)
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : undefined,
  })

  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message ?? 'No se pudo crear el usuario' }, { status: 500 })
  }

  const newUserId = created.user.id

  // 2. El trigger on_auth_user_created ya insertó un profile base.
  // Lo actualizamos con los campos opcionales.
  const update: Record<string, unknown> = {}
  if (full_name) update.full_name = full_name
  if (city !== undefined) update.city = city
  if (salon_name !== undefined) update.salon_name = salon_name
  if (professional_role !== undefined) update.professional_role = professional_role
  if (role) update.role = role
  update.signup_method = 'admin_create'
  if (grantAccess) {
    update.access_status = 'active'
    update.access_source = 'manual'
    update.is_active = true
    update.activated_by = user.id
    update.activated_at = new Date().toISOString()
  }

  if (Object.keys(update).length > 0) {
    const { error: updErr } = await adminClient
      .from('profiles')
      .update(update)
      .eq('id', newUserId)

    if (updErr) {
      // El usuario ya está creado en auth.users; el profile base ya existe por trigger.
      // No lo borraremos — avisamos del problema pero devolvemos el usuario.
      return NextResponse.json({
        ok: true,
        warning: 'Usuario creado pero no se pudieron actualizar los campos extra: ' + updErr.message,
        userId: newUserId,
      })
    }
  }

  try {
    await adminClient.rpc('log_user_activity', {
      p_user_id: newUserId,
      p_event: 'account_created',
      p_data: JSON.stringify({ signup_method: 'admin_create' }),
      p_actor: user.id,
    })
    if (grantAccess) {
      await adminClient.rpc('log_user_activity', {
        p_user_id: newUserId,
        p_event: 'access_activated',
        p_data: JSON.stringify({ reason: 'admin_create' }),
        p_actor: user.id,
      })
    }
  } catch (logErr) {
    console.error('log_user_activity failed:', logErr)
  }

  // 3. Devolver el profile final
  const { data: finalProfile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', newUserId)
    .single()

  return NextResponse.json({ ok: true, user: finalProfile })
}