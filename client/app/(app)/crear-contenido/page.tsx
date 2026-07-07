import { createClient } from '@/lib/supabase/server'
import CrearContenidoClient from './CrearContenidoClient'
import PageTransition from '@/components/ui/PageTransition'
import { BrandFullContextInput } from '@/lib/ai/brand-context'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function CrearContenidoPage({ searchParams }: { searchParams: Record<string, string> }) {
  const initialService = searchParams.service || null
  const initialType = searchParams.type === 'carrusel' ? 'carrusel' : searchParams.type === 'reel' ? 'reel' : null
  const initialTema = searchParams.tema || null
  const initialContexto = searchParams.contexto || null

  if (!IS_CONFIGURED) {
    return <PageTransition><CrearContenidoClient userId="demo" brandFull={null} initialService={initialService} initialType={initialType as 'reel' | 'carrusel' | null} initialTema={initialTema} initialContexto={initialContexto} /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('optimized_summary, salon_name, main_services, service_to_promote, strategy_json, raw_input')
    .eq('user_id', user!.id)
    .single()
  return (
    <PageTransition>
      <CrearContenidoClient
        userId={user!.id}
        brandFull={(brand as BrandFullContextInput) || null}
        initialService={initialService}
        initialType={initialType as 'reel' | 'carrusel' | null}
        initialTema={initialTema}
        initialContexto={initialContexto}
      />
    </PageTransition>
  )
}
