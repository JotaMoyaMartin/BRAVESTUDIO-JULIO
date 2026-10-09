import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DESIGN_UPLOADS_BUCKET, ensureDesignUploadsBucket } from '@/lib/integrations/canva'
import { requireDesignAccess, sanitizeField } from '@/lib/design/server'

/**
 * Subida de fotos de la clienta para campos user_image de plantillas de diseño.
 *
 * Bucket PRIVADO design-uploads, aislamiento por usuaria en el path
 * (u/{userId}/{campo}-{ts36}.{ext}) y lectura SOLO vía signed URL de 24h:
 * Canva necesita una URL accesible ≥ 1h para crear el asset.
 * La clienta jamás obtiene acceso público a nada.
 */

const MAX_BYTES = 15 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const SIGNED_TTL_S = 86_400

export async function POST(request: NextRequest) {
  const auth = await requireDesignAccess()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Formulario inválido' }, { status: 400 })

  const file = form.get('file')
  const fieldRaw = form.get('field')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 })
  }
  const field = sanitizeField(fieldRaw)
  if (!field) {
    return NextResponse.json({ error: 'Campo inválido' }, { status: 400 })
  }
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Formato no válido (usa JPG, PNG o WEBP)' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen pesa más de 15 MB' }, { status: 400 })
  }

  const admin = createAdminClient()
  await ensureDesignUploadsBucket(admin)

  const path = `u/${auth.userId}/${field}-${Date.now().toString(36)}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error } = await admin.storage.from(DESIGN_UPLOADS_BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: '31536000',
  })
  if (error) {
    return NextResponse.json({ error: `No se pudo guardar la imagen: ${error.message}` }, { status: 500 })
  }

  const { data: signed, error: e2 } = await admin.storage
    .from(DESIGN_UPLOADS_BUCKET)
    .createSignedUrl(path, SIGNED_TTL_S)
  if (e2 || !signed) {
    return NextResponse.json({ error: 'No se pudo preparar la imagen para el diseño' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, path, signedUrl: signed.signedUrl })
}