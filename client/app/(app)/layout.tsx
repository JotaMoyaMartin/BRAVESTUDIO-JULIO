import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Sidebar from '@/components/layout/Sidebar'
import SectionTracker from '@/components/layout/SectionTracker'
import PreviewPremiumBanner from '@/components/layout/PreviewPremiumBanner'
import { Profile } from '@/types/database'
import { hasActiveAccess, ACCESS_REDIRECT } from '@/lib/access'
import { ToastProvider } from '@/components/ui/Toast'

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
  city: null,
  professional_role: null,
  last_visited_section: null,
  level: 1,
  xp_total: 0,
  activated_by: null,
  activated_at: null,
  signup_method: 'signup',
  trial_started_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let typedProfile: Profile = DEMO_PROFILE
  let isPreviewingPremium = false

  if (IS_CONFIGURED) {
    const { redirect } = await import('next/navigation')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()

    if (profile) {
      typedProfile = profile as Profile
    } else {
      // Fallback: el select('*') puede fallar por RLS/columnas; recuperar role por separado
      console.warn('[AppLayout] select(*) failed:', profileError?.message, '— fallback a select(role)')
      const { data: roleOnly } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .single()
      const role = (roleOnly as { role?: string } | null)?.role
      typedProfile = {
        ...DEMO_PROFILE,
        id: user!.id,
        email: user!.email || DEMO_PROFILE.email,
        role: (role === 'admin' || role === 'superadmin' || role === 'premium') ? role : 'user',
      }
    }
    const isPrivileged = typedProfile.role === 'admin' || typedProfile.role === 'superadmin' || typedProfile.role === 'premium'
    if (!hasActiveAccess(typedProfile) && !isPrivileged) redirect(ACCESS_REDIRECT)

    // Admin preview premium mode — override role to premium for visualization
    const cookieStore = await cookies()
    const previewPremium = cookieStore.get('brave_preview_premium')?.value === 'true'
    isPreviewingPremium = previewPremium && (typedProfile.role === 'admin' || typedProfile.role === 'superadmin')
    if (isPreviewingPremium) {
      typedProfile = { ...typedProfile, role: 'premium' }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <Sidebar profile={typedProfile} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-20 pb-8 md:pt-8 md:py-8">
          <SectionTracker />
          {isPreviewingPremium && <PreviewPremiumBanner />}
          <ToastProvider>{children}</ToastProvider>
        </div>
      </main>
    </div>
  )
}
