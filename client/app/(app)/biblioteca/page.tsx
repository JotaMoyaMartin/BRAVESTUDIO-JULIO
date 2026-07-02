import { createClient } from '@/lib/supabase/server'
import BibliotecaClient from './BibliotecaClient'
import { BrandProfile, ContentItem } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function BibliotecaPage() {
  if (!IS_CONFIGURED) {
    return <BibliotecaClient userId="demo" items={[]} brandContext={null} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('optimized_summary, salon_name, main_services, service_to_promote')
    .eq('user_id', user!.id)
    .single()

  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <BibliotecaClient
      userId={user!.id}
      items={(items as ContentItem[]) || []}
      brandContext={brand as Pick<BrandProfile, 'optimized_summary' | 'salon_name' | 'main_services' | 'service_to_promote'> | null}
    />
  )
}