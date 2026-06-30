import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!myProfile || (myProfile.role !== 'admin' && myProfile.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const { userId } = await request.json()

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const subId = targetProfile.stripe_subscription_id
  if (!subId) {
    return NextResponse.json({ error: 'El usuario no tiene suscripción de Stripe' }, { status: 400 })
  }

  try {
    // Cancelar al final del periodo de facturación (acceso mantenido hasta entonces)
    await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}