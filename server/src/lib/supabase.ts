import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isConfigured } from '../config/env'

/**
 * Lazily-created admin client — uses the service role key and bypasses Row
 * Level Security. Server-side ONLY; never expose this client or its key.
 *
 * Created on first use (not at import) so a missing env var can't crash the
 * serverless function at load time.
 */
let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!isConfigured()) {
    throw new Error('Supabase is not configured (missing environment variables)')
  }
  if (!_admin) {
    _admin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _admin
}

/**
 * Creates a request-scoped client authenticated as the end user, given their
 * access token. Respects Row Level Security. Use when acting on behalf of a user.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  if (!isConfigured()) {
    throw new Error('Supabase is not configured (missing environment variables)')
  }
  return createClient(env.supabase.url, env.supabase.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
