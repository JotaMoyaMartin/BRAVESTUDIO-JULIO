import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Storage del lado BRÄVE para artefactos Canva. Bucket PRIVADO 'design-exports'
 * (creado por SQL-CANVA-SPIKE.sql; aquí cubrimos instalaciones parciales).
 * Las urls firmadas se generan bajo demanda (24h) — nunca se guardan.
 */

export const DESIGN_EXPORTS_BUCKET = 'design-exports'

export async function ensureDesignExportsBucket(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const { data: buckets } = await admin.storage.listBuckets()
  if (!(buckets ?? []).some(b => b.name === DESIGN_EXPORTS_BUCKET)) {
    await admin.storage.createBucket(DESIGN_EXPORTS_BUCKET, { public: false })
  }
}

/**
 * Fotos de las clientas (user_text→user_image del módulo "Diseños").
 * Bucket PRIVADO: solo el server lee/escena — la clienta sube y nunca obtiene
 * acceso público a otros objetos (paths aislados por user_id).
 */
export const DESIGN_UPLOADS_BUCKET = 'design-uploads'

export async function ensureDesignUploadsBucket(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const { data: buckets } = await admin.storage.listBuckets()
  if (!(buckets ?? []).some(b => b.name === DESIGN_UPLOADS_BUCKET)) {
    await admin.storage.createBucket(DESIGN_UPLOADS_BUCKET, { public: false })
  }
}