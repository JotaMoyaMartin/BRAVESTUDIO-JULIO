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

export interface DashboardMetrics {
  totalUsers: number
  activeUsers: number
  newThisWeek: number
  canceledThisMonth: number
  trialUsers: number
  mrr: number | null
}

async function computeMRR(): Promise<number | null> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' as any })
    let mrr = 0
    let hasMore = true
    let startingAfter: string | undefined
    while (hasMore) {
      const list = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['items.data.price'],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      for (const sub of list.data) {
        const item = sub.items.data[0]
        const price = item?.price
        if (!price) continue
        const amount = price.unit_amount ?? 0
        if (price.recurring?.interval === 'year') {
          mrr += amount / 12
        } else {
          mrr += amount
        }
      }
      hasMore = list.has_more
      if (hasMore && list.data.length > 0) {
        startingAfter = list.data[list.data.length - 1].id
      }
    }
    // mrr is in cents, convert to euros
    return Math.round(mrr / 100)
  } catch {
    return null
  }
}

export default async function AdminPage() {
  if (!IS_CONFIGURED) {
    return (
      <AdminClient
        currentUserId="demo"
        currentUserRole="superadmin"
        users={[]}
        promoCodes={[]}
        userStats={{}}
        metrics={{ totalUsers: 0, activeUsers: 0, newThisWeek: 0, canceledThisMonth: 0, trialUsers: 0, mrr: null }}
      />
    )
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (myProfile as { role: string } | null)?.role
  if (role !== 'admin' && role !== 'superadmin') redirect('/no-permissions')

  const adminClient = createAdminClient()

  const [{ data: users }, { data: promoCodes }, { data: contentItems }, { data: brandProfiles }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
    adminClient.from('content_items').select('user_id, created_at'),
    adminClient.from('brand_profiles').select('user_id, completion_status, updated_at'),
  ])

  const profiles = (users as Profile[]) || []
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  let activeUsers = 0
  let newThisWeek = 0
  let canceledThisMonth = 0
  let trialUsers = 0

  for (const u of profiles) {
    // Active: access_status active OR subscription active/trialing OR is_active legacy
    const isActive =
      u.access_status === 'active' ||
      u.subscription_status === 'active' ||
      u.subscription_status === 'trialing' ||
      u.is_active === true
    if (isActive) activeUsers++
    if (new Date(u.created_at) >= weekAgo) newThisWeek++
    if (u.subscription_status === 'canceled' && new Date(u.created_at) >= monthStart) {
      // Approximate: canceled this month — updated_at would be better but created_at is what we have
      canceledThisMonth++
    }
    if (u.subscription_status === 'trialing') trialUsers++
  }

  const mrr = await computeMRR()

  const metrics: DashboardMetrics = {
    totalUsers: profiles.length,
    activeUsers,
    newThisWeek,
    canceledThisMonth,
    trialUsers,
    mrr,
  }

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
      users={profiles}
      promoCodes={(promoCodes as PromoCode[]) || []}
      userStats={userStats}
      metrics={metrics}
    />
  )
}