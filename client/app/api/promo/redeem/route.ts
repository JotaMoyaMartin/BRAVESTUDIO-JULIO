import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const userSupabase = await createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Look up the promo code
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (!promo) {
    return NextResponse.json({ error: 'Código no válido o desactivado.' }, { status: 400 })
  }

  if (promo.expires_at && promo.expires_at < now) {
    return NextResponse.json({ error: 'Este código ha expirado.' }, { status: 400 })
  }

  if (promo.max_redemptions !== null && promo.redemptions_count >= promo.max_redemptions) {
    return NextResponse.json({ error: 'Este código ha alcanzado el límite de usos.' }, { status: 400 })
  }

  // Apply to user profile
  await supabase.from('profiles').update({
    access_status: 'active',
    access_source: 'promo',
    promo_code_used: code,
    is_active: true,
  }).eq('id', user.id)

  // Increment redemptions count
  await supabase.from('promo_codes').update({
    redemptions_count: promo.redemptions_count + 1,
  }).eq('id', promo.id)

  return NextResponse.json({ ok: true })
}
