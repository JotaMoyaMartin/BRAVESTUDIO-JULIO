import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import { Profile, PromoCode } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export interface UserStats {
  contentCount: number
  lastActivity: string | null
  brandComplete: boolean
  brandUpdatedAt: string | null
}

export default async function AdminPage() {
  if (!IS_CONFIGURED) {
    return <AdminClient currentUserId="demo" currentUserRole="superadmin" users={[]} promoCodes={[]} userStats={{}} />
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (myProfile as { role: string } | null)?.role
  if (role !== 'admin' && role !== 'superadmin') redirect('/inicio')

  const adminClient = createAdminClient()

  const [{ data: users }, { data: promoCodes }, { data: contentItems }, { data: brandProfiles }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
    // RLS de content_items y brand_profiles es por usuario -> usar admin client (service role)
    adminClient.from('content_items').select('user_id, created_at'),
    adminClient.from('brand_profiles').select('user_id, completion_status, updated_at'),
  ])

  // Agregar stats por usuario
  const userStats: Record<string, UserStats> = {}
  for (const item of (contentItems as { user_id: string; created_at: string }[]) || []) {
    const uid = item.user_id
    if (!userStats[uid]) userStats[uid] = { contentCount: 0, lastActivity: null, brandComplete: false, brandUpdatedAt: null }
    userStats[uid].contentCount++
    if (!userStats[uid].lastActivity || item.created_at > userStats[uid].lastActivity!) {
      userStats[uid].lastActivity = item.created_at
    }
  }
  for (const bp of (brandProfiles as { user_id: string; completion_status: string; updated_at: string }[]) || []) {
    const uid = bp.user_id
    if (!userStats[uid]) userStats[uid] = { contentCount: 0, lastActivity: null, brandComplete: false, brandUpdatedAt: null }
    userStats[uid].brandComplete = bp.completion_status === 'complete'
    userStats[uid].brandUpdatedAt = bp.updated_at
  }

  return (
    <AdminClient
      currentUserId={user.id}
      currentUserRole={role!}
      users={(users as Profile[]) || []}
      promoCodes={(promoCodes as PromoCode[]) || []}
      userStats={userStats}
    />
  )
}