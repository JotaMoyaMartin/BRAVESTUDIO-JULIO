import { createClient } from '@/lib/supabase/server'
import InspiracionReelsClient from './InspiracionReelsClient'
import PageTransition from '@/components/ui/PageTransition'
import { ReelInspiration, ReelTransition } from '@/types/database'
import { DEMO_REAL_INSPIRATIONS, DEMO_REAL_TRANSITIONS } from './demo-data'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

// Sección única con DOS categorías: Inspiración (reel_inspirations) y
// Transiciones (reel_transitions) — antes eran dos secciones. Los reels con
// instagram_url se ven DENTRO de la app (embed de IG); el link externo queda
// como plan B por si el embed pide login (a veces pasa en Europa).

export default async function InspiracionReelsPage({
  searchParams,
}: {
  searchParams?: { cat?: string } | Promise<{ cat?: string }>
}) {
  const { cat } = (await searchParams) || {}
  const initialCat = cat === 'transiciones' ? 'transiciones' : 'inspiracion'

  if (!IS_CONFIGURED) {
    // Demo: snapshot REAL de las tablas de producción (2-oct-2026) para valorar
    // el visor in-app sin base de datos — ver comentario en demo-data.ts.
    return (
      <PageTransition>
        <InspiracionReelsClient
          userId="demo"
          inspirations={DEMO_REAL_INSPIRATIONS}
          transitions={DEMO_REAL_TRANSITIONS as unknown as ReelTransition[]}
          savedIds={[]}
          savedTransitionIds={[]}
          initialCat={initialCat}
        />
      </PageTransition>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: inspirations }, { data: transitions }, { data: saved }, { data: savedTrans }] = await Promise.all([
    supabase
      .from('reel_inspirations')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('reel_transitions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_inspirations')
      .select('inspiration_id')
      .eq('user_id', user!.id),
    supabase
      .from('saved_transitions')
      .select('transition_id')
      .eq('user_id', user!.id),
  ])

  const savedIds = ((saved as { inspiration_id: string }[]) || []).map(s => s.inspiration_id)
  const savedTransitionIds = ((savedTrans as { transition_id: string }[]) || []).map(s => s.transition_id)

  return (
    <PageTransition>
      <InspiracionReelsClient
        userId={user!.id}
        inspirations={(inspirations as ReelInspiration[]) || []}
        transitions={(transitions as ReelTransition[]) || []}
        savedIds={savedIds}
        savedTransitionIds={savedTransitionIds}
        initialCat={initialCat}
      />
    </PageTransition>
  )
}