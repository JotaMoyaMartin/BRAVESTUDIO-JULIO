import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectPlan } from '@/lib/stripe-prices'

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

        let subscriptionPlan: 'monthly' | 'yearly' | null = null

        if (session.subscription && typeof session.subscription === 'string') {
          const sub = await stripeClient.subscriptions.retrieve(session.subscription, {
            expand: ['items.data.price'],
          })
          const priceId = sub.items.data[0]?.price?.id
          if (priceId) {
            subscriptionPlan = detectPlan(priceId)
          }
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
        const stripeStatus = sub.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
        // Stripe cancela "at period end" por defecto en el portal: la
        // suscripción sigue activa/trialing hasta que termine el periodo,
        // pero cancel_at_period_end = true indica que se cancelará.
        // Lo detectamos para marcar subscription_status='canceled' en nuestra
        // DB (visible en admin) sin revocar acceso todavía.
        const cancelAtPeriodEnd =
          (sub as { cancel_at_period_end?: boolean }).cancel_at_period_end === true
        const isActiveAccess = stripeStatus === 'active' || stripeStatus === 'trialing'

        // Estado que guardamos: si cancel_at_period_end=true → 'canceled'
        // (aunque Stripe siga reportando active/trialing). Si no, el real.
        const effectiveStatus = cancelAtPeriodEnd && isActiveAccess
          ? 'canceled'
          : stripeStatus

        // El acceso se mantiene mientras el periodo esté activo (trialing/active),
        // incluso si está programado para cancelarse al final.
        let finalAccessStatus: 'active' | 'inactive' = isActiveAccess ? 'active' : 'inactive'
        let finalIsActive = isActiveAccess

        if (!isActiveAccess) {
          const { data: current } = await supabase
            .from('profiles')
            .select('access_source, access_expires_at')
            .eq('stripe_subscription_id', sub.id)
            .single()

          if (current) {
            const source = current.access_source
            const promoNotExpired =
              source === 'promo' &&
              (!current.access_expires_at ||
                new Date(current.access_expires_at as string).getTime() > Date.now())
            const hasOtherAccess = source === 'manual' || source === 'skool' || promoNotExpired
            if (hasOtherAccess) {
              finalAccessStatus = 'active'
              finalIsActive = true
            }
          }
        }

        await supabase.from('profiles').update({
          subscription_status: effectiveStatus,
          access_status: finalAccessStatus,
          is_active: finalIsActive,
        }).eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription

        // Igual que en updated: respetamos accesos no-Stripe activos.
        let finalAccessStatus: 'active' | 'inactive' = 'inactive'
        let finalIsActive = false

        const { data: current } = await supabase
          .from('profiles')
          .select('access_source, access_expires_at')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (current) {
          const source = current.access_source
          const promoNotExpired =
            source === 'promo' &&
            (!current.access_expires_at ||
              new Date(current.access_expires_at as string).getTime() > Date.now())
          const hasOtherAccess = source === 'manual' || source === 'skool' || promoNotExpired
          if (hasOtherAccess) {
            finalAccessStatus = 'active'
            finalIsActive = true
          }
        }

        await supabase.from('profiles').update({
          subscription_status: 'canceled',
          access_status: finalAccessStatus,
          is_active: finalIsActive,
        }).eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        // Marcamos la suscripción como past_due. NO revocamos acceso todavía:
        // Stripe hace varios reintentos automáticos antes de cancelar, y
        // el usuario debe mantener acceso durante los reintentos.
        // Cuando Stripe se rinde, dispara subscription.updated/deleted.
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as { subscription?: string | null }).subscription as string | null
        if (subscriptionId) {
          await supabase.from('profiles').update({
            subscription_status: 'past_due',
          }).eq('stripe_subscription_id', subscriptionId)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook DB error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}