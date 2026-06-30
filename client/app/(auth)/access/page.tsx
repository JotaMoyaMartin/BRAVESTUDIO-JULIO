import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasActiveAccess } from '@/lib/access'
import { Profile } from '@/types/database'
import AccessClient from './AccessClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function AccessPage() {
  if (!IS_CONFIGURED) {
    // Dev mode — show pricing page with a demo profile
    const demoProfile: Profile = {
      id: 'demo', email: 'demo@bravestudio.com', full_name: null, salon_name: null,
      is_active: false, role: 'user', access_status: 'inactive', access_source: 'none',
      stripe_customer_id: null, stripe_subscription_id: null,
      subscription_status: 'none', subscription_plan: null, promo_code_used: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    return <AccessClient profile={demoProfile} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const typedProfile = profile as Profile | null
  if (typedProfile && hasActiveAccess(typedProfile)) redirect('/inicio')

  return <AccessClient profile={typedProfile} />
}
