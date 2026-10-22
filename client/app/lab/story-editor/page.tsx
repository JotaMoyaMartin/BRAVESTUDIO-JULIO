import type { Metadata } from 'next'
import LabCarouselEditor from '@/app/lab/carousel-editor/LabCarouselEditor'

// LAB — editor de STORIES (9:16): el mismo editor a una pieza distinta, foto
// only. El extra clave: botón de COPIAR el texto de cada story para pegarlo
// en el editor nativo de Instagram (la foto la llevan del PNG descargado).

export const metadata: Metadata = {
  title: 'Crea tus stories · LAB BRÄVE Studio',
  robots: { index: false },
}

export default function LabStoryEditorPage() {
  return <LabCarouselEditor mode="story" />
}