'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
const STRIPE_READY = !!(MONTHLY_PRICE_ID && YEARLY_PRICE_ID)

interface Props {
  profile: Profile | null
}

export default function AccessClient({ profile }: Props) {
  const router = useRouter()
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'yearly' | null>(null)

  async function handleCheckout(plan: 'monthly' | 'yearly') {
    if (!STRIPE_READY) return
    setCheckoutLoading(plan)
    const priceId = plan === 'monthly' ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setCheckoutLoading(null)
    } catch {
      setCheckoutLoading(null)
    }
  }

  async function handlePortal() {
    const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  async function handlePromo(e: React.FormEvent) {
    e.preventDefault()
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoError('')
    setPromoSuccess('')
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (res.ok) {
        setPromoSuccess('¡Código aplicado! Redirigiendo...')
        setTimeout(() => router.push('/inicio'), 1200)
      } else {
        setPromoError(data.error || 'Código no válido.')
      }
    } catch {
      setPromoError('Error al verificar el código. Inténtalo de nuevo.')
    }
    setPromoLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const hasStripeCustomer = !!profile?.stripe_customer_id
  const isCanceled = profile?.subscription_status === 'canceled'
  const isPastDue = profile?.subscription_status === 'past_due'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#FFF8E7' }}
    >
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: '#7A1832' }}
          >
            <span className="text-white text-xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#591427' }}>
            Activa tu acceso a BRÄVE Studio
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#591427', opacity: 0.65 }}>
            Crea contenido estratégico para tu salón en minutos.
          </p>
        </div>

        {/* Status banner */}
        {(isCanceled || isPastDue) && (
          <div
            className="mb-5 p-4 rounded-2xl text-sm text-center"
            style={{ background: '#FFF1B5', border: '1.5px solid rgba(122,24,50,0.2)', color: '#591427' }}
          >
            {isCanceled
              ? 'Tu suscripción fue cancelada. Reactiva para seguir usando BRÄVE Studio.'
              : 'Hay un problema con tu pago. Actualiza tu método de pago para continuar.'}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Monthly */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-3 relative"
            style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.12)' }}
          >
            <div
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
              style={{ background: '#e8f5e9', color: '#2a8a4a' }}
            >
              3 días gratis
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A1832', opacity: 0.6 }}>Mensual</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#591427' }}>29€</p>
              <p className="text-xs" style={{ color: '#591427', opacity: 0.5 }}>por mes</p>
            </div>
            <button
              onClick={() => handleCheckout('monthly')}
              disabled={!STRIPE_READY || checkoutLoading !== null}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: STRIPE_READY ? '#7A1832' : '#d8d0c4',
                color: 'white',
                cursor: STRIPE_READY && !checkoutLoading ? 'pointer' : 'not-allowed',
                opacity: checkoutLoading === 'monthly' ? 0.65 : 1,
              }}
            >
              {checkoutLoading === 'monthly' ? '...' : STRIPE_READY ? 'Empezar prueba' : 'Próximamente'}
            </button>
          </div>

          {/* Yearly */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-3 relative"
            style={{ background: '#7A1832', border: '1.5px solid #591427' }}
          >
            <div
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
              style={{ background: '#FFF1B5', color: '#591427' }}
            >
              3 días gratis
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,241,181,0.8)' }}>Anual</p>
              <p className="text-2xl font-bold mt-1 text-white">199€</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>por año · ahorra 149€</p>
            </div>
            <button
              onClick={() => handleCheckout('yearly')}
              disabled={!STRIPE_READY || checkoutLoading !== null}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: STRIPE_READY ? '#FFF1B5' : 'rgba(255,255,255,0.2)',
                color: '#591427',
                cursor: STRIPE_READY && !checkoutLoading ? 'pointer' : 'not-allowed',
                opacity: checkoutLoading === 'yearly' ? 0.65 : 1,
              }}
            >
              {checkoutLoading === 'yearly' ? '...' : STRIPE_READY ? 'Empezar prueba' : 'Próximamente'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'rgba(122,24,50,0.12)' }} />
          <span className="text-xs" style={{ color: '#7A1832', opacity: 0.5 }}>o</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(122,24,50,0.12)' }} />
        </div>

        {/* Promo / School code */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.12)' }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: '#591427' }}>Tengo un código</p>
          <p className="text-xs mb-3" style={{ color: '#591427', opacity: 0.55 }}>
            Código promo o de School (miembros de la comunidad)
          </p>
          <form onSubmit={handlePromo} className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
              style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', letterSpacing: '0.05em' }}
              onFocus={e => (e.target.style.borderColor = '#7A1832')}
              onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
            />
            <button
              type="submit"
              disabled={promoLoading || !promoCode.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: '#7A1832', color: 'white',
                opacity: promoLoading || !promoCode.trim() ? 0.5 : 1,
                cursor: promoLoading || !promoCode.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {promoLoading ? '...' : 'Aplicar'}
            </button>
          </form>
          {promoError && (
            <p className="mt-2 text-xs" style={{ color: '#c0394e' }}>{promoError}</p>
          )}
          {promoSuccess && (
            <p className="mt-2 text-xs font-medium" style={{ color: '#2a8a4a' }}>{promoSuccess}</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-center gap-6">
          {hasStripeCustomer && (
            <button
              onClick={handlePortal}
              className="text-xs underline-offset-2 hover:underline"
              style={{ color: '#7A1832', opacity: 0.65, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Gestionar mi suscripción
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs underline-offset-2 hover:underline"
            style={{ color: '#7A1832', opacity: 0.45, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
