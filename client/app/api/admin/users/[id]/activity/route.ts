import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserActivityLog, PromoRedemption } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, admin: createAdminClient() }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const [logs, promos] = await Promise.all([
    auth.admin
      .from('user_activity_log')
      .select('*')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
    auth.admin
      .from('promo_redemptions')
      .select('*')
      .eq('user_id', params.id)
      .order('redeemed_at', { ascending: false }),
  ])

  if (logs.error) return NextResponse.json({ error: logs.error.message }, { status: 500 })

  return NextResponse.json({
    logs: (logs.data as UserActivityLog[]) || [],
    promos: (promos.data as PromoRedemption[]) || [],
  })
}