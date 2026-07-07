import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IS_DEMO } from '@/lib/demo'
import { ContentItem } from '@/types/database'
import CalendarioClient from './CalendarioClient'
import PageTransition from '@/components/ui/PageTransition'

export default async function CalendarioPage() {
  if (IS_DEMO) {
    return <PageTransition><CalendarioClient userId="demo" items={[]} /></PageTransition>
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .eq('user_id', user.id)
    .not('scheduled_date', 'is', null)
    .order('scheduled_date', { ascending: true })

  return (
    <PageTransition>
      <CalendarioClient
        userId={user.id}
        items={(items as ContentItem[]) || []}
      />
    </PageTransition>
  )
}