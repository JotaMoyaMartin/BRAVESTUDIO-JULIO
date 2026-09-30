import { createClient } from '@/lib/supabase/server'
import PruebaReelsClient from './PruebaReelsClient'
import type { ReelInspiration, ReelTransition } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

// Vídeo de prueba que dio Jota (Drive, mp4): se muestra por defecto en demo
// para ver "play dentro de la app" sin depender de la base de datos.
const DEMO_DRIVE_URL = 'https://drive.google.com/file/d/1k_hs_yc_ODBxReoIvvFkwnM32Z1-kLPd/view?usp=sharing'

export default async function PruebaReelsPage() {
  if (!IS_CONFIGURED) {
    return (
      <PruebaReelsClient
        inspirations={[]}
        transitions={[]}
        initialVideoUrl={DEMO_DRIVE_URL}
      />
    )
  }
  const supabase = await createClient()
  const [{ data: inspirations }, { data: transitions }] = await Promise.all([
    supabase
      .from('reel_inspirations')
      .select('id, title, short_description, cover_image, instagram_url')
      .eq('status', 'active')
      .not('instagram_url', 'is', null),
    supabase
      .from('reel_transitions')
      .select('id, title, short_description, cover_image, instagram_url')
      .eq('status', 'active')
      .not('instagram_url', 'is', null),
  ])
  return (
    <PruebaReelsClient
      inspirations={(inspirations as unknown as ReelInspiration[] | null) ?? []}
      transitions={(transitions as unknown as ReelTransition[] | null) ?? []}
      initialVideoUrl={null}
    />
  )
}