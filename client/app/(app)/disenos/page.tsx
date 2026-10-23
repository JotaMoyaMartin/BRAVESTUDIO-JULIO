import { redirect } from 'next/navigation'

// DISEÑOS quitado (22-oct-2026, petición Jota): Carruseles y «Diseña tus
// stories» cubren lo que hacía. Los enlaces antiguos llevan a Stories.
// (DisenosClient se conserva por si se quiere recuperar.)
export default function DisenosPage() {
  redirect('/stories')
}
