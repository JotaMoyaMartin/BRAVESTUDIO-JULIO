import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Storage del lado BRÄVE para las imágenes de slides (Carruseles premium).
 *
 * Bucket PRIVADO 'carrusel-slides' (se cubre aquí su creación para
 * instalaciones parciales, mismo patrón que lib/integrations/canva/storage.ts).
 * Las urls se firman bajo demanda (24h) — nunca se exponen paths públicos y
 * los objetos quedan aislados por prefijo de user_id.
 * Solo código server: todo pasa por la service role del admin client.
 */

export const CARRUSEL_BUCKET = 'carrusel-slides'

/** Garantiza el bucket privado (idempotente — cubre instalaciones parciales). */
export async function ensureCarouselBucket(): Promise<void> {
  const admin = createAdminClient()
  const { data: buckets } = await admin.storage.listBuckets()
  if (!(buckets ?? []).some(b => b.name === CARRUSEL_BUCKET)) {
    await admin.storage.createBucket(CARRUSEL_BUCKET, { public: false })
  }
}

/**
 * Sube la imagen de UNA slide al bucket privado.
 * Path aislado: <userId>/<draftId>/slide-NN-<tick>.<ext> (NN = nº de slide
 * con cero-pad para lectura humana). Upsert desactivado: cada generación
 * es un objeto nuevo, jamás se sobreescribe otro.
 */
export async function uploadSlideImage(
  userId: string,
  draftId: string,
  index: number,
  base64: string,
  mime: string,
): Promise<string> {
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0) {
    throw new Error('La imagen generada llega vacía — nada que guardar.')
  }

  const ext = mime === 'image/png' ? 'png' : 'jpg'
  const imagePath = `${userId}/${draftId}/slide-${String(index + 1).padStart(2, '0')}-${Date.now().toString(36)}.${ext}`

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from(CARRUSEL_BUCKET)
    .upload(imagePath, bytes, { contentType: mime, upsert: false })
  if (error) {
    throw new Error(`No se pudo guardar la imagen de la slide en el storage: ${error.message}`)
  }
  return imagePath
}

/** Firma un path del bucket (24h) para mostrarlo en la UI sin exponerlo público. */
export async function signSlideUrl(
  imagePath: string,
): Promise<{ signedUrl: string | null }> {
  const admin = createAdminClient()
  const { data } = await admin.storage
    .from(CARRUSEL_BUCKET)
    .createSignedUrl(imagePath, 60 * 60 * 24)
  return { signedUrl: data?.signedUrl ?? null }
}