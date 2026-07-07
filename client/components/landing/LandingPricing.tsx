'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { isUsdReady, Currency, PlanKey, PublicPlan } from '@/lib/plans'

function fmt(amount: number, currency: Currency): string {
  const symbol = currency === 'eur' ? '€' : '$'
  return `${amount} ${symbol}`
}

const TRUST_BADGES = [
  'Sin permanencia',
  'Cancela cuando quieras',
  'Acceso inmediato',
  '3 días gratis',
]

export default function LandingPricing() {
  const router = useRouter()
  const [currency, setCurrency] = useState<Currency>('eur')
  const [usdReady, setUsdReady] = useState(false)
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [hasSession, setHasSession] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<null | 'monthly' | 'yearly'>(null)
  const [checkoutError, setCheckoutError] = useState('')

  useEffect(() => {
    isUsdReady().then(setUsdReady)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })
  }, [])

  useEffect(() => {
    fetch(`/api/plans?currency=${currency}`)
      .then(r => r.json())
      .then(data => {
        if (data.plans) setPlans(data.plans as PublicPlan[])
      })
      .catch(() => {})
  }, [currency])

  async function handlePlanClick(plan: PlanKey) {
    setCheckoutError('')
    if (hasSession) {
      setCheckoutLoading(plan)
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
        setCheckoutError(data.error || 'No se pudo iniciar el pago. Inténtalo de nuevo.')
      } catch {
        setCheckoutError('Error al conectar con Stripe. Inténtalo de nuevo.')
      }
      setCheckoutLoading(null)
      return
    }
    router.push(`/signup?plan=${plan}&currency=${currency}`)
  }

  const symbol = currency === 'eur' ? '€' : '$'
  const monthly = plans.find(p => p.name === 'monthly')
  const yearly = plans.find(p => p.name === 'yearly')
  const monthlyEquivalent = yearly ? (yearly.current_price / 12).toFixed(2).replace('.', ',') : null
  const yearlySavings = yearly && yearly.original_price ? yearly.original_price - yearly.current_price : null

  return (
    <section id="planes" className="bg-cream py-16 lg:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark mb-3" style={{ letterSpacing: '-0.5px' }}>
            Planes simples. Empieza gratis.
          </h2>
          <p className="text-sm sm:text-base text-cherry-dark opacity-70">
            Prueba 3 días sin coste. Sin permanencia. Cancela cuando quieras.
          </p>
        </motion.div>

        {/* Currency selector */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setCurrency('eur')}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: currency === 'eur' ? 'var(--color-cherry)' : 'white',
              color: currency === 'eur' ? 'white' : 'var(--color-cherry-dark)',
              border: '1.5px solid rgba(122,24,50,0.2)',
              cursor: 'pointer',
            }}
          >
            🇪🇸 EUR €
          </button>
          <button
            disabled={!usdReady}
            title={usdReady ? 'USD' : 'Próximamente'}
            onClick={() => setCurrency('usd')}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: currency === 'usd' && usdReady ? 'var(--color-cherry)' : 'white',
              color: currency === 'usd' && usdReady ? 'white' : 'var(--color-cherry-dark)',
              border: '1.5px solid rgba(122,24,50,0.2)',
              opacity: usdReady ? 1 : 0.4,
              cursor: usdReady ? 'pointer' : 'not-allowed',
            }}
          >
            🇺🇸 USD $
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 gap-5 mb-6">
          {/* Monthly */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className="card p-7 flex flex-col gap-4"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cherry opacity-60">
                {monthly?.display_name ?? 'Mensual'}
              </p>
              <div className="mt-2">
                {monthly?.original_price && (
                  <span className="text-base line-through text-cherry-dark opacity-40">
                    {fmt(monthly.original_price, currency)}/mes
                  </span>
                )}
                <p className="text-3xl font-bold mt-1 text-cherry-dark">
                  {monthly ? fmt(monthly.current_price, currency) : fmt(29, currency)}
                  <span className="text-sm font-normal opacity-50">/mes</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-cherry-dark opacity-70">
              {monthly ? `Prueba gratuita de ${monthly.trial_days} días` : 'Prueba gratuita de 3 días'}
            </p>
            <button
              onClick={() => handlePlanClick('monthly')}
              disabled={checkoutLoading !== null}
              className="btn-primary w-full justify-center mt-auto"
              style={{ opacity: checkoutLoading !== null ? 0.7 : 1 }}
            >
              {checkoutLoading === 'monthly' ? 'Redirigiendo...' : 'Empieza gratis'}
            </button>
          </motion.div>

          {/* Yearly — highlighted */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-[var(--radius-lg)] p-7 flex flex-col gap-4 relative"
            style={{
              background: 'var(--color-cherry)',
              border: '1.5px solid var(--color-cherry-dark)',
              boxShadow: 'var(--shadow-medium)',
            }}
          >
            {(yearly?.badge_text || !yearly) && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
              >
                {yearly?.badge_text ?? 'Mejor precio'}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,241,181,0.85)' }}>
                {yearly?.display_name ?? 'Anual'}
              </p>
              <div className="mt-2">
                {yearly?.original_price && (
                  <span className="text-base line-through" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {fmt(yearly.original_price, currency)}/año
                  </span>
                )}
                <p className="text-3xl font-bold mt-1 text-white">
                  {yearly ? fmt(yearly.current_price, currency) : fmt(199, currency)}
                  <span className="text-sm font-normal" style={{ opacity: 0.6 }}>/año</span>
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {monthlyEquivalent && (
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  Equivale a {monthlyEquivalent} {symbol}/mes
                </p>
              )}
              {yearlySavings !== null && (
                <p className="text-sm font-semibold" style={{ color: 'var(--color-buttermilk)' }}>
                  Ahorra {fmt(yearlySavings, currency)}/año
                </p>
              )}
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Ahorro aproximado: 63%
              </p>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {yearly ? `Prueba gratuita de ${yearly.trial_days} días` : 'Prueba gratuita de 3 días'}
            </p>
            <button
              onClick={() => handlePlanClick('yearly')}
              disabled={checkoutLoading !== null}
              className="w-full py-3 rounded-xl font-semibold text-sm mt-auto transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--color-buttermilk)',
                color: 'var(--color-cherry-dark)',
                cursor: checkoutLoading !== null ? 'not-allowed' : 'pointer',
                opacity: checkoutLoading !== null ? 0.7 : 1,
              }}
            >
              {checkoutLoading === 'yearly' ? 'Redirigiendo...' : 'Empieza gratis'}
            </button>
          </motion.div>
        </div>

        {checkoutError && (
          <div
            className="mb-6 p-3 rounded-xl text-sm text-center"
            style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
          >
            {checkoutError}
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TRUST_BADGES.map((badge) => (
            <div
              key={badge}
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)' }}
            >
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-xs font-bold"
                style={{ background: 'var(--color-pastel-green)', color: '#2a6a3a' }}
              >
                ✓
              </span>
              <span className="text-xs font-medium text-cherry-dark">{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}