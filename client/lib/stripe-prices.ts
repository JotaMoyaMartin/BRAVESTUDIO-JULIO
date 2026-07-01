/**
 * Stripe price-id resolution by currency.
 *
 * Env vars:
 *   NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID      — EUR monthly (legacy, still read)
 *   NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID       — EUR yearly  (legacy, still read)
 *   NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID_EUR   — EUR monthly (preferred when set)
 *   NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID_EUR    — EUR yearly  (preferred when set)
 *   NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID_USD   — USD monthly
 *   NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID_USD    — USD yearly
 *
 * USD stays disabled until both USD price IDs are set on Vercel.
 * The legacy unsuffixed vars are kept as fallback for EUR so existing
 * deployments keep working without an env rename.
 */

export type Currency = 'eur' | 'usd'
export type Plan = 'monthly' | 'yearly'

interface PriceConfig {
  monthly: string | null
  yearly: string | null
}

const eurMonthly =
  process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID_EUR ||
  process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ||
  null
const eurYearly =
  process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID_EUR ||
  process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ||
  null
const usdMonthly = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID_USD || null
const usdYearly = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID_USD || null

export const EUR_PRICES: PriceConfig = { monthly: eurMonthly, yearly: eurYearly }
export const USD_PRICES: PriceConfig = { monthly: usdMonthly, yearly: usdYearly }

/** True when both USD price IDs are configured. */
export const USD_READY = !!(usdMonthly && usdYearly)

/** True when at least EUR is configured (so checkout can work). */
export const STRIPE_READY = !!(eurMonthly && eurYearly)

/**
 * Returns the price ID for a plan+currency, or null if not configured.
 * When USD is requested but not ready, falls back to EUR (caller should
 * check USD_READY before offering USD and avoid this fallback in the UI).
 */
export function getPriceId(plan: Plan, currency: Currency): string | null {
  if (currency === 'usd') {
    if (USD_READY) return plan === 'monthly' ? usdMonthly : usdYearly
    // Fall back to EUR for backend safety; UI should prevent reaching here.
    return plan === 'monthly' ? eurMonthly : eurYearly
  }
  return plan === 'monthly' ? eurMonthly : eurYearly
}

/** All four price IDs — used by the webhook to detect the plan from a sub. */
export const ALL_PRICE_IDS = [
  eurMonthly,
  eurYearly,
  usdMonthly,
  usdYearly,
].filter(Boolean) as string[]

/** Detects the plan (monthly/yearly) from a Stripe price ID. */
export function detectPlan(priceId: string): Plan | null {
  if (priceId === eurMonthly || priceId === usdMonthly) return 'monthly'
  if (priceId === eurYearly || priceId === usdYearly) return 'yearly'
  return null
}