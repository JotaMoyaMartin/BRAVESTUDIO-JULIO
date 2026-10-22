import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageTransition from '@/components/ui/PageTransition'
import AnalisisClient from './AnalisisClient'
import { IS_DEMO } from '@/lib/demo'
import { getConnectInfo, getConnectionCounts, isSocialProviderReady } from '@/lib/social/repo'
import { getSavedReport } from '@/lib/social/analysis'

/**
 * Análisis: conexión de Instagram + Análisis de perfil (informe con IA,
 * 22-oct-2026). El informe guardado llega ya en el primer render.
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
  const report = state.connected ? await getSavedReport(user.id).catch(() => null) : null

  return (
    <PageTransition>
      <AnalisisClient
        ready={isSocialProviderReady()}
        info={state.info}
        needsReauth={state.needsReauth}
        counts={counts}
        userId={user.id}
        initialReport={report}
      />
    </PageTransition>
  )
}