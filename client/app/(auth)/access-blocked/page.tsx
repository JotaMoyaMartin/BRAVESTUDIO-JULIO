import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasActiveAccess } from '@/lib/access'
import { Profile } from '@/types/database'
import AccessBlockedClient from './AccessBlockedClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function AccessBlockedPage() {
  if (!IS_CONFIGURED) {
    // Dev mode — show blocked page with a demo profile
    const demoProfile: Profile = {
      id: 'demo', email: 'demo@bravestudio.com', full_name: null, salon_name: null,
      is_active: false, role: 'user', access_status: 'inactive', access_source: 'none',
      stripe_customer_id: null, stripe_subscription_id: null,
      subscription_status: 'none', subscription_plan: null, promo_code_used: null,
      access_expires_at: null, city: null, professional_role: null,
      last_visited_section: null, level: 1, xp_total: 0,
      activated_by: null, activated_at: null, signup_method: 'signup',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    return <AccessBlockedClient profile={demoProfile} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const typedProfile = profile as Profile | null
  if (typedProfile && hasActiveAccess(typedProfile)) redirect('/inicio')

  // If we couldn't load the profile, use a minimal inactive profile
  const safeProfile: Profile = typedProfile ?? {
    id: user.id,
    email: user.email ?? '',
    full_name: null,
    salon_name: null,
    is_active: false,
    role: 'user',
    access_status: 'inactive',
    access_source: 'none',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: 'none',
    subscription_plan: null,
    promo_code_used: null,
    access_expires_at: null,
    city: null,
    professional_role: null,
    last_visited_section: null,
    level: 1,
    xp_total: 0,
    activated_by: null,
    activated_at: null,
    signup_method: 'signup',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return <AccessBlockedClient profile={safeProfile} />
}