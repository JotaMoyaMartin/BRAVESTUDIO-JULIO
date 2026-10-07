import PageTransition from '@/components/ui/PageTransition'
import StoriesDisenoClient from './StoriesDisenoClient'

/**
 * STORIES DISEÑO — Fase 1: teaser "en construcción".
 * No fetch de datos (nada que configurar en demo); la vista es informativa.
 */
export default function StoriesDisenoPage() {
  return (
    <PageTransition>
      <StoriesDisenoClient />
    </PageTransition>
  )
}