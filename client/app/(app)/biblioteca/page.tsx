import { createClient } from '@/lib/supabase/server'
import BibliotecaClient from './BibliotecaClient'
import PageTransition from '@/components/ui/PageTransition'
import { BrandProfile, ContentItem, ReelInspiration } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function BibliotecaPage() {
  if (!IS_CONFIGURED) {
    return <PageTransition><BibliotecaClient userId="demo" items={[]} brandContext={null} savedInspirations={[]} /></PageTransition>
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: brand }, { data: items }, { data: savedRows }] = await Promise.all([
    supabase
      .from('brand_profiles')
      .select('optimized_summary, salon_name, main_services, service_to_promote')
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('content_items')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_inspirations')
      .select('inspiration_id, reel_inspirations(*)')
      .eq('user_id', user!.id)
      .order('saved_at', { ascending: false }),
  ])

  const savedInspirations: ReelInspiration[] = ((savedRows as unknown as { reel_inspirations: ReelInspiration }[]) || [])
    .map(r => r.reel_inspirations)
    .filter((x): x is ReelInspiration => !!x)

  return (
    <PageTransition>
      <BibliotecaClient
        userId={user!.id}
        items={(items as ContentItem[]) || []}
        brandContext={brand as Pick<BrandProfile, 'optimized_summary' | 'salon_name' | 'main_services' | 'service_to_promote'> | null}
        savedInspirations={savedInspirations}
      />
    </PageTransition>
  )
}