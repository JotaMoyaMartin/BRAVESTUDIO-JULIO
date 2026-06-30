import 'dotenv/config'

/**
 * Centralized environment configuration.
 *
 * IMPORTANT: this module must NEVER throw at import time. On a serverless
 * platform (Vercel) a throw during module load crashes the whole function
 * invocation (FUNCTION_INVOCATION_FAILED) before it can return a response.
 * Instead we read everything defensively and expose `getMissingEnv()` so
 * routes can report misconfiguration as a clean JSON error.
 */
function read(name: string, fallback = ''): string {
  return process.env[name] || fallback
}

export const env = {
  port: Number(read('PORT', '4000')),
  nodeEnv: read('NODE_ENV', 'development'),
  isProduction: read('NODE_ENV', 'development') === 'production',
  corsOrigin: read('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  supabase: {
    url: read('SUPABASE_URL'),
    anonKey: read('SUPABASE_ANON_KEY'),
    serviceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
  },
}

/** Returns the names of any required env vars that are missing. */
export function getMissingEnv(): string[] {
  const missing: string[] = []
  if (!env.supabase.url) missing.push('SUPABASE_URL')
  if (!env.supabase.anonKey) missing.push('SUPABASE_ANON_KEY')
  if (!env.supabase.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

/** True when all required configuration is present. */
export function isConfigured(): boolean {
  return getMissingEnv().length === 0
}
