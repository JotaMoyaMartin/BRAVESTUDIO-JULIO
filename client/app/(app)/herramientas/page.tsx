import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import HerramientasClient from './HerramientasClient'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

// Launcher completo de mini-apps. En Home v2 ya no es catálogo: aquí vive la
// libertad total (HOME = dirección, aquí = YO ELIJO). Todas las rutas intactas.
export default async function HerramientasPage() {
  let isPremium = false
  if (IS_CONFIGURED) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()
    const cookieStore = await cookies()
    const previewPremium = cookieStore.get('brave_preview_premium')?.value === 'true'
    const realRole = (profile as { role?: string } | null)?.role
    isPremium = realRole === 'premium' || (previewPremium && (realRole === 'admin' || realRole === 'superadmin'))
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink" style={{ letterSpacing: '-0.5px' }}>
          Todas las herramientas
        </h1>
        <p className="mt-1 text-sm text-cherry-dark opacity-70">Todo lo que puedes crear con BRÄVE, a tu ritmo.</p>
      </div>
      <HerramientasClient isPremium={isPremium} />
    </div>
  )
}