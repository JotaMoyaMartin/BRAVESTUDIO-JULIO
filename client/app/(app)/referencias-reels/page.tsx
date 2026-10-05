import { createClient } from '@/lib/supabase/server'
import ReferenciasReelsClient from './ReferenciasReelsClient'
import PageTransition from '@/components/ui/PageTransition'
import { DEMO_REFERENCES, ReelReference } from './demo-references'

// MOCK de la sección "Referencias" (borrador para aprobación de Jota, 2-oct-2026).
// En demo (sin Supabase) enseña DEMO_REFERENCES con portadas estáticas.
// Al aprobar: tabla propia + panel admin (como reel_inspirations) y se quita la entrada TEST del Sidebar.

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function ReferenciasReelsPage() {
  if (!IS_CONFIGURED) {
    return (
      <PageTransition>
        <ReferenciasReelsClient references={DEMO_REFERENCES} isDemo />
      </PageTransition>
    )
  }

  // Modo real: mientras no exista la tabla de referencias, reuse items de
  // inspiraciones que ya tengan url de IG (mismo criterio que /prueba-reels).
  const supabase = await createClient()
  const { data: inspirations } = await supabase
    .from('reel_inspirations')
    .select('id, title, short_description, cover_image, instagram_url')
    .eq('status', 'active')
    .not('instagram_url', 'is', null)

  const references: ReelReference[] = ((inspirations as {
    title: string
    short_description: string | null
    cover_image: string | null
    instagram_url: string
  }[]) || [])
    .filter(i => !!i.instagram_url)
    .map(i => {
      const match = (i.instagram_url || '').match(/instagram\.com\/(?:[A-Za-z0-9_.]*\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/)
      return {
        id: `db-${match ? match[2] : Math.random().toString(36).slice(2)}`,
        title: i.title || 'Referencia de reel',
        account: match ? '' : '@instagram',
        accountLabel: 'Cuenta de Instagram',
        followers: '',
        cover_image: i.cover_image || '/demo-references/ref-Dd9la35ATBj.jpg',
        instagram_url: i.instagram_url,
        short_description: i.short_description || '',
        steal: i.short_description || '',
        structure: [],
      }
    })

  return (
    <PageTransition>
      <ReferenciasReelsClient references={references} />
    </PageTransition>
  )
}