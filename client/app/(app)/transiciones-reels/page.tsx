import { redirect } from 'next/navigation'

// Transiciones es ahora una CATEGORÍA dentro de Inspiración Reels (2-oct-2026).
// La URL antigua se mantiene viva: redirige a la pestaña correspondiente.
export default function TransicionesReelsPage() {
  redirect('/inspiracion-reels?cat=transiciones')
}