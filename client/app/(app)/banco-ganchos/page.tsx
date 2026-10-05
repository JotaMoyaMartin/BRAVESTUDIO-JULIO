import { createClient } from '@/lib/supabase/server'
import BancoGanchosClient from './BancoGanchosClient'
import PageTransition from '@/components/ui/PageTransition'
import { BrandFullContextInput } from '@/lib/ai/brand-context'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function BancoGanchosPage() {
  if (!IS_CONFIGURED) {
    return (
      <PageTransition>
        <BancoGanchosClient userId="demo" brandFull={null} recentHooks={[]} initialFavs={[]} />
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
  // Ganchos de los últimos guiones generados: al regenerar variedad, BRÄVE
  // no arranca siempre del mismo ángulo (igual que en Guiones).
  const [{ data: recent }, { data: favs }] = await Promise.all([
    supabase
      .from('content_items')
      .select('content_json, created_at')
      .eq('user_id', user!.id)
      .eq('type', 'reel')
      .order('created_at', { ascending: false })
      .limit(30),
    // Favoritos (estrella) guardados por esta usuaria.
    supabase.from('saved_ganchos').select('gancho_id').eq('user_id', user!.id),
  ])
  const recentHooks = (recent || [])
    .map(r => r.content_json as { script?: { hook?: string } } | null)
    .map(j => (j?.script?.hook && typeof j.script.hook === 'string' ? j.script.hook : null))
    .filter((h): h is string => !!h)
    .slice(0, 20)

  return (
    <PageTransition>
      <BancoGanchosClient
        userId={user!.id}
        brandFull={(brand as BrandFullContextInput) || null}
        recentHooks={recentHooks}
        initialFavs={((favs as { gancho_id: string }[]) || []).map(f => f.gancho_id)}
      />
    </PageTransition>
  )
}