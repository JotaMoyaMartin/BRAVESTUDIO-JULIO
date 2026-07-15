import { createClient } from '@/lib/supabase/server'
import PlanificarClient from './PlanificarClient'
import PageTransition from '@/components/ui/PageTransition'
import { BrandFullContextInput } from '@/lib/ai/brand-context'
import { ContentItem } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function PlanificarPage({ searchParams }: { searchParams: Record<string, string> }) {
  const initialTab = searchParams.tab === 'ver' ? 'ver' : 'crear'

  if (!IS_CONFIGURED) {
    return <PageTransition><PlanificarClient userId="demo" brand={null} initialItems={[]} initialTab={initialTab as 'crear' | 'ver'} /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('optimized_summary, salon_name, main_services, service_to_promote, strategy_json, raw_input')
    .eq('user_id', user!.id)
    .maybeSingle()
  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })
  return (
    <PageTransition>
      <PlanificarClient
        userId={user!.id}
        brand={(brand as BrandFullContextInput) || null}
        initialItems={(items as ContentItem[]) || []}
        initialTab={initialTab as 'crear' | 'ver'}
      />
    </PageTransition>
  )
}
