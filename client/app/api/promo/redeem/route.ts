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

  // Determinar el tipo de código: 'skool' da acceso indefinido, 'promo' caduca
  const codeType = (promo as { code_type?: string }).code_type || 'promo'

  if (codeType === 'skool') {
    // Acceso School: indefinido, sin fecha de expiración, revocable manualmente desde admin
    await supabase.from('profiles').update({
      access_status: 'active',
      access_source: 'skool',
      promo_code_used: code,
      is_active: true,
      access_expires_at: null,
    }).eq('id', user.id)
  } else {
    // Promo: acceso con caducidad (now + access_days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + promo.access_days)

    await supabase.from('profiles').update({
      access_status: 'active',
      access_source: 'promo',
      promo_code_used: code,
      is_active: true,
      access_expires_at: expiresAt.toISOString(),
    }).eq('id', user.id)
  }

  // Increment redemptions count
  await supabase.from('promo_codes').update({
    redemptions_count: promo.redemptions_count + 1,
  }).eq('id', promo.id)

  try {
    await supabase.from('promo_redemptions').insert({ user_id: user.id, code })
  } catch (redErr) {
    console.error('promo_redemptions insert failed:', redErr)
  }

  try {
    await supabase.from('profiles').update({ signup_method: 'promo' }).eq('id', user.id)
  } catch (updErr) {
    console.error('signup_method update failed:', updErr)
  }

  try {
    await supabase.rpc('log_user_activity', {
      p_user_id: user.id,
      p_event: 'promo_redeemed',
      p_data: JSON.stringify({ code }),
      p_actor: null,
    })
  } catch (logErr) {
    console.error('log_user_activity failed:', logErr)
  }

  return NextResponse.json({ ok: true })
}
