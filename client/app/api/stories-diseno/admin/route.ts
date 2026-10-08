import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StoryPackSeedRow, seedPacks } from '@/lib/stories-diseno/samples'
import type { StoryDesignTemplate } from '@/lib/stories-diseno/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, admin: createAdminClient() }
}

/** GET — packs con sus plantillas (todas, incluidas drafts: es el panel admin). */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const admin = auth.admin
  const { data: packs, error: e1 } = await admin
    .from('story_design_packs').select('*').order('sort')
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  const { data: templates, error: e2 } = await admin
    .from('story_design_templates').select('*').order('sort')
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  const byPack = new Map<string, StoryDesignTemplate[]>()
  for (const t of (templates as (StoryDesignTemplate & { pack_id: string })[]) || []) {
    const list = byPack.get(t.pack_id) ?? []
    list.push(t)
    byPack.set(t.pack_id, list)
  }
  return NextResponse.json({
    packs: ((packs as Record<string, unknown>[]) || []).map(p => ({
      ...p,
      templates: byPack.get(p.id as string) ?? [],
    })),
  })
}

/** POST — actions: 'seed' (crea packs iniciales idempotentes) | 'create-pack' | 'create-template'. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const admin = auth.admin
  const body = await request.json()

  if (body.action === 'seed') {
    let created = 0
    let skipped = 0
    for (const p of seedPacks()) {
      const { templates, storyCount, flowType, ...packRow } = p as StoryPackSeedRow
      const { data: existingPack } = await admin
        .from('story_design_packs').select('id').eq('slug', packRow.slug).maybeSingle()
      let packId = existingPack?.id as string | undefined
      if (!packId) {
        const { data: inserted, error } = await admin
          .from('story_design_packs')
          .insert({ ...packRow, flow_type: flowType, story_count: storyCount, published: true })
          .select('id').single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        packId = (inserted as { id: string }).id
        created++
      } else {
        skipped++
      }
      // Plantillas: solo las que no existen ya (por slug del pack)
      const { data: existingT } = await admin
        .from('story_design_templates')
        .select('id, slug')
        .eq('pack_id', packId)
      const have = new Set(((existingT as { slug: string }[]) || []).map(t => t.slug))
      const toInsert = (templates as StoryDesignTemplate[])
        .filter(t => !have.has(t.slug))
        .map((t, i) => ({
          pack_id: packId,
          slug: t.slug,
          title: t.title,
          category: t.category,
          description: t.description,
          recommended_use: t.recommendedUse,
          cover_image: t.coverImage,
          is_locked: t.isLocked,
          status: t.status,
          sort: i + 1,
          tags: t.tags,
          default_style: t.defaultStyle,
          slides: t.slides.map(sl => ({
            order: sl.order,
            background: sl.background,
            layoutType: sl.layoutType,
            elements: sl.elements.map(e => ({ ...e, id: `${t.slug}-s${sl.order}-e${e.id}` })),
          })),
        }))
      if (toInsert.length > 0) {
        const { error } = await admin.from('story_design_templates').insert(toInsert)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    return NextResponse.json({ ok: true, created, skipped })
  }

  if (body.action === 'create-pack') {
    const { title, goal, description, flowType } = body
    if (!title || !goal || !description) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }
    const slug = String(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { data, error } = await admin
      .from('story_design_packs')
      .insert({ slug: `${slug}-${Date.now().toString(36).slice(-4)}`, title, goal, description, flow_type: flowType || 'single-goal', story_count: 0 })
      .select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: (data as { id: string }).id })
  }

  if (body.action === 'create-template') {
    // Plantilla NUEVA EN BLANCO (1 slide vacío) dentro de un pack existente.
    const { packId, title, category, description } = body as {
      packId?: unknown
      title?: unknown
      category?: unknown
      description?: unknown
    }
    if (typeof packId !== 'string' || packId === '' || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }
    const tplTitle = title.trim()
    const tplCategory = typeof category === 'string' && category.trim() !== '' ? category.trim() : 'Plantilla'
    // Slug: mismo pipeline que create-pack + sufijo temporal (5 chars).
    const baseSlug = tplTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const slug = `${baseSlug || 'plantilla'}-${Date.now().toString(36).slice(-5)}`
    // sort = máximo sort de plantillas del pack + 1 (o 1 si el pack aún no tiene).
    const { data: sorts, error: eSort } = await admin
      .from('story_design_templates')
      .select('sort')
      .eq('pack_id', packId)
    if (eSort) return NextResponse.json({ error: eSort.message }, { status: 500 })
    const maxSort = ((sorts as { sort: number | null }[]) || []).reduce((max, row) => Math.max(max, row.sort ?? 0), 0)
    const { data, error } = await admin
      .from('story_design_templates')
      .insert({
        pack_id: packId,
        slug,
        title: tplTitle,
        category: tplCategory,
        description: typeof description === 'string' && description.trim() !== '' ? description.trim() : 'Para la secuencia del pack',
        recommended_use: 'Edítalo en el builder',
        cover_image: null,
        is_locked: false,
        status: 'draft',
        sort: maxSort + 1,
        tags: ['nuevo'],
        default_style: {},
        slides: [{
          order: 1,
          background: '#FFFDF5',
          layoutType: 'text-only',
          name: 'Portada',
          elements: [],
        }],
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: (data as { id: string }).id })
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 })
}