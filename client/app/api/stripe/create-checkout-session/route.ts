import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getPriceId, Currency, Plan } from '@/lib/stripe-prices'

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

  // Legacy: direct priceId
  if (body.priceId) {
    priceId = body.priceId
  }
  // New: plan + currency
  else if (body.plan && body.currency) {
    priceId = getPriceId(body.plan as Plan, body.currency as Currency)
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
    subscription_data: { trial_period_days: 3 },
    success_url: `${appUrl}/onboarding?checkout=success`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}