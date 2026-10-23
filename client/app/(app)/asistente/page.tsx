import type { Metadata } from 'next'
import HomePage from '../inicio/HomePage'

export const metadata: Metadata = { title: 'Asistente · BRÄVE Studio' }

// ASISTENTE (22-oct-2026): el chat completo de Bravi y tus primeros pasos,
// fuera de Inicio para que Inicio sea visual y directo.
export default function AsistentePage() {
  return <HomePage view="asistente" />
}
