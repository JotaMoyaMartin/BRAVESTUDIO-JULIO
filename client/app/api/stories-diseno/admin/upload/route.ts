import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * STORIES DISEÑO — subida de fotos de muestra para el builder (admin).
 * POST multipart/form-data con `file` → guarda en Storage (bucket público
 * `story-design-assets`, se crea si no existe) y devuelve la URL pública.
 * Ese URL va al `content` del elemento image (queda como dato de plantilla:
 * same-origin no aplica aquí, pero html-to-image inlina la imagen con CORS —
 * Supabase Storage público sirve `Access-Control-Allow-Origin: *`).
 */
const BUCKET = 'story-design-assets'
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB — fotos de móvil sin pasarse

export async function POST(request: NextRequest) {
  // Auth igual que las demás rutas admin de stories-diseno
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const admin = createAdminClient()

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo imágenes' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La foto pasa de 8 MB' }, { status: 400 })
  }

  // Bucket público: crear a la primera (idempotente)
  const { data: buckets } = await admin.storage.listBuckets()
  const exists = (buckets ?? []).some(b => b.name === BUCKET)
  if (!exists) {
    const { error: e1 } = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: `${MAX_BYTES}` })
    if (e1 && !String(e1.message).includes('already exists')) {
      return NextResponse.json({ error: e1.message }, { status: 500 })
    }
  }

  const bytes = await file.arrayBuffer()
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: '31536000',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ ok: true, url: pub.publicUrl })
}