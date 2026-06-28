import { createBrowserClient } from '@supabase/ssr'

// Use untyped for write flexibility; reads are typed via explicit casts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
