import type { Metadata } from 'next'
import LabCarouselEditor from './LabCarouselEditor'

// LAB — ruta aislada de prototipado (fuera de (app): sin Sidebar ni tracking).
// El matcher del middleware ya la protege (sesión + acceso activo).

export const metadata: Metadata = {
  title: 'Crea tu carrusel · LAB BRÄVE Studio',
  robots: { index: false },
}

export default function LabCarouselEditorPage() {
  return <LabCarouselEditor />
}