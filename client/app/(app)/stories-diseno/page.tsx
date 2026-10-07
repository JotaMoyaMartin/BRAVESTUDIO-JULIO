import { createClient } from '@/lib/supabase/server'
import { BrandFullContextInput } from '@/lib/ai/brand-context'
import PageTransition from '@/components/ui/PageTransition'
import StoriesDisenoClient from './StoriesDisenoClient'
import StoriesDisenoCatalog, { CatalogPack } from './StoriesDisenoCatalog'
import { seedPacks } from '@/lib/stories-diseno/samples'
import type { StoryDesignSlide, StoryDesignElement } from '@/lib/stories-diseno/types'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')


/** Los packs semilla montados como catálogo demo (sin DB, ids sintéticos). */
function demoPacks(): CatalogPack[] {
  return seedPacks().map(p => ({
    id: p.slug,
    slug: p.slug,
    title: p.title,
    goal: p.goal,
    description: p.description,
    flowType: p.flowType,
    storyCount: p.storyCount,
    sort: p.sort,
    templates: p.templates
      .filter(t => t.status === 'published' && !t.isLocked)
      .map(t => ({
        id: t.slug,
        slug: t.slug,
        title: t.title,
        category: t.category,
        description: t.description,
        recommendedUse: t.recommendedUse,
        isLocked: t.isLocked,
        slides: t.slides.map(sl => ({
          id: `${t.slug}-${sl.order}`,
          templateId: t.slug,
          order: sl.order,
          background: sl.background,
          layoutType: sl.layoutType,
          elements: sl.elements.map(e => ({ ...e, id: `${t.slug}-s${sl.order}-e${e.id}` })),
        })),
      })),
  }))
}

interface PackRow {
  id: string
  slug: string
  title: string
  goal: string
  description: string
  flow_type: string
  story_count: number
}
interface TemplateRow {
  id: string
  pack_id: string
  slug: string
  title: string
  category: string
  description: string
  recommended_use: string
  is_locked: boolean
  slides: { order: number; background: string; layoutType: string; elements: StoryDesignElement[] }[]
}

/** La página viva: catálogo de packs si hay publicados; teaser si no. */
export default async function StoriesDisenoPage() {
  if (!IS_CONFIGURED) {
    // Demo: catálogo con los packs semilla (sin DB ni persistencia).
    return <PageTransition><StoriesDisenoCatalog packs={demoPacks()} brand={null} hasBrand={false} /></PageTransition>
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: packsRaw } = await supabase
    .from('story_design_packs')
    .select('*, story_design_templates(*)')
    .eq('published', true)
    .order('sort')

  const packs: CatalogPack[] = ((packsRaw ?? []) as unknown as (PackRow & { story_design_templates: TemplateRow[] })[]).map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    goal: p.goal as CatalogPack['goal'],
    description: p.description,
    flowType: p.flow_type as CatalogPack['flowType'],
    storyCount: p.story_count,
    sort: 0,
    templates: (p.story_design_templates ?? []).map(t => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      category: t.category,
      description: t.description,
      recommendedUse: t.recommended_use || t.description,
      isLocked: t.is_locked,
      slides: (t.slides ?? []).map<StoryDesignSlide>(sl => ({
        id: `${t.slug}-${sl.order}`,
        templateId: t.slug,
        order: sl.order,
        background: sl.background,
        layoutType: (sl.layoutType || 'text-only') as StoryDesignSlide['layoutType'],
        elements: sl.elements ?? [],
      })),
    })),
  }))

  if (packs.length === 0 || !user) {
    return <PageTransition><StoriesDisenoClient /></PageTransition>
  }

  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('optimized_summary, salon_name, main_services, service_to_promote, strategy_json, raw_input')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <PageTransition>
      <StoriesDisenoCatalog packs={packs} brand={(brand as BrandFullContextInput) || null} hasBrand={Boolean((brand as BrandFullContextInput | null)?.optimized_summary || (brand as BrandFullContextInput | null)?.salon_name)} />
    </PageTransition>
  )
}