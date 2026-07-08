import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const subId = profile?.stripe_subscription_id
  if (!subId) {
    return NextResponse.json({ error: 'No tienes suscripción de Stripe activa' }, { status: 400 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  try {
    const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
    const cancelsAt = (sub as unknown as { current_period_end: number }).current_period_end

    // Log actividad (fire-and-forget)
    try {
      const admin = createAdminClient()
      await admin.rpc('log_user_activity', {
        p_user_id: user.id,
        p_event: 'stripe_subscription_canceled',
        p_data: { source: 'self_serve', sub_id: subId },
        p_actor: user.id,
      })
    } catch (logErr) {
      console.error('log_user_activity failed:', logErr)
    }

    return NextResponse.json({
      ok: true,
      cancels_at: cancelsAt,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}