import { createClient } from '@/lib/supabase/server'
import CrearContenidoClient from './CrearContenidoClient'
import PageTransition from '@/components/ui/PageTransition'
import { redirect } from 'next/navigation'
import { BrandFullContextInput } from '@/lib/ai/brand-context'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function CrearContenidoPage({ searchParams }: { searchParams: Record<string, string> }) {
  // La sección es GUIONES (reels). Los carruseles se crean en /carrusel.
  if (searchParams.type === 'carrusel') redirect('/carrusel')

  const initialService = searchParams.service || null
  const initialTema = searchParams.tema || null
  const initialContexto = searchParams.contexto || null

  if (!IS_CONFIGURED) {
    return (
      <PageTransition>
        <CrearContenidoClient userId="demo" brandFull={null} initialService={initialService} initialTema={initialTema} initialContexto={initialContexto} />
      </PageTransition>
    )
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('optimized_summary, salon_name, main_services, service_to_promote, strategy_json, raw_input')
    .eq('user_id', user!.id)
    .maybeSingle()
  // Títulos de reels recientes: las ideas nuevas no deben repetir lo ya creado.
  const { data: recent } = await supabase
    .from('content_items')
    .select('content_json, created_at')
    .eq('user_id', user!.id)
    .eq('type', 'reel')
    .order('created_at', { ascending: false })
    .limit(30)
  const recentTitles = (recent || [])
    .map(r => r.content_json as { title?: string } | null)
    .map(j => (j && typeof j.title === 'string' ? j.title : null))
    .filter((t): t is string => !!t)
    .slice(0, 20)
  return (
    <PageTransition>
      <CrearContenidoClient
        userId={user!.id}
        brandFull={(brand as BrandFullContextInput) || null}
        initialService={initialService}
        initialTema={initialTema}
        initialContexto={initialContexto}
        recentTitles={recentTitles}
      />
    </PageTransition>
  )
}