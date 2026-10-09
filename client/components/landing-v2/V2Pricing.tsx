'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Currency, PlanKey } from '@/lib/plans'
import Reveal from './Reveal'
import { PRICING, CTA_PRIMARY, CTA_SIGNUP_HREF } from './content'
import { fbqTrack } from './pixel'

type PlanB = 'monthly' | 'yearly'

/**
 * Monedas: EUR y USD fijos en content.ts por decisión de producto.
 * PENDIENTE de backend: el checkout en USD requiere crear los 2 Price IDs
 * USD en Stripe; mientras no existan, el servidor cae al precio EUR.
 */
function fmt(amount: number, currency: Currency) {
  return `${amount} ${currency === 'eur' ? '€' : '$'}`
}

/**
 * Pricing V2 — UN precio mensual y UN anual (19 € / 190 €). Nada más.
 * NOTA backend: el checkout de Stripe usa los Price IDs reales de la tabla
 * `plans` / Stripe — mantener alineados (19/190, trial 7 días) para que lo
 * que se cobre coincida con lo que se muestra.
 */
export default function V2Pricing() {
  const router = useRouter()
  const [selected, setSelected] = useState<PlanB>('yearly')
  const [currency, setCurrency] = useState<Currency>('eur')
  const [hasSession, setHasSession] = useState(false)
  const [loading, setLoading] = useState<null | PlanB>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })
  }, [])

  async function goCheckout(plan: PlanB) {
    setSelected(plan)
    setError('')
    // Conversión Meta Ads: la usuaria entra al checkout (o al signup con plan).
    fbqTrack('InitiateCheckout', { plan, currency })
    if (hasSession) {
      setLoading(plan)
      try {
        const res = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, currency }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
        setError(data.error || 'No se pudo iniciar la prueba. Inténtalo de nuevo.')
      } catch {
        setError('Error al conectar con el pago. Inténtalo de nuevo.')
      }
      setLoading(null)
      return
    }
    router.push(`${CTA_SIGNUP_HREF}?plan=${plan}&currency=${currency}`)
  }

  // Precios por moneda: fijos en content.ts (decisión de producto)
  const monthlyPrice = currency === 'eur' ? PRICING.monthly.price : PRICING.usd.monthly
  const yearlyPrice = currency === 'eur' ? PRICING.yearly.price : PRICING.usd.yearly
  const yearlyEquivalent = currency === 'eur' ? PRICING.yearly.equivalent : 'Equivale a 15,83 $/mes'
  const yearlySavings = currency === 'eur' ? PRICING.yearly.savings : 'Ahorras 38 $ al año'

  const highlight = {
    monthly: selected === 'monthly',
    yearly: selected === 'yearly',
  }

  return (
    <section id="precios" className="py-14 sm:py-24" style={{ background: 'var(--v2-ivory)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <p className="v2-eyebrow" style={{ color: 'var(--color-cherry)' }}>{PRICING.eyebrow}</p>
          <h2 className="v2-h2 text-[26px] sm:text-4xl mt-3" style={{ color: 'var(--v2-ink)' }}>
            {PRICING.title}
          </h2>
          <p className="mt-3 text-[15px]" style={{ color: 'rgba(42,11,18,0.7)' }}>
            {PRICING.sub}
          </p>
        </Reveal>

        {/* Recorrido del alta: qué pasará y cuándo empieza a costar */}
        <Reveal delay={0.03}>
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 mb-6 rounded-2xl p-3"
            style={{ background: 'var(--v2-sand)', border: '1px solid var(--v2-border-light)' }}
          >
            {PRICING.steps.map((step, i) => (
              <div key={step} className="flex items-center gap-2.5">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold shrink-0"
                  style={{ background: 'var(--color-cherry)', color: '#fff' }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="text-[12px] sm:text-[13px] leading-snug font-medium" style={{ color: 'rgba(42,11,18,0.85)' }}>
                  {step}
                </span>
                {i < PRICING.steps.length - 1 && (
                  <span aria-hidden="true" className="hidden sm:block text-lg" style={{ color: 'rgba(122,24,50,0.35)' }}>→</span>
                )}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Toggles: periodo + moneda, en una fila en desktop */}
        <Reveal delay={0.05}>
          <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
            <div
              className="inline-flex p-1 rounded-full"
              style={{ background: 'var(--v2-sand)', border: '1px solid var(--v2-border-light)' }}
              role="group"
              aria-label="Elige tu periodo de pago"
            >
              {(['monthly', 'yearly'] as PlanB[]).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelected(plan)}
                  aria-pressed={selected === plan}
                  className="px-4 sm:px-7 py-2.5 rounded-full text-[13px] font-bold transition-all"
                  style={
                    selected === plan
                      ? { background: 'var(--color-cherry)', color: 'white', boxShadow: '0 6px 18px rgba(122,24,50,0.3)' }
                      : { background: 'transparent', color: 'var(--color-cherry-dark)' }
                  }
                >
                  {plan === 'monthly' ? 'Mensual' : 'Anual'}
                  {plan === 'yearly' && currency === 'eur' && <span className="hidden sm:inline"> · ahorra 38 €</span>}
                </button>
              ))}
            </div>

            {/* Moneda — USD solo cuando los Price IDs USD están configurados */}
            <div
              className="inline-flex p-1 rounded-full"
              style={{ background: 'var(--v2-sand)', border: '1px solid var(--v2-border-light)' }}
              role="group"
              aria-label="Elige tu moneda"
            >
              <button
                type="button"
                onClick={() => setCurrency('eur')}
                aria-pressed={currency === 'eur'}
                className="px-5 py-2 rounded-full text-[13px] font-bold transition-all"
                style={
                  currency === 'eur'
                    ? { background: 'var(--color-cherry)', color: 'white', boxShadow: '0 6px 18px rgba(122,24,50,0.3)' }
                    : { background: 'transparent', color: 'var(--color-cherry-dark)' }
                }
              >
                EUR €
              </button>
              <button
                type="button"
                onClick={() => setCurrency('usd')}
                aria-pressed={currency === 'usd'}
                className="px-5 py-2 rounded-full text-[13px] font-bold transition-all"
                style={
                  currency === 'usd'
                    ? { background: 'var(--color-cherry)', color: 'white', boxShadow: '0 6px 18px rgba(122,24,50,0.3)' }
                    : { background: 'transparent', color: 'var(--color-cherry-dark)' }
                }
              >
                USD $
              </button>
            </div>
          </div>
        </Reveal>

        {/* Cards ANUAL primero en móvil (mejor opción), lado a lado en desktop */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto items-stretch">
          {/* ── ANUAL (destacada) ── */}
          <Reveal className="order-1 sm:order-2">
            <article
              className="h-full rounded-3xl p-5 sm:p-8 relative overflow-hidden flex flex-col gap-4 sm:gap-5 transition-transform"
              style={{
                background: 'var(--color-cherry)',
                border: highlight.yearly ? '2px solid var(--color-buttermilk)' : '1.5px solid var(--color-cherry-dark)',
                boxShadow: highlight.yearly ? '0 24px 60px rgba(122,24,50,0.4)' : '0 12px 34px rgba(122,24,50,0.25)',
              }}
            >
              <div aria-hidden="true" className="absolute -top-16 -right-16 w-52 h-52 rounded-full blur-3xl opacity-25" style={{ background: 'rgba(255,241,181,0.5)' }} />
              <span
                className="absolute top-6 right-6 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
              >
                <Sparkles size={11} aria-hidden="true" />
                {PRICING.badge}
              </span>

              <p className="v2-eyebrow" style={{ color: 'rgba(255,241,181,0.9)' }}>{PRICING.yearly.name}</p>
              <div>
                <p className="text-[34px] sm:text-[42px] font-extrabold tracking-tight leading-none" style={{ color: '#fff' }}>
                  {fmt(yearlyPrice, currency)}
                  <span className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>{PRICING.yearly.suffix}</span>
                </p>
                {yearlyEquivalent && (
                  <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{yearlyEquivalent}</p>
                )}
                {yearlySavings && (
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-buttermilk)' }}>{yearlySavings}</p>
                )}
              </div>

              <ul className="space-y-2 mt-1">
                {PRICING.included.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                    <span
                      className="mt-0.5 inline-flex items-center justify-center w-4.5 h-4.5 rounded-full shrink-0"
                      style={{ width: 18, height: 18, background: 'rgba(255,241,181,0.25)' }}
                      aria-hidden="true"
                    >
                      <Check size={10} strokeWidth={3.2} style={{ color: 'var(--color-buttermilk)' }} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => goCheckout('yearly')}
                disabled={loading !== null}
                className="v2-cta v2-cta-light v2-btn v2-btn-light mt-auto w-full"
                style={{ opacity: loading === 'yearly' ? 0.7 : 1, cursor: loading !== null ? 'wait' : 'pointer' }}
              >
                {loading === 'yearly' ? 'Redirigiendo…' : CTA_PRIMARY}
              </button>
              <p className="text-[11px] text-center leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {PRICING.checkoutNote}
              </p>
            </article>
          </Reveal>

          {/* ── MENSUAL ── */}
          <Reveal delay={0.08} className="order-2 sm:order-1">
            <article
              className="h-full rounded-3xl p-5 sm:p-8 flex flex-col gap-4 sm:gap-5 transition-transform"
              style={{
                background: 'var(--v2-paper)',
                border: highlight.monthly ? '2px solid var(--color-cherry)' : '1px solid var(--v2-border-light)',
                boxShadow: highlight.monthly ? '0 18px 44px rgba(122,24,50,0.16)' : '0 8px 26px rgba(74,15,30,0.06)',
              }}
            >
              <p className="v2-eyebrow" style={{ color: 'rgba(74,15,30,0.6)' }}>{PRICING.monthly.name}</p>
              <div>
                <p className="text-[34px] sm:text-[42px] font-extrabold tracking-tight leading-none" style={{ color: 'var(--v2-ink)' }}>
                  {fmt(monthlyPrice, currency)}
                  <span className="text-base font-semibold" style={{ color: 'rgba(42,11,18,0.5)' }}>{PRICING.monthly.suffix}</span>
                </p>
              </div>

              <ul className="space-y-2 mt-1">
                {PRICING.included.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug" style={{ color: 'var(--v2-ink)' }}>
                    <span
                      className="mt-0.5 inline-flex items-center justify-center rounded-full shrink-0"
                      style={{ width: 18, height: 18, background: 'var(--v2-blush)' }}
                      aria-hidden="true"
                    >
                      <Check size={10} strokeWidth={3.2} style={{ color: 'var(--color-cherry)' }} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => goCheckout('monthly')}
                disabled={loading !== null}
                className="v2-cta v2-btn v2-btn-dark mt-auto w-full"
                style={{ opacity: loading === 'monthly' ? 0.7 : 1, cursor: loading !== null ? 'wait' : 'pointer' }}
              >
                {loading === 'monthly' ? 'Redirigiendo…' : CTA_PRIMARY}
              </button>
              <p className="text-[11px] text-center leading-snug" style={{ color: 'rgba(42,11,18,0.55)' }}>
                {PRICING.checkoutNote}
              </p>
            </article>
          </Reveal>
        </div>

        {error && (
          <div className="mt-6 max-w-md mx-auto p-3 rounded-xl text-sm text-center" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }} role="alert">
            {error}
          </div>
        )}

        {/* Badges de confianza (reales: no permanencia / cancelable / trial) */}
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {PRICING.badges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)', color: 'var(--color-cherry-dark)' }}
            >
              <Check size={13} strokeWidth={3} style={{ color: 'var(--color-success)' }} aria-hidden="true" />
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}