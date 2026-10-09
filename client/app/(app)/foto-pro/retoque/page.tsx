import type { Metadata } from 'next'
import RetoqueClient from './RetoqueClient'
import PageTransition from '@/components/ui/PageTransition'

export const metadata: Metadata = { title: 'Retoque Pro · BRÄVE Studio' }

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function RetoquePage() {
  if (!IS_CONFIGURED) {
    return (
      <PageTransition>
        <RetoqueClient userId="demo" demo />
      </PageTransition>
    )
  }
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <PageTransition>
      <RetoqueClient userId={user!.id} />
    </PageTransition>
  )
}