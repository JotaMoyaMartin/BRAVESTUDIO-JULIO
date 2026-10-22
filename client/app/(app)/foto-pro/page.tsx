import { redirect } from 'next/navigation'

// Foto Pro vive ahora dentro del Estudio de fotos (paso «Edítala»).
// El retoque con IA (/foto-pro/retoque) vuelve en la fase 2.
export default function FotoProPage() {
  redirect('/estudio?paso=editala')
}
