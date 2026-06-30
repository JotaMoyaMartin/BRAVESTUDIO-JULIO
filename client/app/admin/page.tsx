import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import { Profile, PromoCode } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function AdminPage() {
  if (!IS_CONFIGURED) {
    return <AdminClient currentUserId="demo" users={[]} promoCodes={[]} />
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((myProfile as { role: string } | null)?.role !== 'admin') redirect('/inicio')

  const [{ data: users }, { data: promoCodes }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <AdminClient
      currentUserId={user.id}
      users={(users as Profile[]) || []}
      promoCodes={(promoCodes as PromoCode[]) || []}
    />
  )
}
