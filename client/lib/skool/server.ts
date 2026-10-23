/**
 * ACCESO SKOOL · servidor. Usa la service role (tabla skool_members sin
 * políticas). Nunca importar desde el navegador.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { hasActiveAccess } from '@/lib/access'
import { normalizeEmail } from './members'
import type { Profile } from '@/types/database'

type AccessProfile = Pick<Profile, 'id' | 'role' | 'access_status' | 'subscription_status' | 'is_active' | 'access_source' | 'access_expires_at'>

const PROFILE_COLS = 'id, role, access_status, subscription_status, is_active, access_source, access_expires_at'

export async function isSkoolMember(email: string): Promise<boolean> {
  const db = createAdminClient()
  const { data, error } = await db.from('skool_members').select('status').eq('email', normalizeEmail(email)).maybeSingle()
  if (error) throw error
  return (data as { status?: string } | null)?.status === 'activo'
}

/**
 * Si su email está en la lista de Skool, le da acceso (o se lo devuelve si
 * volvió). No toca a quien tiene acceso por Stripe o manual.
 */
export async function activateSkoolAccess(userId: string, email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  if (!(await isSkoolMember(email).catch(() => false))) return false
  const db = createAdminClient()
  const { data } = await db.from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle()
  const p = data as AccessProfile | null
  if (!p) return false
  const keepsOwnAccess = (p.access_source === 'stripe' || p.access_source === 'manual') && hasActiveAccess(p)
  if (keepsOwnAccess) return true
  const { error } = await db.from('profiles')
    .update({ access_status: 'active', access_source: 'skool', access_expires_at: null, is_active: true } as never)
    .eq('id', userId)
  return !error
}
