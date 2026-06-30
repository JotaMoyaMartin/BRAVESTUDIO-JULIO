import { createClient } from '@/lib/supabase/server'
import StoriesClient from './StoriesClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function StoriesPage() {
  if (!IS_CONFIGURED) {
    return <StoriesClient userId="demo" brandContext={null} />
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase.from('brand_profiles').select('optimized_summary').eq('user_id', user!.id).single()
  const b = brand as { optimized_summary: string | null } | null
  return <StoriesClient userId={user!.id} brandContext={b?.optimized_summary || null} />
}
