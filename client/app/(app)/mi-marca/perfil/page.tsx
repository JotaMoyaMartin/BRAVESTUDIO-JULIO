import { createClient } from '@/lib/supabase/server'
import PageTransition from '@/components/ui/PageTransition'
import type { BrandProfile } from '@/types/database'
import PerfilClient from './PerfilClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function PerfilPage() {
  if (!IS_CONFIGURED) return <PageTransition><PerfilClient userId="demo" brand={null} /></PageTransition>
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase.from('brand_profiles').select('*').eq('user_id', user!.id).maybeSingle()
  return <PageTransition><PerfilClient userId={user!.id} brand={brand as BrandProfile | null} /></PageTransition>
}
