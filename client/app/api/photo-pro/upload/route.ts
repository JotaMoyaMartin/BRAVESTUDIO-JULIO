import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * FOTO PRO — subida de la foto ORIGINAL (usuaria final, sesión propia).
 *
 * Difiere de los uploads admin del repo:
 *   - auth = sesión de la usuaria (no role admin)
 *   - bucket PRIVADO `photo-pro` (fotos de clientas: no hay acceso público)
 *   - path siempre `<user.id>/<assetId>/source.*`: aislamiento por usuaria
 *   - Nada devuelto como URL permanente: signed URL de 1h para previsualizar.
 *
 * Los objetos solo se leen/escenarian via API (service role) tras comprobar
 * propiedad del job — RLS/servicio de storage ni siquiera necesita políticas.
 */
const BUCKET = 'photo-pro'
const MAX_BYTES = 10 * 1024 * 1024 // fotos de móvil pre-normalizadas; margen generoso
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'formato_no_valido' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'foto_demasiado_grande' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Bucket privado: crear a la primera (idempotente — patrón stories-diseno)
  const { data: buckets } = await admin.storage.listBuckets()
  const exists = (buckets ?? []).some(b => b.name === BUCKET)
  if (!exists) {
    const { data: created, error: e1 } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: `${MAX_BYTES}`,
    })
    if (e1 && !String(e1.message).includes('already exists')) {
      if (!created) return NextResponse.json({ error: 'storage_error' }, { status: 500 })
    }
  }

  const assetId = crypto.randomUUID()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.id}/${assetId}/source.${ext}`

  const bytes = await file.arrayBuffer()
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: '31536000',
  })
  if (error) return NextResponse.json({ error: 'storage_error' }, { status: 500 })

  // Signed URL para PREVISUALIZAR (1h): nunca URL pública permanente.
  const { data: signed, error: e2 } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)
  if (e2 || !signed) return NextResponse.json({ error: 'storage_error' }, { status: 500 })

  return NextResponse.json({
    ok: true,
    assetId,
    assetPath: path,
    url: signed.signedUrl,
  })
}