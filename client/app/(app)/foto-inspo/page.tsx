import FotoInspoClient from './FotoInspoClient'
import PageTransition from '@/components/ui/PageTransition'

// Foto inspo — galería de referencias fotográficas (selfies, poses, plano de
// café, tijeras/detalles) + cámara in-app con la referencia en PIP para
// replicar la foto. Catálogo estático en lib/foto-inspo.ts: sin BD (MVP,
// portadas a cargo de Jota de a una).
export default function FotoInspoPage() {
  return (
    <PageTransition>
      <FotoInspoClient />
    </PageTransition>
  )
}