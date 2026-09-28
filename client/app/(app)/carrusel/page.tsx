import { createClient } from '@/lib/supabase/server'
import CarruselClient from './CarruselClient'
import PageTransition from '@/components/ui/PageTransition'
import { BrandFullContextInput } from '@/lib/ai/brand-context'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

// Creador de Carruseles BRÄVE V1 — reutilizable desde cualquier parte de BRÄVE
// (payload precargado vía sessionStorage, patrón Teleprompter).
export default async function CarruselPage() {
  if (!IS_CONFIGURED) {
    return <PageTransition><CarruselClient userId="demo" brandFull={null} /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('optimized_summary, salon_name, main_services, service_to_promote, strategy_json, raw_input')
    .eq('user_id', user!.id)
    .maybeSingle()
  return <PageTransition><CarruselClient userId={user!.id} brandFull={(brand as BrandFullContextInput) || null} /></PageTransition>
}