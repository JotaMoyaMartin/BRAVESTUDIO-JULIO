import { createClient } from '@/lib/supabase/server'
import TransicionesReelsClient from './TransicionesReelsClient'
import PageTransition from '@/components/ui/PageTransition'
import { ReelTransition } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function TransicionesReelsPage() {
  if (!IS_CONFIGURED) {
    return (
      <PageTransition>
        <TransicionesReelsClient userId="demo" transitions={[]} savedIds={[]} />
      </PageTransition>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: transitions }, { data: saved }] = await Promise.all([
    supabase
      .from('reel_transitions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_transitions')
      .select('transition_id')
      .eq('user_id', user!.id),
  ])

  const savedIds = ((saved as { transition_id: string }[]) || []).map(s => s.transition_id)

  return (
    <PageTransition>
      <TransicionesReelsClient
        userId={user!.id}
        transitions={(transitions as ReelTransition[]) || []}
        savedIds={savedIds}
      />
    </PageTransition>
  )
}