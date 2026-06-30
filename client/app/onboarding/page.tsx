import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'
import { Profile } from '@/types/database'

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

  // Si ya completó el onboarding, no tiene sentido estar aquí
  if (profile && (profile as Profile).full_name && (profile as Profile).salon_name) {
    redirect('/access')
  }

  return <OnboardingClient profile={profile as Profile | null} />
}