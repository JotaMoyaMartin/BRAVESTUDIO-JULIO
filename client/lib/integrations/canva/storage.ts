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