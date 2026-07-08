'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isUsdReady, Currency, PlanKey, PublicPlan } from '@/lib/plans'

function fmt(amount: number, currency: Currency): string {
  const symbol = currency === 'eur' ? '€' : '$'
  return `${amount} ${symbol}`
}

export default function PricingClient() {
  const router = useRouter()
  const [currency, setCurrency] = useState<Currency>('eur')
  const [usdReady, setUsdReady] = useState(false)
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [hasSession, setHasSession] = useState(false)
  const [trialUsed, setTrialUsed] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<null | 'monthly' | 'yearly'>(null)
  const [checkoutError, setCheckoutError] = useState('')

  useEffect(() => {
    isUsdReady().then(setUsdReady)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      if (session) {
        supabase.from('profiles')
          .select('trial_started_at')
          .single()
          .then(({ data }) => {
            setTrialUsed(!!data?.trial_started_at)
          })
      }
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
    <div className="min-h-screen bg-warm-light">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-cherry">
              <span className="text-white text-lg">✦</span>
            </div>
            <span className="text-lg font-bold text-cherry-dark">BRÄVE Studio</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-2 text-cherry opacity-70"
          >
            Ya tengo cuenta
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-cherry-dark" style={{ letterSpacing: '-0.5px' }}>
            Planes y precios
          </h1>
          <p className="text-sm text-cherry-dark opacity-65">
            Elige el plan que mejor se adapta a tu salón
          </p>
        </div>

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
        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          {/* Monthly */}
          <div
            className="rounded-3xl p-7 flex flex-col gap-4"
            style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.12)', boxShadow: 'var(--shadow-soft)' }}
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
              {trialUsed ? 'Suscripción inmediata' : (monthly ? `Prueba gratuita de ${monthly.trial_days} días` : 'Prueba gratuita de 3 días')}
            </p>
            <button
              onClick={() => handlePlanClick('monthly')}
              disabled={checkoutLoading !== null}
              className="btn-primary w-full justify-center mt-auto"
              style={{ opacity: checkoutLoading !== null ? 0.7 : 1 }}
            >
              {checkoutLoading === 'monthly' ? 'Redirigiendo a Stripe...' : (trialUsed ? 'Suscribirme' : 'Empieza gratis')}
            </button>
          </div>

          {/* Yearly — highlighted */}
          <div
            className="rounded-3xl p-7 flex flex-col gap-4 relative"
            style={{ background: 'var(--color-cherry)', border: '1.5px solid var(--color-cherry-dark)', boxShadow: 'var(--shadow-medium)' }}
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
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,241,181,0.8)' }}>
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
              {trialUsed ? 'Suscripción inmediata' : (yearly ? `Prueba gratuita de ${yearly.trial_days} días` : 'Prueba gratuita de 3 días')}
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
              {checkoutLoading === 'yearly' ? 'Redirigiendo a Stripe...' : (trialUsed ? 'Suscribirme' : 'Empieza gratis')}
            </button>
          </div>
        </div>

        {checkoutError && (
          <div
            className="mt-4 p-3 rounded-xl text-sm text-center"
            style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
          >
            {checkoutError}
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Sin permanencia', 'Cancela cuando quieras', 'Acceso inmediato', 'Diseñado para salones de belleza'].map(badge => (
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
    </div>
  )
}