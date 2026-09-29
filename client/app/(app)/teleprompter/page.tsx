import { createClient } from '@/lib/supabase/server'
import TeleprompterClient from '@/components/teleprompter/TeleprompterClient'
import { selectSpeakableItems, SavedScriptCard } from '@/lib/teleprompter/scripts'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

// Teleprompter — herramienta independiente + capacidad integrada.
// El payload (guion, origen, returnUrl, secuencia) llega vía sessionStorage
// (lib/teleprompter/input.ts). Los guiones guardados se leen de content_items
// (la MISMA fuente de Biblioteca) — sin tabla nueva.
export default async function TeleprompterPage() {
  const savedScripts: SavedScriptCard[] | null = await loadSavedScripts()
  return (
    <div className="max-w-2xl">
      <TeleprompterClient savedScripts={savedScripts} />
    </div>
  )
}

// null → demo (el client los carga de demoGetPlan); [] → sin sesión o vacío.
async function loadSavedScripts(): Promise<SavedScriptCard[] | null> {
  if (!IS_CONFIGURED) return null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase
      .from('content_items')
      .select('id, title, type, content_json, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    return selectSpeakableItems(data ?? [])
  } catch {
    return []
  }
}