import type { Metadata } from 'next'
import FotoProClient from './FotoProClient'
import PageTransition from '@/components/ui/PageTransition'

export const metadata: Metadata = { title: 'Foto Pro · BRÄVE Studio' }

export default function FotoProPage() {
  return (
    <PageTransition>
      <FotoProClient />
    </PageTransition>
  )
}