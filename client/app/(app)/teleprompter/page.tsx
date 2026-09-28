import TeleprompterClient from '@/components/teleprompter/TeleprompterClient'

// Teleprompter V1 — herramienta independiente + capacidad integrada.
// El payload (guion, origen, returnUrl, secuencia) llega vía sessionStorage
// (lib/teleprompter/input.ts); esta página no toca Supabase. Funciona en demo.
export default function TeleprompterPage() {
  return (
    <div className="max-w-2xl">
      <TeleprompterClient />
    </div>
  )
}