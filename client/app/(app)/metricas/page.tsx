import { createClient } from '@/lib/supabase/server'
import PageTransition from '@/components/ui/PageTransition'
import MetricasClient from './MetricasClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

interface MetricRow {
  id: string
  month: string
  network: string
  followers: number | null
  reach: number | null
  impressions: number | null
  engagement_rate: number | null
  posts_count: number | null
}

export default async function MetricasPage() {
  if (!IS_CONFIGURED) {
    return <PageTransition><MetricasClient metrics={[]} /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let metrics: MetricRow[] = []
  if (user) {
    const { data } = await supabase
      .from('metricool_metrics')
      .select('id, month, network, followers, reach, impressions, engagement_rate, posts_count')
      .eq('user_id', user.id)
      .order('month', { ascending: true })
    metrics = (data as MetricRow[]) || []
  }
  return (
    <PageTransition>
      <MetricasClient metrics={metrics} />
    </PageTransition>
  )
}