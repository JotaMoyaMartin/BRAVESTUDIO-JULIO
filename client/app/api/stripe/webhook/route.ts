import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripeClient = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any }) : null

export async function POST(req: NextRequest) {
  if (!stripeClient || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) break

        // Determinar el plan (monthly/yearly) comparando el price ID
        const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
        const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
        let subscriptionPlan: 'monthly' | 'yearly' | null = null

        if (session.subscription && typeof session.subscription === 'string') {
          const sub = await stripeClient.subscriptions.retrieve(session.subscription, {
            expand: ['items.data.price'],
          })
          const priceId = sub.items.data[0]?.price?.id
          if (priceId === monthlyPriceId) subscriptionPlan = 'monthly'
          else if (priceId === yearlyPriceId) subscriptionPlan = 'yearly'
        }

        // El estado puede ser 'trialing' si hay trial activo
        const subStatus = session.subscription
          ? (await stripeClient.subscriptions.retrieve(session.subscription as string)).status
          : 'active'

        await supabase.from('profiles').update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          access_status: 'active',
          access_source: 'stripe',
          subscription_status: subStatus as 'active' | 'trialing',
          subscription_plan: subscriptionPlan,
          is_active: true,
        }).eq('id', userId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const status = sub.status as 'active' | 'trialing' | 'past_due' | 'canceled'
        const isActive = status === 'active' || status === 'trialing'

        await supabase.from('profiles').update({
          subscription_status: status,
          access_status: isActive ? 'active' : 'inactive',
          is_active: isActive,
        }).eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription

        await supabase.from('profiles').update({
          subscription_status: 'canceled',
          access_status: 'inactive',
          is_active: false,
        }).eq('stripe_subscription_id', sub.id)
        break
      }
    }
  } catch (err) {
    console.error('Webhook DB error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
