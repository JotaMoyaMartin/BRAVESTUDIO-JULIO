import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasActiveAccess } from '@/lib/access'
import { Profile } from '@/types/database'
import type { Metadata } from 'next'
import LandingV2Client from './LandingV2Client'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

/**
 * Landing V2 (variante de test A/B contra `/`).
 * MISMA lógica de redirect que app/page.tsx — una usuaria autenticada con
 * acceso activo no ve ninguna de las dos landings.
 */
export const metadata: Metadata = {
  title: 'BRÄVE Studio | Tu sistema de marketing para el salón',
  description:
    'BRÄVE Studio ayuda a estilistas y salones de belleza a saber qué publicar, crear contenido con estrategia y hacer crecer su marca en redes. Prueba 7 días gratis.',
  openGraph: {
    title: 'BRÄVE Studio | Tu sistema de marketing para el salón',
    description:
      'Saber qué publicar, crear contenido con estrategia y construir una marca que atraiga mejores clientes. Hecho para estilistas y salones de belleza.',
    type: 'website',
    locale: 'es_ES',
  },
  // Variante de test: no indexar hasta decidir la landing ganadora (evita duplicado con /)
  robots: { index: false, follow: false },
}

export default async function LandingV2Page() {
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
        if (!typedProfile.full_name || !typedProfile.salon_name) {
          redirect('/onboarding')
        }
        redirect('/inicio')
      }
      if (typedProfile && !typedProfile.full_name && !typedProfile.salon_name) {
        redirect('/onboarding')
      }
      redirect('/access')
    }
  }

  return <LandingV2Client />
}