import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PageTransition from '@/components/ui/PageTransition'
import { pendingApprovals, planningToPubs, VISIBLE_TO_CLIENT, type TeamPlanningLite } from '@/lib/equipo/from-planning'
import LoQuePublicamosClient from './LoQuePublicamosClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

/**
 * Lee la planificación real del equipo para ESTA clienta: su ficha en el panel
 * del equipo tiene su cuenta enlazada (supabase_user_id). Solo lo ya enviado.
 */
export default async function LoQuePublicamosPage() {
  if (!IS_CONFIGURED) return <PageTransition><LoQuePublicamosClient pubs={null} demo /></PageTransition>
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient()
  const { data: clients } = await db.from('team_records').select('id').eq('kind', 'client').eq('deleted', false).eq('data->>supabase_user_id', user!.id)
  const ids = (clients ?? []).map(c => (c as { id: string }).id)
  let plannings: TeamPlanningLite[] = []
  if (ids.length) {
    const { data } = await db.from('team_records').select('data').eq('kind', 'planning').eq('deleted', false)
      .in('data->>clientId', ids).in('data->>status', VISIBLE_TO_CLIENT)
    plannings = (data ?? []).map(r => (r as { data: TeamPlanningLite }).data)
  }
  const from = new Date(); from.setDate(from.getDate() - 14)
  const fromIso = from.toISOString().slice(0, 10)
  const pubs = plannings.flatMap(p => planningToPubs(p)).filter(p => p.fecha >= fromIso)
  return (
    <PageTransition>
      <LoQuePublicamosClient pubs={pubs} pendientes={pendingApprovals(plannings)} enlazada={ids.length > 0} />
    </PageTransition>
  )
}
