import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

/**
 * Admin client — uses the service role key and bypasses Row Level Security.
 * Server-side ONLY. Never expose this client or its key to the browser.
 */
export const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Creates a request-scoped client authenticated as the end user, given their
 * access token. Respects Row Level Security. Use when acting on behalf of a user.
 */
export function createUserClient(accessToken: string) {
  return createClient(env.supabase.url, env.supabase.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
