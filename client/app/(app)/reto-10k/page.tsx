import { createClient } from '@/lib/supabase/server'
import PageTransition from '@/components/ui/PageTransition'
import Reto10kClient from './Reto10kClient'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kConfig } from '@/types/reto10k'

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

export default async function Reto10kPage() {
  if (!IS_CONFIGURED) {
    return (
      <PageTransition>
        <Reto10kClient
          profile={DEMO_PROFILE}
          progress={null}
          config={null}
          brand={null}
          contentItems={[]}
          demoMode
        />
      </PageTransition>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Cargar progreso del reto
  const { data: progressRow } = await supabase
    .from('reto_10k_progress')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle()

  // Cargar configuracion del reto
  const { data: configRow } = await supabase
    .from('reto_10k_config')
    .select('config_json')
    .eq('id', 'default')
    .maybeSingle()

  const config = configRow?.config_json as unknown as Reto10kConfig | null

  // Cargar brand profile
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('salon_name, optimized_summary, main_services, service_to_promote')
    .eq('user_id', user!.id)
    .maybeSingle()

  // Cargar content_items con tag reto-10k
  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .eq('user_id', user!.id)
    .eq('tag', 'reto-10k')
    .order('created_at', { ascending: false })

  return (
    <PageTransition>
      <Reto10kClient
        profile={profile as Profile | null}
        progress={progressRow as any}
        config={config}
        brand={brand as Partial<BrandProfile> | null}
        contentItems={(items as ContentItem[]) || []}
        demoMode={false}
      />
    </PageTransition>
  )
}