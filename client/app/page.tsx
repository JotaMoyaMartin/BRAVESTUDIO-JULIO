import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasActiveAccess } from '@/lib/access'
import { Profile } from '@/types/database'
import LandingClient from './LandingClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function Home() {
  if (IS_CONFIGURED) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const typedProfile = profile as Profile | null
      if (typedProfile && hasActiveAccess(typedProfile)) {
        // Si tiene acceso pero no ha completado onboarding → onboarding
        if (!typedProfile.full_name || !typedProfile.salon_name) {
          redirect('/onboarding')
        }
        redirect('/inicio')
      }
      // Logueado sin acceso → access
      if (typedProfile && !typedProfile.full_name && !typedProfile.salon_name) {
        redirect('/onboarding')
      }
      redirect('/access')
    }
  }

  return <LandingClient />
}