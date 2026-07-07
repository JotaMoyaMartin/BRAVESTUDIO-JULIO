import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIGURED } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EUR_PRICES, USD_PRICES, USD_READY } from '@/lib/stripe-prices'

// ── Auth helper ──────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false, res: NextResponse.json({ error: 'Sin permisos' }, { status: 403 }) }
  }
  return { ok: true as const, user }
}

// ── GET: all plans + recent history ──────────────────────────────
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const admin = createAdminClient()
  const { data: plans } = await admin
    .from('plans')
    .select('*')
    .order('currency', { ascending: true })
    .order('name', { ascending: true })

  const { data: history } = await admin
    .from('plan_price_history')
    .select('id, plan_id, old_price, new_price, old_stripe_price_id, new_stripe_price_id, changed_by, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ plans: plans ?? [], history: history ?? [] })
}

// ── POST: initialise plans from env vars (one-time) ──────────────
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  if (!STRIPE_CONFIGURED) {
    return NextResponse.json({ error: 'Stripe no configurado (falta STRIPE_SECRET_KEY)' }, { status: 503 })
  }

  const admin = createAdminClient()

  // Check if already initialised
  const { count } = await admin.from('plans').select('id', { count: 'exact', head: true })
  if (count && count > 0) {
    return NextResponse.json({ error: 'Los planes ya están inicializados' }, { status: 409 })
  }

  const seeds: Array<{
    name: 'monthly' | 'yearly'
    display_name: string
    interval: 'month' | 'year'
    currency: 'eur' | 'usd'
    current_price: number
    original_price: number
    stripe_price_id: string
    badge_text: string | null
    description: string
  }> = []

  if (EUR_PRICES.monthly) {
    seeds.push({
      name: 'monthly', display_name: 'Mensual', interval: 'month', currency: 'eur',
      current_price: 29, original_price: 45, stripe_price_id: EUR_PRICES.monthly,
      badge_text: null, description: 'Plan mensual con prueba gratuita de 3 días.',
    })
  }
  if (EUR_PRICES.yearly) {
    seeds.push({
      name: 'yearly', display_name: 'Anual', interval: 'year', currency: 'eur',
      current_price: 199, original_price: 540, stripe_price_id: EUR_PRICES.yearly,
      badge_text: 'Mejor precio', description: 'Plan anual con ahorro aproximado del 63%.',
    })
  }
  if (USD_READY && USD_PRICES.monthly) {
    seeds.push({
      name: 'monthly', display_name: 'Mensual', interval: 'month', currency: 'usd',
      current_price: 29, original_price: 45, stripe_price_id: USD_PRICES.monthly,
      badge_text: null, description: 'Monthly plan with 3-day free trial.',
    })
  }
  if (USD_READY && USD_PRICES.yearly) {
    seeds.push({
      name: 'yearly', display_name: 'Anual', interval: 'year', currency: 'usd',
      current_price: 199, original_price: 540, stripe_price_id: USD_PRICES.yearly,
      badge_text: 'Mejor precio', description: 'Yearly plan with ~63% savings.',
    })
  }

  if (seeds.length === 0) {
    return NextResponse.json({ error: 'No hay Price IDs en variables de entorno para inicializar' }, { status: 400 })
  }

  // Enrich with product_id from Stripe
  const enriched: Array<typeof seeds[number] & { stripe_product_id: string | null }> = []
  for (const seed of seeds) {
    let productId: string | null = null
    try {
      if (stripe) {
        const price = await stripe.prices.retrieve(seed.stripe_price_id)
        productId = (price.product as string) || null
      }
    } catch {}
    enriched.push({ ...seed, stripe_product_id: productId })
  }

  const { error } = await admin.from('plans').insert(
    enriched.map(s => ({
      name: s.name,
      display_name: s.display_name,
      interval: s.interval,
      currency: s.currency,
      current_price: s.current_price,
      original_price: s.original_price,
      stripe_product_id: s.stripe_product_id,
      stripe_price_id: s.stripe_price_id,
      is_active: true,
      is_visible: true,
      trial_days: 3,
      badge_text: s.badge_text,
      description: s.description,
      features: [],
    }))
  )

  if (error) {
    return NextResponse.json({ error: `Error al guardar: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: enriched.length })
}

// ── PATCH: update a plan ─────────────────────────────────────────
interface PatchBody {
  id: number
  display_name?: string
  current_price?: number
  original_price?: number | null
  trial_days?: number
  badge_text?: string | null
  description?: string | null
  is_visible?: boolean
  is_active?: boolean
  features?: string[]
  /** Set to true when the admin confirmed the Stripe Price creation prompt. */
  confirm_price_change?: boolean
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const body = (await req.json()) as PatchBody
  if (!body.id) {
    return NextResponse.json({ error: 'Falta id del plan' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch current plan
  const { data: current, error: fetchErr } = await admin
    .from('plans')
    .select('*')
    .eq('id', body.id)
    .single()
  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
  }

  const priceChanged =
    body.current_price !== undefined &&
    Number(body.current_price) !== Number(current.current_price)

  // ── If price changed → require confirmation + create new Stripe Price ──
  let newStripePriceId: string | null = current.stripe_price_id
  let archivedOld = false

  if (priceChanged) {
    if (!body.confirm_price_change) {
      return NextResponse.json(
        {
          error: 'price_change_requires_confirmation',
          message:
            'Cambiar el precio creará un nuevo Price ID en Stripe. Los nuevos clientes usarán este precio. Los clientes actuales mantendrán su precio anterior.',
        },
        { status: 409 }
      )
    }

    if (!STRIPE_CONFIGURED || !stripe) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
    }

    const newAmount = Math.round(Number(body.current_price) * 100)
    const interval = current.interval as 'month' | 'year'
    const currency = current.currency as 'eur' | 'usd'

    // Determine the Stripe product: prefer stored product_id, otherwise
    // retrieve it from the existing price.
    let productId = current.stripe_product_id
    if (!productId && current.stripe_price_id) {
      try {
        const oldPrice = await stripe.prices.retrieve(current.stripe_price_id)
        productId = (oldPrice.product as string) || null
      } catch {}
    }
    if (!productId) {
      return NextResponse.json(
        { error: 'No se pudo determinar el Stripe product para crear el nuevo Price' },
        { status: 400 }
      )
    }

    try {
      const created = await stripe.prices.create({
        product: productId,
        currency,
        unit_amount: newAmount,
        recurring: { interval },
      })
      newStripePriceId = created.id

      // Archive the old price so it can't be used for new subscriptions.
      if (current.stripe_price_id && current.stripe_price_id !== created.id) {
        try {
          await stripe.prices.update(current.stripe_price_id, { active: false })
          archivedOld = true
        } catch {}
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      return NextResponse.json({ error: `Error al crear Price en Stripe: ${msg}` }, { status: 502 })
    }
  }

  // ── Update the plan row ──
  const update: Record<string, unknown> = {}
  if (body.display_name !== undefined) update.display_name = body.display_name
  if (body.original_price !== undefined) update.original_price = body.original_price
  if (body.trial_days !== undefined) update.trial_days = body.trial_days
  if (body.badge_text !== undefined) update.badge_text = body.badge_text
  if (body.description !== undefined) update.description = body.description
  if (body.is_visible !== undefined) update.is_visible = body.is_visible
  if (body.is_active !== undefined) update.is_active = body.is_active
  if (body.features !== undefined) update.features = body.features

  if (priceChanged) {
    update.current_price = Number(body.current_price)
    update.stripe_price_id = newStripePriceId
    // Also update product_id if we recovered it during price creation
    if (!current.stripe_product_id) {
      try {
        if (stripe && newStripePriceId) {
          const p = await stripe.prices.retrieve(newStripePriceId)
          update.stripe_product_id = (p.product as string) || null
        }
      } catch {}
    }
  }

  const { error: updateErr } = await admin.from('plans').update(update).eq('id', body.id)
  if (updateErr) {
    return NextResponse.json({ error: `Error al actualizar: ${updateErr.message}` }, { status: 500 })
  }

  // ── Log to history if price changed ──
  if (priceChanged) {
    await admin.from('plan_price_history').insert({
      plan_id: body.id,
      old_price: Number(current.current_price),
      new_price: Number(body.current_price),
      old_stripe_price_id: current.stripe_price_id,
      new_stripe_price_id: newStripePriceId,
      changed_by: auth.user!.id,
    })
  }

  return NextResponse.json({
    ok: true,
    price_changed: priceChanged,
    new_stripe_price_id: priceChanged ? newStripePriceId : null,
    archived_old: archivedOld,
  })
}