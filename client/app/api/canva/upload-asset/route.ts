import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DESIGN_EXPORTS_BUCKET,
  ensureDesignExportsBucket,
  parseDesignRef,
} from '@/lib/integrations/canva'

/**
 * Subida MANUAL de assets de plantilla (vía V1, sin exports de Canva):
 *   kind 'photo' → PNG default de un campo image  → binding.defaultPhotoPath
 *   kind 'bg'    → PNG "bare" de una página (sin texto) → source.bg_paths
 * El admin los exporta desde el editor de Canva y los sube aquí. Van al
 * bucket PRIVADO design-exports — NUNCA a design-uploads (es de clientas).
 * Mismo patrón de paths/cache que createTemplatePreviews (templates/{id}/...).
 */

const MAX_BYTES = 15 * 1024 * 1024

/** Extensiones admitidas → contentType Storage (jpg re-subido como jpg). */
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

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
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const form = await request.formData().catch(() => null)
  if (!form || !(form instanceof FormData)) {
    return NextResponse.json({ error: 'Formulario inválido' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera los 15MB' }, { status: 400 })
  }
  const designId = parseDesignRef(String(form.get('designId') ?? ''))
  if (!designId) return NextResponse.json({ error: 'Design ID inválido' }, { status: 400 })
  const kindRaw = String(form.get('kind') ?? '')
  const kind = kindRaw === 'bg' || kindRaw === 'photo' ? kindRaw : null
  if (!kind) return NextResponse.json({ error: "kind debe ser 'bg' o 'photo'" }, { status: 400 })
  const page = Number(form.get('page'))
  if (!Number.isInteger(page) || page < 1 || page > 99) {
    return NextResponse.json({ error: 'Página inválida (≥ 1)' }, { status: 400 })
  }
  const ext = EXT_BY_MIME[file.type]
  if (!ext) return NextResponse.json({ error: 'Solo se admiten PNG o JPG' }, { status: 400 })

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const admin = createAdminClient()
    await ensureDesignExportsBucket(admin)
    // Mismo molde que createTemplatePreviews: templates/{designId}/{tipo}-p{page}-{stamp}.
    const stamp = Date.now().toString(36)
    const path = `templates/${designId}/${kind === 'bg' ? 'bare' : 'photo'}-p${page}-${stamp}.${ext}`
    const { error } = await admin.storage.from(DESIGN_EXPORTS_BUCKET).upload(path, buffer, {
      contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      cacheControl: '31536000',
    })
    if (error) return NextResponse.json({ error: `Storage: ${error.message}` }, { status: 500 })
    return NextResponse.json({ ok: true, path })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}