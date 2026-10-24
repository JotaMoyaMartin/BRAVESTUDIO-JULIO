/** Clientes del servicio · servidor (service role). Nunca desde el navegador. */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MATERIAL_BUCKET } from './types'

export type DB = ReturnType<typeof createAdminClient>

/** Usuaria con sesión y su rol. */
export async function currentUser(): Promise<{ id: string; email: string | null; role: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { id: user.id, email: user.email ?? null, role: (data as { role?: string } | null)?.role ?? 'user' }
}

export const isTeam = (role: string) => role === 'admin' || role === 'superadmin'
/** Clientas del servicio (y el equipo, para probar con «Vista Premium»). */
export const canUseTeam = (role: string) => role === 'premium' || isTeam(role)

export async function ensureMaterialBucket(db: DB) {
  const { data } = await db.storage.listBuckets()
  if (!(data ?? []).some(b => b.name === MATERIAL_BUCKET)) {
    await db.storage.createBucket(MATERIAL_BUCKET, { public: false })
  }
}

export function isMissingTable(e: unknown): boolean {
  return /equipo_|relation|schema cache/i.test(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e))
}
