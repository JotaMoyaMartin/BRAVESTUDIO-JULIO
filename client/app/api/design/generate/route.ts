import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CanvaBinding,
  CanvaBindingMap,
  CanvaError,
  DESIGN_EXPORTS_BUCKET,
  DESIGN_UPLOADS_BUCKET,
  GenerationPhotoInput,
  ensureDesignExportsBucket,
  ensureFreshSystemToken,
  runDesignGeneration,
} from '@/lib/integrations/canva'
import {
  DesignTemplateRow,
  fetchPublishedTemplate,
  isUuid,
  requireDesignAccess,
  sanitizeField,
} from '@/lib/design/server'

/**
 * GENERACIÓN de diseños para la clienta (módulo "Diseños"):
 *   plantilla publicada BRÄVE + textos + fotos (paths design-uploads)
 *   → Canva autofill create_from_design con la conexión del EQUIPO
 *   → export PNG → bucket privado design-exports → design_projects.
 *
 * Reglas de valores (bindings mandan):
 *   keep_default / vacío → OMITIR (Canva rechaza cadenas vacías)
 *   brand_text           → prefila server-side desde brand_profiles
 *   user_text / ai_text  → usa el texto que llegó (vacío se omite)
 *
 * La clienta NO interactúa con Canva en ningún punto; los errores se
 * cuentan con los mismos mensajes humanos del spike.
 */

const PAGE_TTL_S = 86_400

interface BrandValues {
  salon_name?: string | null
  city?: string | null
  specialty?: string | null
  service_to_promote?: string | null
  most_profitable_service?: string | null
  main_services?: string[] | null
}

/**
 * brand_text → valor de marca real de la clienta (misma fuente que
 * lib/ai/brand-context.ts: brand_profiles). IG handle no existe en BD hoy
 * → se omite (keep por defecto del diseño). Sin match claro → omite.
 */
function brandValueForField(field: string, binding: CanvaBinding, brand: BrandValues | null): string | null {
  if (!brand) return null
  const hay = `${field} ${binding.label ?? ''} ${binding.instructions ?? ''}`.toLowerCase()
  if (/(handle|instagram|\big\b|usuario|cuenta)/.test(hay)) return null
  if (/(nombre|name|salon|negocio|marca|brand)/.test(hay)) return brand.salon_name ?? null
  if (/(ciudad|city|local)/.test(hay)) return brand.city ?? null
  if (/(especial|specialty)/.test(hay)) return brand.specialty ?? null
  if (/(servicio|service|promo|oferta)/.test(hay)) {
    return brand.service_to_promote ?? brand.most_profitable_service ?? brand.main_services?.[0] ?? null
  }
  return null
}

/** Mensajes humanos del spike — un mapa, mismos textos que /api/canva/generate. */
const HUMAN_ERRORS: Record<string, string> = {
  trial_quota_exceeded: 'La cuenta Canva se quedó sin usos de prueba — necesita plan Pro/Teams.',
  design_not_fillable: 'Ese diseño no tiene campos de Data Autofill.',
  field_mismatch: 'Un campo cambió en Canva — sincroniza la plantilla.',
  type_mismatch: 'Un campo cambió de tipo en Canva — sincroniza la plantilla.',
  too_many_requests: 'Límite de Canva — espera un momento.',
  job_timeout: 'La generación superó el tiempo máximo — reintenta.',
  license_required: 'El diseño usa elementos premium que esta cuenta no puede exportar.',
}

export async function POST(request: NextRequest) {
  const auth = await requireDesignAccess()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as
    | { templateId?: string; texts?: Record<string, unknown>; photos?: Record<string, unknown> }
    | null
  const templateId = body?.templateId
  if (typeof templateId !== 'string' || !templateId) {
    return NextResponse.json({ error: 'Falta templateId' }, { status: 400 })
  }
  if (!isUuid(templateId)) {
    return NextResponse.json({ error: 'Esta plantilla ya no está disponible' }, { status: 404 })
  }

  // Textos y fotos tal como llegan (normalizados; los paths se validan después).
  const textSent: Record<string, string> = {}
  for (const [field, value] of Object.entries(body?.texts ?? {})) {
    const safe = sanitizeField(field)
    if (!safe || typeof value !== 'string') continue
    const t = value.trim()
    if (t) textSent[safe] = t.slice(0, 2000)
  }
  const photoSent: Record<string, string> = {}
  for (const [field, value] of Object.entries(body?.photos ?? {})) {
    const safe = sanitizeField(field)
    if (!safe || typeof value !== 'string' || !value) continue
    // Solo paths del propio bucket de la clienta — nadie cuelga fotos ajenas.
    if (!/^u\/[a-z0-9-]+\/[a-z_]+-[0-9a-z]+\.(jpg|png|webp)$/i.test(value)) continue
    if (!value.startsWith(`u/${auth.userId}/`)) continue
    photoSent[safe] = value
  }

  const admin = createAdminClient()
  let row: DesignTemplateRow | null = null
  try {
    row = await fetchPublishedTemplate(admin, templateId)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: 'Esta plantilla ya no está disponible' }, { status: 404 })
  }

  const bindings = (row.bindings ?? {}) as CanvaBindingMap

  // ── Textos: SOLO lo dictan los bindings ───────────────────────────
  const texts: Record<string, string> = {}
  let needsBrand = false
  for (const [field, binding] of Object.entries(bindings)) {
    if (!binding?.behavior || binding.behavior === 'keep_default') continue
    if (binding.behavior === 'brand_text') { needsBrand = true; continue }
    const provided = textSent[field]
    if (!provided) continue
    const maxLen = binding.maxLength && binding.maxLength > 0 ? Math.round(binding.maxLength) : 0
    texts[field] = maxLen ? provided.slice(0, maxLen) : provided
  }

  if (needsBrand) {
    const { data: bp } = await admin
      .from('brand_profiles')
      .select('salon_name, city, specialty, service_to_promote, most_profitable_service, main_services')
      .eq('user_id', auth.userId)
      .maybeSingle()
    const brand = (bp as unknown as BrandValues | null) ?? null
    for (const [field, binding] of Object.entries(bindings)) {
      if (binding?.behavior !== 'brand_text') continue
      const val = brandValueForField(field, binding, brand)
      if (val && val.trim()) texts[field] = val.trim().slice(0, 2000)
    }
  }

  // ── Fotos: campo image + path firmado desde design-uploads ────────
  const photos: GenerationPhotoInput[] = []
  for (const [field, binding] of Object.entries(bindings)) {
    if (binding?.behavior !== 'user_image') continue
    const path = photoSent[field]
    if (!path) continue
    const { data: signed, error: signErr } = await admin.storage
      .from(DESIGN_UPLOADS_BUCKET)
      .createSignedUrl(path, 3_600)
    if (signErr || !signed) {
      return NextResponse.json(
        { error: 'Una de las fotos ya no está disponible — vuelve a subirla y reintenta.' },
        { status: 400 },
      )
    }
    photos.push({ field, url: signed.signedUrl, name: path.split('/').pop() ?? field })
  }

  // ── Canva: conexión del EQUIPO + motor del spike (sin reescribirlo) ──
  try {
    const { accessToken } = await ensureFreshSystemToken()
    const generation = await runDesignGeneration({
      accessToken,
      designId: row.provider_design_id,
      input: { texts, photos },
      title: row.name,
    })

    // Guardar los PNG en BRÄVE Storage (las urls de Canva expiran en 24h).
    await ensureDesignExportsBucket(admin)
    const stamp = Date.now().toString(36)
    const pageRows: { page: number; path: string; url: string | null }[] = []
    for (const page of generation.pages) {
      const path = `generados/${row.id}/${auth.userId}/${stamp}-p${String(page.page).padStart(2, '0')}.png`
      const { error } = await admin.storage.from(DESIGN_EXPORTS_BUCKET).upload(path, page.buffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
      })
      if (error) {
        return NextResponse.json({
          error: `El diseño se generó pero no se pudo guardar en Storage: ${error.message}`,
          generatedDesignId: generation.designId,
        }, { status: 500 })
      }
      const { data: signed } = await admin.storage
        .from(DESIGN_EXPORTS_BUCKET)
        .createSignedUrl(path, PAGE_TTL_S)
      pageRows.push({ page: page.page, path, url: signed?.signedUrl ?? null })
    }

    // Proyecto de la clienta: reproducible + auditable (values = valores aplicados).
    const { data: proj, error: pErr } = await admin
      .from('design_projects')
      .insert({
        user_id: auth.userId,
        template_id: row.id,
        values: { texts, photos: photoSent },
        generated_design_id: generation.designId,
        assets: pageRows.map(p => ({ page: p.page, path: p.path })),
        status: 'completed',
      })
      .select('id')
      .single()
    if (pErr || !proj) {
      return NextResponse.json({
        error: `El diseño se generó pero no se pudo guardar el proyecto: ${pErr?.message ?? 'unknown'}`,
        generatedDesignId: generation.designId,
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      projectId: (proj as { id: string }).id,
      generatedDesignId: generation.designId,
      pages: pageRows.map(p => ({ page: p.page, url: p.url })),
      usesRemaining: generation.usesRemaining,
    })
  } catch (err) {
    if (err instanceof CanvaError) {
      if (err.code === 'not_connected') {
        return NextResponse.json({ error: 'Canva no está conectado todavía' }, { status: 503 })
      }
      return NextResponse.json(
        { error: HUMAN_ERRORS[err.code] ?? err.message, code: err.code },
        { status: err.status >= 500 ? 502 : err.status },
      )
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}