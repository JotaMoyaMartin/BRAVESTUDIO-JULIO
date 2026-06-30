import { createClient } from '@/lib/supabase/server'
import CrearContenidoClient from './CrearContenidoClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function CrearContenidoPage({ searchParams }: { searchParams: Record<string, string> }) {
  const initialService = searchParams.service || null
  const initialType = searchParams.type === 'carrusel' ? 'carrusel' : searchParams.type === 'reel' ? 'reel' : null

  if (!IS_CONFIGURED) {
    return <CrearContenidoClient userId="demo" brandContext={null} initialService={initialService} initialType={initialType as 'reel' | 'carrusel' | null} />
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase.from('brand_profiles').select('optimized_summary').eq('user_id', user!.id).single()
  const b = brand as { optimized_summary: string | null } | null
  return <CrearContenidoClient userId={user!.id} brandContext={b?.optimized_summary || null} initialService={initialService} initialType={initialType as 'reel' | 'carrusel' | null} />
}
