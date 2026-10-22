import { createClient } from '@/lib/supabase/server'
import PageTransition from '@/components/ui/PageTransition'
import CarruselesClient from './CarruselesClient'
import { BrandFullContextInput, buildBrandFullContext } from '@/lib/ai/brand-context'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

// CARRUSELES (17-oct-2026): experiencia premium con estilos visuales como
// data (lib/carruseles/): estilo → idea → copy aprobado → imágenes por slide.
// Regla CLAUDE.md: el copy inyecta contexto de marca (buildBrandFullContext).
// El editor del LAB queda en /lab/carousel-editor (solo lab).
export default async function CarruselPage() {
  if (!IS_CONFIGURED) {
    return <PageTransition><CarruselesClient userId="demo" /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('optimized_summary, salon_name, main_services, service_to_promote, strategy_json, raw_input')
    .eq('user_id', user!.id)
    .maybeSingle()
  const brandFull = (brand as BrandFullContextInput) || null
  const brandContext = brandFull ? buildBrandFullContext(brandFull) || undefined : undefined
  return (
    <PageTransition>
      <CarruselesClient userId={user!.id} brandContext={brandContext} />
    </PageTransition>
  )
}