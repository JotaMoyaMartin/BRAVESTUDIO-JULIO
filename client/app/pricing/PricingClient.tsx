'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Currency, USD_READY } from '@/lib/stripe-prices'

function fmt(amount: number, currency: Currency): string {
  const symbol = currency === 'eur' ? '€' : '$'
  return `${amount} ${symbol}`
}

export default function PricingClient() {
  const router = useRouter()
  const [currency, setCurrency] = useState<Currency>('eur')

  const symbol = currency === 'eur' ? '€' : '$'
  const monthlyEquivalent = (199 / 12).toFixed(2).replace('.', ',')
  const yearlySavings = 540 - 199

  return (
    <div className="min-h-screen" style={{ background: '#FFF8E7' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center justify-center w-11 h-11 rounded-2xl"
              style={{ background: '#7A1832' }}
            >
              <span className="text-white text-lg">✦</span>
            </div>
            <span className="text-lg font-bold" style={{ color: '#591427' }}>
              BRÄVE Studio
            </span>
          </div>
          <a
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-2"
            style={{ color: '#7A1832', opacity: 0.7 }}
          >
            Ya tengo cuenta
          </a>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#591427', letterSpacing: '-0.5px' }}>
            Planes y precios
          </h1>
          <p className="text-sm" style={{ color: '#591427', opacity: 0.65 }}>
            Elige el plan que mejor se adapta a tu salón
          </p>
        </div>

        {/* Currency selector */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setCurrency('eur')}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: currency === 'eur' ? '#7A1832' : 'white',
              color: currency === 'eur' ? 'white' : '#591427',
              border: '1.5px solid rgba(122,24,50,0.2)',
              cursor: 'pointer',
            }}
          >
            🇪🇸 EUR €
          </button>
          <button
            disabled={!USD_READY}
            title={USD_READY ? 'USD' : 'Próximamente'}
            onClick={() => setCurrency('usd')}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: currency === 'usd' && USD_READY ? '#7A1832' : 'white',
              color: currency === 'usd' && USD_READY ? 'white' : '#591427',
              border: '1.5px solid rgba(122,24,50,0.2)',
              opacity: USD_READY ? 1 : 0.4,
              cursor: USD_READY ? 'pointer' : 'not-allowed',
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
            style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.12)', boxShadow: '0 4px 24px rgba(89,20,39,0.07)' }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A1832', opacity: 0.6 }}>
                Mensual
              </p>
              <div className="mt-2">
                <span
                  className="text-base line-through"
                  style={{ color: '#591427', opacity: 0.4 }}
                >
                  {fmt(45, currency)}/mes
                </span>
                <p className="text-3xl font-bold mt-1" style={{ color: '#591427' }}>
                  {fmt(29, currency)}<span className="text-sm font-normal" style={{ opacity: 0.5 }}>/mes</span>
                </p>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>
              Prueba gratuita de 3 días
            </p>
            <button
              onClick={() => router.push(`/signup?plan=monthly&currency=${currency}`)}
              className="w-full py-3 rounded-xl font-semibold text-sm mt-auto"
              style={{
                background: '#7A1832',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Empieza gratis
            </button>
          </div>

          {/* Yearly — highlighted */}
          <div
            className="rounded-3xl p-7 flex flex-col gap-4 relative"
            style={{ background: '#7A1832', border: '1.5px solid #591427', boxShadow: '0 4px 24px rgba(89,20,39,0.15)' }}
          >
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
              style={{ background: '#FFF1B5', color: '#591427' }}
            >
              Mejor precio
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,241,181,0.8)' }}>
                Anual
              </p>
              <div className="mt-2">
                <span
                  className="text-base line-through"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {fmt(540, currency)}/año
                </span>
                <p className="text-3xl font-bold mt-1 text-white">
                  {fmt(199, currency)}<span className="text-sm font-normal" style={{ opacity: 0.6 }}>/año</span>
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Equivale a {monthlyEquivalent} {symbol}/mes
              </p>
              <p className="text-sm font-semibold" style={{ color: '#FFF1B5' }}>
                Ahorra {fmt(yearlySavings, currency)}/año
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Ahorro aproximado: 63%
              </p>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Prueba gratuita de 3 días
            </p>
            <button
              onClick={() => router.push(`/signup?plan=yearly&currency=${currency}`)}
              className="w-full py-3 rounded-xl font-semibold text-sm mt-auto"
              style={{
                background: '#FFF1B5',
                color: '#591427',
                cursor: 'pointer',
              }}
            >
              Empieza gratis
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            'Sin permanencia',
            'Cancela cuando quieras',
            'Acceso inmediato',
            'Diseñado para salones de belleza',
          ].map(badge => (
            <div
              key={badge}
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)' }}
            >
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-xs font-bold"
                style={{ background: '#e8f5e9', color: '#2a8a4a' }}
              >
                ✓
              </span>
              <span className="text-xs font-medium" style={{ color: '#591427' }}>
                {badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}