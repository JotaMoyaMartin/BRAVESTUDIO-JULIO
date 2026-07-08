import { createClient } from '@/lib/supabase/server'
import TransicionesReelsClient from './TransicionesReelsClient'
import PageTransition from '@/components/ui/PageTransition'
import { ReelTransition } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function TransicionesReelsPage() {
  if (!IS_CONFIGURED) {
    return (
      <PageTransition>
        <TransicionesReelsClient transitions={[]} />
      </PageTransition>
    )
  }

  const supabase = await createClient()

  const { data: transitions } = await supabase
    .from('reel_transitions')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <PageTransition>
      <TransicionesReelsClient
        transitions={(transitions as ReelTransition[]) || []}
      />
    </PageTransition>
  )
}