import { createClient } from '@/lib/supabase/server'
import InicioClient from './InicioClient'
import { Profile, BrandProfile, ContentItem } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

const DEMO_PROFILE: Profile = {
  id: 'demo', email: 'demo@bravestudio.com', full_name: 'Demo Estilista',
  salon_name: 'Mi Salón', is_active: true, role: 'user',
  access_status: 'active', access_source: 'manual',
  stripe_customer_id: null, stripe_subscription_id: null,
  subscription_status: 'none', subscription_plan: null, promo_code_used: null,
  access_expires_at: null, city: null, professional_role: null,
  last_visited_section: null, level: 1, xp_total: 0,
  activated_by: null, activated_at: null, signup_method: 'signup',
  trial_started_at: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}

export default async function InicioPage() {
  if (!IS_CONFIGURED) {
    return <InicioClient profile={DEMO_PROFILE} brand={null} contentItems={[]} />
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  const { data: brand } = await supabase.from('brand_profiles').select('completion_status, salon_name').eq('user_id', user!.id).single()
  const { data: items } = await supabase
    .from('content_items')
    .select('id, type, title, status, scheduled_date, created_at, updated_at')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  return (
    <InicioClient
      profile={profile as Profile | null}
      brand={brand as Partial<BrandProfile> | null}
      contentItems={(items as Partial<ContentItem>[]) || []}
    />
  )
}
