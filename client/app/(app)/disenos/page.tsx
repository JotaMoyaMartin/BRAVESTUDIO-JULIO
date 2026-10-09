import type { Metadata } from 'next'
import DisenosClient from './DisenosClient'
import PageTransition from '@/components/ui/PageTransition'

export const metadata: Metadata = { title: 'Diseños · BRÄVE Studio' }

export default function DisenosPage() {
  return (
    <PageTransition>
      <DisenosClient />
    </PageTransition>
  )
}