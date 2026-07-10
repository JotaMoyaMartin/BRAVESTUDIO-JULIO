import { createClient } from '@/lib/supabase/server'
import MiEstrategiaClient from './MiEstrategiaClient'
import PageTransition from '@/components/ui/PageTransition'
import { BrandProfile } from '@/types/database'
import { StrategyDocument } from '@/lib/strategy-types'
import { Roadmap } from '@/lib/roadmap-types'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function MiEstrategiaPage() {
  if (!IS_CONFIGURED) {
    return <PageTransition><MiEstrategiaClient strategy={null} roadmap={null} /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('strategy_json, roadmap_json')
    .eq('user_id', user!.id)
    .single()

  const strategy = (brand?.strategy_json as unknown as StrategyDocument) || null
  const roadmap = (brand?.roadmap_json as unknown as Roadmap) || null

  return (
    <PageTransition>
      <MiEstrategiaClient strategy={strategy} roadmap={roadmap} />
    </PageTransition>
  )
}