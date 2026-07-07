import { createClient } from '@/lib/supabase/server'
import InspiracionReelsClient from './InspiracionReelsClient'
import PageTransition from '@/components/ui/PageTransition'
import { ReelInspiration } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function InspiracionReelsPage() {
  if (!IS_CONFIGURED) {
    return (
      <PageTransition>
        <InspiracionReelsClient userId="demo" inspirations={[]} savedIds={[]} />
      </PageTransition>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: inspirations }, { data: saved }] = await Promise.all([
    supabase
      .from('reel_inspirations')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_inspirations')
      .select('inspiration_id')
      .eq('user_id', user!.id),
  ])

  const savedIds = ((saved as { inspiration_id: string }[]) || []).map(s => s.inspiration_id)

  return (
    <PageTransition>
      <InspiracionReelsClient
        userId={user!.id}
        inspirations={(inspirations as ReelInspiration[]) || []}
        savedIds={savedIds}
      />
    </PageTransition>
  )
}