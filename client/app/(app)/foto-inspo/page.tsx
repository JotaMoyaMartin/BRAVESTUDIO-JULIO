import { redirect } from 'next/navigation'

// Foto inspo vive ahora dentro del Estudio de fotos (paso «Replica»).
export default function FotoInspoPage() {
  redirect('/estudio?paso=replica')
}
