import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { Profile } from '@/types/database'
import { hasActiveAccess, ACCESS_REDIRECT } from '@/lib/access'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

const DEMO_PROFILE: Profile = {
  id: 'demo',
  email: 'demo@bravestudio.com',
  full_name: 'Demo Estilista',
  salon_name: 'Mi Salón',
  is_active: true,
  role: 'user',
  access_status: 'active',
  access_source: 'manual',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_status: 'none',
  subscription_plan: null,
  promo_code_used: null,
  access_expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let typedProfile: Profile = DEMO_PROFILE

  if (IS_CONFIGURED) {
    const { redirect } = await import('next/navigation')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()

    typedProfile = (profile as Profile | null) || DEMO_PROFILE
    if (!hasActiveAccess(typedProfile)) redirect(ACCESS_REDIRECT)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FFFDF5' }}>
      <Sidebar profile={typedProfile} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
