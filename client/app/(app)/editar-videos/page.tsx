import EditarVideosClient from './EditarVideosClient'
import PageTransition from '@/components/ui/PageTransition'

// Editar Videos (13-oct-2026): asistente guiado 1-2-3 para recortar silencios
// de reels grabados. Todo corre en el navegador (ffmpeg.wasm + Web Audio):
// el video nunca sale del dispositivo. Captions IA: siguiente iteración.
export default function EditarVideosPage() {
  return (
    <PageTransition>
      <EditarVideosClient />
    </PageTransition>
  )
}