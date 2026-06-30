import { Profile } from '@/types/database'

export const ACCESS_REDIRECT = '/access'

export function hasActiveAccess(
  profile: Pick<Profile, 'access_status' | 'subscription_status' | 'is_active' | 'access_source' | 'access_expires_at'>
): boolean {
  // Promo expirado: si el acceso viene de un promo y ya caducó, se revoca perezosamente
  if (
    profile.access_source === 'promo' &&
    profile.access_expires_at &&
    new Date(profile.access_expires_at).getTime() < Date.now()
  ) {
    return false
  }
  if (profile.access_status === 'active') return true
  if (
    profile.subscription_status === 'active' ||
    profile.subscription_status === 'trialing'
  ) return true
  // Legacy fallback for users not yet migrated
  if (profile.is_active === true) return true
  return false
}