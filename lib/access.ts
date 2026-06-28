import { Profile } from '@/types/database'

export const ACCESS_REDIRECT = '/access'

export function hasActiveAccess(
  profile: Pick<Profile, 'access_status' | 'subscription_status' | 'is_active'>
): boolean {
  if (profile.access_status === 'active') return true
  if (
    profile.subscription_status === 'active' ||
    profile.subscription_status === 'trialing'
  ) return true
  // Legacy fallback for users not yet migrated
  if (profile.is_active === true) return true
  return false
}
