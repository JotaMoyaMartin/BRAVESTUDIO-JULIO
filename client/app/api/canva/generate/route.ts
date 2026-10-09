import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CanvaError,
  DESIGN_EXPORTS_BUCKET,
  ensureDesignExportsBucket,
  ensureFreshToken,
  parseDesignRef,
  runDesignGeneration,
  GenerationPhotoInput,
} from '@/lib/integrations/canva'

/**
 * GENERACIÓN E2E del spike (solo ADMIN / página de prueba):
 *   textos + fotos (signed URLs ya subidas) → Canva:
 *   url-asset-uploads → autofill create_from_design → export PNG
 *   → download → bucket PRIVADO design-exports → signed URLs de 24h.
 *
 * El design master de Canva NUNCA se muta (create_from_design crea instancia
 * nueva). Los PNG devueltos son de BRÄVE Storage, no de las urls 24h de Canva.
 */

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, userId: user.id }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as
    | { designRef?: string; texts?: Record<string, string>; photos?: GenerationPhotoInput[]; title?: string }
    | null
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const designId = parseDesignRef(body.designRef ?? '')
  if (!designId) return NextResponse.json({ error: 'Design ID/URL inválido' }, { status: 400 })

  const texts: Record<string, string> = {}
  for (const [field, value] of Object.entries(body.texts ?? {})) {
    // Texto vacío = Mantener original (Canva rechaza cadenas vacías en /autofills).
    if (typeof value === 'string' && value.trim()) texts[field] = value.slice(0, 2000)
  }
  const photos = (body.photos ?? []).filter(
    p => p && typeof p.field === 'string' && typeof p.url === 'string' && p.url.startsWith('https://'),
  )

  try {
    const { accessToken } = await ensureFreshToken(auth.userId)
    const generation = await runDesignGeneration({ accessToken, designId, input: { texts, photos }, title: body.title })

    // Guardar los PNG en Storage BRÄVE (las urls de Canva expiran en 24h).
    const admin = createAdminClient()
    await ensureDesignExportsBucket(admin)
    const pages = []
    for (const page of generation.pages) {
      const path = `spike/${designId}/generado-${String(page.page).padStart(2, '0')}-${Date.now().toString(36)}.png`
      const { error } = await admin.storage.from(DESIGN_EXPORTS_BUCKET).upload(path, page.buffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
      })
      if (error) {
        return NextResponse.json({
          error: `El diseño se generó (Canva ${generation.designId}) pero no se pudo guardar en Storage: ${error.message}`,
          generatedDesignId: generation.designId,
        }, { status: 500 })
      }
      const { data: signed } = await admin.storage.from(DESIGN_EXPORTS_BUCKET).createSignedUrl(path, 86_400)
      pages.push({ page: page.page, path, url: signed?.signedUrl ?? null })
    }

    return NextResponse.json({
      ok: true,
      generatedDesignId: generation.designId,
      usesRemaining: generation.usesRemaining,
      durationMs: Date.now() - startedAt,
      pages,
    })
  } catch (err) {
    if (err instanceof CanvaError) {
      const human: Record<string, string> = {
        trial_quota_exceeded: 'La cuenta Canva se quedó sin usos de prueba — necesita plan Pro/Teams.',
        design_not_fillable: 'Ese diseño no tiene campos de Data Autofill.',
        field_mismatch: 'Un campo cambió en Canva — sincroniza la plantilla.',
        too_many_requests: 'Límite de Canva — espera un momento.',
        job_timeout: 'La generación superó el tiempo máximo — reintenta.',
        license_required: 'El diseño usa elementos premium que esta cuenta no puede exportar.',
      }
      return NextResponse.json({ error: human[err.code] ?? err.message, code: err.code }, { status: err.status >= 500 ? 502 : err.status })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}