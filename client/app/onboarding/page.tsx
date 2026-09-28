import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'
import { Profile, BrandProfile } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function OnboardingPage() {
  if (!IS_CONFIGURED) {
    return <OnboardingClient demoMode />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // El wizard sirve también como "Actualizar mi marca" (spec §9): los
  // perfiles completos entran en modo edición, sin redirect.
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('team_info, main_services, service_to_promote, differentiation, main_priority, shows_face, completion_status, strategy_json, optimized_summary')
    .eq('user_id', user.id)
    .maybeSingle()

  const p = profile as Profile | null
  const b = brand as Partial<BrandProfile> | null
  const mode = p?.full_name && p?.salon_name && b?.completion_status === 'complete' ? 'edit' : 'onboarding'

  return <OnboardingClient profile={p} brand={b} mode={mode} />
}