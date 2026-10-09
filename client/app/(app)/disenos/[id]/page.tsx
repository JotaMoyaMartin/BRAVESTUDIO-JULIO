import type { Metadata } from 'next'
import TemplateClient from './TemplateClient'
import PageTransition from '@/components/ui/PageTransition'

export const metadata: Metadata = { title: 'Diseños · BRÄVE Studio' }

export default async function DisenoPlantillaPage({ params }: { params: { id: string } }) {
  return (
    <PageTransition>
      <TemplateClient templateId={params.id} />
    </PageTransition>
  )
}