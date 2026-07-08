import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { getPriceId, Currency, Plan } from '@/lib/stripe-prices'
import { sendEmail } from '@/lib/email/send'
import { welcomeEmail } from '@/lib/email/templates'

/**
 * Auth callback — handles email confirmation redirects and password reset
 * code exchange. After exchanging the code for a session:
 *  1. Updates profile full_name from user_metadata
 *  2. If plan+currency in metadata → creates Stripe checkout and redirects
 *  3. If promo_code in metadata → redeems it (skool flow)
 *  4. If `next` param present → redirects there (password reset → /update-password)
 *  5. Otherwise → redirects to /onboarding
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const metadata = user.user_metadata || {}
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin

  // 1. Update profile with full_name
  const fullName = metadata.full_name
  if (fullName) {
    await supabase.from('profiles').update({ full_name: fullName as string }).eq('id', user.id)
  }

  // Send welcome email (fire-and-forget) — only if user has email
  if (user.email) {
    try {
      await sendEmail(user.email, '¡Bienvenida a BRÄVE Studio!', welcomeEmail(fullName as string || ''))
    } catch (e) {
      console.error('[auth/callback] welcome email failed:', e)
    }
  }

  // 2. If plan+currency → create Stripe checkout
  const plan = metadata.plan as Plan | undefined
  const currency = metadata.currency as Currency | undefined
  if (plan && currency && stripe) {
    const priceId = getPriceId(plan, currency)
    if (priceId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, email, trial_started_at')
        .eq('id', user.id)
        .single()

      // Un usuario nuevo que acaba de registrarse no debería tener trial_started_at,
      // pero comprobamos por si reentrara al callback con sesión existente
      const hasUsedTrial = !!(profile as { trial_started_at?: string | null })?.trial_started_at

      try {
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          ...(profile?.stripe_customer_id
            ? { customer: profile.stripe_customer_id }
            : { customer_email: profile?.email || user.email }),
          line_items: [{ price: priceId, quantity: 1 }],
          subscription_data: hasUsedTrial ? {} : { trial_period_days: 3 },
          phone_number_collection: { enabled: false },
          success_url: `${appUrl}/onboarding?checkout=success`,
          cancel_url: `${appUrl}/pricing`,
          metadata: { user_id: user.id },
        })
        if (session.url) {
          return NextResponse.redirect(session.url)
        }
      } catch {
        // Stripe error → fall through to onboarding
      }
    }
  }

  // 3. If promo_code → redeem it (skool flow)
  const promoCode = metadata.promo_code
  if (promoCode) {
    const admin = createAdminClient()
    const { data: promo } = await admin
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode)
      .eq('is_active', true)
      .single()

    if (promo) {
      const now = new Date().toISOString()
      const expired = promo.expires_at && promo.expires_at < now
      const exhausted = promo.max_redemptions !== null && promo.redemptions_count >= promo.max_redemptions

      if (!expired && !exhausted) {
        const codeType = (promo as { code_type?: string }).code_type || 'promo'
        if (codeType === 'skool') {
          await admin.from('profiles').update({
            access_status: 'active',
            access_source: 'skool',
            promo_code_used: promoCode,
            is_active: true,
            access_expires_at: null,
          }).eq('id', user.id)
        } else {
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + promo.access_days)
          await admin.from('profiles').update({
            access_status: 'active',
            access_source: 'promo',
            promo_code_used: promoCode,
            is_active: true,
            access_expires_at: expiresAt.toISOString(),
          }).eq('id', user.id)
        }
        await admin.from('promo_codes').update({
          redemptions_count: promo.redemptions_count + 1,
        }).eq('id', promo.id)
      }
    }
  }

  // 4. If next param → redirect there (password reset)
  if (next) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // 5. Default → onboarding
  return NextResponse.redirect(`${origin}/onboarding`)
}