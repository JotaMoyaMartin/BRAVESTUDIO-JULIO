import { createClient } from '@/lib/supabase/server'
import MiMarcaClient from './MiMarcaClient'
import PageTransition from '@/components/ui/PageTransition'
import { BrandProfile } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function MiMarcaPage() {
  if (!IS_CONFIGURED) {
    return <PageTransition><MiMarcaClient userId="demo" brand={null} /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase.from('brand_profiles').select('*').eq('user_id', user!.id).single()
  return <PageTransition><MiMarcaClient userId={user!.id} brand={brand as BrandProfile | null} /></PageTransition>
}
