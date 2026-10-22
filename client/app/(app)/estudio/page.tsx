import type { Metadata } from 'next'
import { Suspense } from 'react'
import EstudioClient from './EstudioClient'
import PageTransition from '@/components/ui/PageTransition'

export const metadata: Metadata = { title: 'Estudio de fotos · BRÄVE Studio' }

// ESTUDIO DE FOTOS (22-oct-2026): une Foto inspo (hazla) + editor gratis
// (edítala) + antes/después + Mis fotos. La IA de pago llegará en la fase 2.
export default function EstudioPage() {
  return (
    <PageTransition>
      <Suspense>
        <EstudioClient />
      </Suspense>
    </PageTransition>
  )
}
