import { createClient } from '@/lib/supabase/server'
import PlanContenidosClient from './PlanContenidosClient'
import PageTransition from '@/components/ui/PageTransition'
import { ContentItem } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function PlanContenidosPage() {
  if (!IS_CONFIGURED) {
    return <PageTransition><PlanContenidosClient items={[]} /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .eq('user_id', user!.id)
    .eq('tag', 'premium-script')
    .order('created_at', { ascending: false })

  return (
    <PageTransition>
      <PlanContenidosClient items={(items as ContentItem[]) || []} />
    </PageTransition>
  )
}