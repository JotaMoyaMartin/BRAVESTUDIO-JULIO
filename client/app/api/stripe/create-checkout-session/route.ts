import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getPlanForCheckout, Currency, PlanKey } from '@/lib/plans'

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  let priceId: string | null = null
  let trialDays = 3

  // Legacy: direct priceId (still accepted for backwards compatibility)
  if (body.priceId) {
    priceId = body.priceId
  }
  // New: plan + currency → resolve from Supabase plans table
  else if (body.plan && body.currency) {
    const resolved = await getPlanForCheckout(body.plan as PlanKey, body.currency as Currency)
    if (resolved) {
      priceId = resolved.stripe_price_id
      trialDays = resolved.trial_days
    }
  }

  if (!priceId) {
    return NextResponse.json({ error: 'Missing priceId or plan+currency' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    ...(profile?.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: profile?.email || user.email }),
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: trialDays },
    phone_number_collection: { enabled: false },
    success_url: `${appUrl}/onboarding?checkout=success`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}