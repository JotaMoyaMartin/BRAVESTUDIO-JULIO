import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageTransition from '@/components/ui/PageTransition'
import AnalisisClient from './AnalisisClient'
import { IS_DEMO } from '@/lib/demo'
import { getConnectInfo, getConnectionCounts, isSocialProviderReady } from '@/lib/social/repo'

/**
 * Análisis (Fase 1): estado de la conexión de Instagram y datos traídos.
 * El motor de diagnóstico es Fase 3 — aquí solo se muestra el placeholder.
 */
export default async function AnalisisPage() {
  // Modo demo (sin credenciales): estado de conexión falso para enseñar la UI.
  if (IS_DEMO) {
    return (
      <PageTransition>
        <AnalisisClient demo />
      </PageTransition>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const state = await getConnectInfo(user.id, 'instagram')
  const counts = await getConnectionCounts(user.id, 'instagram')

  return (
    <PageTransition>
      <AnalisisClient
        ready={isSocialProviderReady()}
        info={state.info}
        needsReauth={state.needsReauth}
        counts={counts}
      />
    </PageTransition>
  )
}