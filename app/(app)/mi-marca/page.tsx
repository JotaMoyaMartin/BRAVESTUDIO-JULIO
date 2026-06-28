import { createClient } from '@/lib/supabase/server'
import MiMarcaClient from './MiMarcaClient'
import { BrandProfile } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function MiMarcaPage() {
  if (!IS_CONFIGURED) {
    return <MiMarcaClient userId="demo" brand={null} />
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brand } = await supabase.from('brand_profiles').select('*').eq('user_id', user!.id).single()
  return <MiMarcaClient userId={user!.id} brand={brand as BrandProfile | null} />
}
