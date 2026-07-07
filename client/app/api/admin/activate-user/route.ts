import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Profile } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, admin: createAdminClient(), actorId: user.id }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const { userId, activate } = body as { userId?: string; activate?: boolean }
  if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 })
  if (typeof activate !== 'boolean') return NextResponse.json({ error: 'Falta activate (bool)' }, { status: 400 })

  const update: Record<string, unknown> = {
    access_status: activate ? 'active' : 'inactive',
    is_active: activate,
  }
  if (activate) {
    // Siempre manual al activar desde admin (incluso si era 'none')
    update.access_source = 'manual'
    update.activated_by = auth.actorId
    update.activated_at = new Date().toISOString()
  }

  const { data, error } = await auth.admin
    .from('profiles')
    .update(update)
    .eq('id', userId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log actividad
  await auth.admin.rpc('log_user_activity', {
    p_user_id: userId,
    p_event: activate ? 'access_activated' : 'access_deactivated',
    p_data: JSON.stringify({ reason: 'admin_panel' }),
    p_actor: auth.actorId,
  })

  return NextResponse.json({ user: data as Profile })
}