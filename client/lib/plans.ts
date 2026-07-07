import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPriceId as getPriceIdEnv,
  detectPlan as detectPlanEnv,
  Currency,
  Plan as PlanKey,
  USD_READY,
  EUR_PRICES,
  USD_PRICES,
} from '@/lib/stripe-prices'

export type { Currency, PlanKey }

/**
 * Server-side plan helpers.
 *
 * Primary source of truth: the `plans` table in Supabase.
 * Fallback: environment-variable-based price IDs from lib/stripe-prices.ts
 *            (used when the table is empty or not yet initialised).
 */

type PlanRow = {
  id: number
  name: 'monthly' | 'yearly'
  display_name: string
  interval: 'month' | 'year'
  currency: 'eur' | 'usd'
  current_price: number
  original_price: number | null
  stripe_product_id: string | null
  stripe_price_id: string | null
  is_active: boolean
  is_visible: boolean
  trial_days: number
  badge_text: string | null
  description: string | null
  features: string[]
  created_at: string
  updated_at: string
}

export type PublicPlan = {
  id: number
  name: 'monthly' | 'yearly'
  display_name: string
  interval: 'month' | 'year'
  currency: 'eur' | 'usd'
  current_price: number
  original_price: number | null
  trial_days: number
  badge_text: string | null
  description: string | null
  features: string[]
  stripe_price_id: string | null
}

/** Hardcoded fallback with correct prices (29 / 199). Used when DB is empty. */
const FALLBACK_PLANS: PlanRow[] = [
  {
    id: 1,
    name: 'monthly',
    display_name: 'Mensual',
    interval: 'month',
    currency: 'eur',
    current_price: 29,
    original_price: 45,
    stripe_product_id: null,
    stripe_price_id: EUR_PRICES.monthly,
    is_active: true,
    is_visible: true,
    trial_days: 3,
    badge_text: null,
    description: 'Plan mensual con prueba gratuita de 3 días.',
    features: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 2,
    name: 'yearly',
    display_name: 'Anual',
    interval: 'year',
    currency: 'eur',
    current_price: 199,
    original_price: 540,
    stripe_product_id: null,
    stripe_price_id: EUR_PRICES.yearly,
    is_active: true,
    is_visible: true,
    trial_days: 3,
    badge_text: 'Mejor precio',
    description: 'Plan anual con ahorro aproximado del 63%.',
    features: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 3,
    name: 'monthly',
    display_name: 'Mensual',
    interval: 'month',
    currency: 'usd',
    current_price: 29,
    original_price: 45,
    stripe_product_id: null,
    stripe_price_id: USD_PRICES.monthly,
    is_active: USD_READY,
    is_visible: USD_READY,
    trial_days: 3,
    badge_text: null,
    description: 'Monthly plan with 3-day free trial.',
    features: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 4,
    name: 'yearly',
    display_name: 'Anual',
    interval: 'year',
    currency: 'usd',
    current_price: 199,
    original_price: 540,
    stripe_product_id: null,
    stripe_price_id: USD_PRICES.yearly,
    is_active: USD_READY,
    is_visible: USD_READY,
    trial_days: 3,
    badge_text: 'Mejor precio',
    description: 'Yearly plan with ~63% savings.',
    features: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
]

function toPublic(row: PlanRow): PublicPlan {
  return {
    id: row.id,
    name: row.name,
    display_name: row.display_name,
    interval: row.interval,
    currency: row.currency,
    current_price: Number(row.current_price),
    original_price: row.original_price !== null ? Number(row.original_price) : null,
    trial_days: row.trial_days,
    badge_text: row.badge_text,
    description: row.description,
    features: row.features ?? [],
    stripe_price_id: row.stripe_price_id,
  }
}

/** Returns visible + active plans for a currency (used by landing/pricing). */
export async function getActivePlans(currency: Currency): Promise<PublicPlan[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('plans')
      .select('*')
      .eq('currency', currency)
      .eq('is_active', true)
      .eq('is_visible', true)
      .order('name', { ascending: true })

    if (error || !data || data.length === 0) {
      return FALLBACK_PLANS.filter(p => p.currency === currency && p.is_visible).map(toPublic)
    }
    return (data as PlanRow[]).map(toPublic)
  } catch {
    return FALLBACK_PLANS.filter(p => p.currency === currency && p.is_visible).map(toPublic)
  }
}

/** Returns all plans for admin (including hidden + inactive). */
export async function getAllPlans(): Promise<PlanRow[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('plans')
      .select('*')
      .order('currency', { ascending: true })
      .order('name', { ascending: true })

    if (error || !data || data.length === 0) {
      return FALLBACK_PLANS
    }
    return data as PlanRow[]
  } catch {
    return FALLBACK_PLANS
  }
}

/** Returns the active Stripe Price ID + trial days for a plan + currency. */
export async function getPlanForCheckout(
  plan: PlanKey,
  currency: Currency
): Promise<{ stripe_price_id: string; trial_days: number } | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('plans')
      .select('stripe_price_id, trial_days, is_active')
      .eq('name', plan)
      .eq('currency', currency)
      .eq('is_active', true)
      .single()

    if (data?.stripe_price_id) {
      return {
        stripe_price_id: data.stripe_price_id,
        trial_days: (data as { trial_days: number }).trial_days ?? 3,
      }
    }
  } catch {}

  // Fallback to env-var resolution
  const envPriceId = getPriceIdEnv(plan, currency)
  return envPriceId ? { stripe_price_id: envPriceId, trial_days: 3 } : null
}

/** Detects the plan (monthly/yearly) from a Stripe Price ID. */
export async function getPlanKeyByPriceId(priceId: string): Promise<PlanKey | null> {
  try {
    const admin = createAdminClient()
    // Search across ALL plans (active and inactive) so legacy
    // subscriptions on archived prices still resolve.
    const { data } = await admin
      .from('plans')
      .select('name')
      .eq('stripe_price_id', priceId)
      .single()

    if (data?.name) return data.name as PlanKey
  } catch {}
  return detectPlanEnv(priceId)
}

/** Whether USD plans are available (DB-aware + env fallback). */
export async function isUsdReady(): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { count } = await admin
      .from('plans')
      .select('id', { count: 'exact', head: true })
      .eq('currency', 'usd')
      .eq('is_active', true)
      .eq('is_visible', true)
    if (count && count > 0) return true
  } catch {}
  return USD_READY
}

export { FALLBACK_PLANS }