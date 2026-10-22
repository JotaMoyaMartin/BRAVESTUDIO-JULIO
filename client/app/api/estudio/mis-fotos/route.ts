import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DESIGN_UPLOADS_BUCKET, ensureDesignUploadsBucket } from '@/lib/integrations/canva'
import { requireDesignAccess } from '@/lib/design/server'

/**
 * «Mis fotos» del Estudio de fotos: el banco de imágenes de cada estilista,
 * guardado EN SU CUENTA (no en el móvil) para usarlo en carruseles y stories
 * desde cualquier dispositivo.
 *
 * Bucket PRIVADO design-uploads, carpeta por usuaria: u/{userId}/mis-fotos/
 * Nombre: {id}__{formato}.jpg (formato 4x5, 9x16, 1x1…) → sin tabla en la BD.
 * Lectura solo con URL firmada (30 días, lo que dura un diseño guardado).
 */

const MAX_BYTES = 15 * 1024 * 1024
const MAX_FOTOS = 200
const SIGNED_TTL_S = 30 * 86_400
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const ID_RE = /^f[a-z0-9]{6,14}$/
const ASPECT_RE = /^\d{1,2}:\d{1,2}$/

const folder = (userId: string) => `u/${userId}/mis-fotos`

function parseName(name: string) {
  const m = name.match(/^(f[a-z0-9]{6,14})__(\d{1,2})x(\d{1,2})\.(jpg|png|webp)$/)
  if (!m) return null
  return { id: m[1], aspect: `${m[2]}:${m[3]}`, createdAt: parseInt(m[1].slice(1), 36) || 0 }
}

export async function GET() {
  const auth = await requireDesignAccess()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const admin = createAdminClient()
  await ensureDesignUploadsBucket(admin)

  const { data: files, error } = await admin.storage.from(DESIGN_UPLOADS_BUCKET)
    .list(folder(auth.userId), { limit: MAX_FOTOS, sortBy: { column: 'name', order: 'desc' } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const valid = (files || []).map(f => ({ f, meta: parseName(f.name) })).filter(x => x.meta)
  if (!valid.length) return NextResponse.json({ ok: true, photos: [] })

  const paths = valid.map(x => `${folder(auth.userId)}/${x.f.name}`)
  const { data: signed, error: e2 } = await admin.storage.from(DESIGN_UPLOADS_BUCKET).createSignedUrls(paths, SIGNED_TTL_S)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  const photos = valid
    .map((x, i) => ({ ...x.meta!, url: signed?.[i]?.signedUrl || null }))
    .filter(p => p.url)
    .sort((a, b) => b.createdAt - a.createdAt)
  return NextResponse.json({ ok: true, photos })
}

export async function POST(request: NextRequest) {
  const auth = await requireDesignAccess()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const aspectRaw = String(form?.get('aspect') || '4:5')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Falta la foto' }, { status: 400 })
  const ext = TYPES[file.type]
  if (!ext) return NextResponse.json({ error: 'Formato no válido (usa JPG, PNG o WEBP)' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'La foto pesa más de 15 MB' }, { status: 400 })
  const aspect = ASPECT_RE.test(aspectRaw) ? aspectRaw : '4:5'

  const admin = createAdminClient()
  await ensureDesignUploadsBucket(admin)

  const id = `f${Date.now().toString(36)}`
  const path = `${folder(auth.userId)}/${id}__${aspect.replace(':', 'x')}.${ext}`
  const { error } = await admin.storage.from(DESIGN_UPLOADS_BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    cacheControl: '31536000',
  })
  if (error) return NextResponse.json({ error: `No se pudo guardar la foto: ${error.message}` }, { status: 500 })

  // Tope por estilista: se borran las más antiguas.
  const { data: files } = await admin.storage.from(DESIGN_UPLOADS_BUCKET)
    .list(folder(auth.userId), { limit: 1000, sortBy: { column: 'name', order: 'desc' } })
  const sobran = (files || []).filter(f => parseName(f.name)).slice(MAX_FOTOS)
  if (sobran.length) await admin.storage.from(DESIGN_UPLOADS_BUCKET).remove(sobran.map(f => `${folder(auth.userId)}/${f.name}`))

  const { data: signed } = await admin.storage.from(DESIGN_UPLOADS_BUCKET).createSignedUrl(path, SIGNED_TTL_S)
  return NextResponse.json({ ok: true, photo: { id, aspect, createdAt: Date.now(), url: signed?.signedUrl || null } })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireDesignAccess()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  const id = request.nextUrl.searchParams.get('id') || ''
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'Foto no válida' }, { status: 400 })

  const admin = createAdminClient()
  const { data: files } = await admin.storage.from(DESIGN_UPLOADS_BUCKET)
    .list(folder(auth.userId), { limit: 1000, search: id })
  const paths = (files || []).filter(f => f.name.startsWith(`${id}__`)).map(f => `${folder(auth.userId)}/${f.name}`)
  if (paths.length) {
    const { error } = await admin.storage.from(DESIGN_UPLOADS_BUCKET).remove(paths)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
