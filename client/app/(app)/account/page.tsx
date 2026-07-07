import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { Profile } from '@/types/database'
import AccountClient from './AccountClient'
import PageTransition from '@/components/ui/PageTransition'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const typedProfile = (profile as Profile | null) || null

  // Fetch subscription from Stripe to get renewal date
  let subscription: {
    status: string
    current_period_end: number | null
    plan_amount: number | null
    plan_interval: 'month' | 'year' | null
    canceled_at: number | null
  } | null = null

  if (typedProfile?.stripe_subscription_id && stripe) {
    try {
      const sub = await stripe.subscriptions.retrieve(typedProfile.stripe_subscription_id, {
        expand: ['items.data.price'],
      })
      const price = sub.items.data[0]?.price
      subscription = {
        status: sub.status,
        current_period_end: (sub as unknown as { current_period_end: number }).current_period_end,
        plan_amount: price?.unit_amount ?? null,
        plan_interval: (price?.recurring?.interval as 'month' | 'year') ?? null,
        canceled_at: (sub as unknown as { canceled_at: number | null }).canceled_at,
      }
    } catch {
      // subscription no longer exists in Stripe
      subscription = null
    }
  }

  return <PageTransition><AccountClient profile={typedProfile} subscription={subscription} /></PageTransition>
}