'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Profile } from '@/types/database'
import BraviMascot from '@/components/bravi/BraviMascot'
import SupportButton from '@/components/SupportButton'

interface Props {
  profile: Profile
}

export default function AccessBlockedClient({ profile }: Props) {
  const router = useRouter()
  const [showCodeForm, setShowCodeForm] = useState(false)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState('')

  const hasStripeCustomer = !!profile.stripe_customer_id

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setCodeLoading(true)
    setCodeError('')
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/inicio')
      } else {
        setCodeError(data.error || 'Código no válido.')
      }
    } catch {
      setCodeError('Error al verificar el código. Inténtalo de nuevo.')
    }
    setCodeLoading(false)
  }

  async function handlePortal() {
    setPortalLoading(true)
    setPortalError('')
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setPortalError('No se pudo abrir el portal de gestión. Inténtalo de nuevo.')
        setPortalLoading(false)
      }
    } catch {
      setPortalError('Error al conectar con Stripe. Inténtalo de nuevo.')
      setPortalLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#FFF8E7' }}
    >
      <div className="w-full max-w-lg">
        {/* Logo header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: '#7A1832' }}
          >
            <span className="text-white text-xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#591427' }}>
            BRÄVE Studio
          </h1>
        </div>

        {/* Main card */}
        <div
          className="rounded-3xl p-8"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.07)' }}
        >
          {/* Mascot */}
          <div className="flex justify-center mb-6">
            <BraviMascot size={90} message="Tu acceso no está activo" showMessage />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-3" style={{ color: '#591427' }}>
            Tu acceso no está activo
          </h2>

          {/* Body text */}
          <p className="text-sm text-center leading-relaxed mb-8" style={{ color: '#591427', opacity: 0.7 }}>
            Puede que tu prueba haya terminado, tu suscripción esté inactiva o tu acceso de comunidad haya caducado.
          </p>

          {/* Action A: Ver planes */}
          <div className="mb-4">
            <Link
              href="/pricing"
              className="block w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all"
              style={{
                background: '#7A1832',
                color: 'white',
              }}
            >
              Ver planes
            </Link>
          </div>

          {/* Action B: Tengo un código (collapsible) */}
          <div className="mb-4">
            <button
              onClick={() => setShowCodeForm(!showCodeForm)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: '#FFF1B5',
                color: '#591427',
                border: '1.5px solid rgba(122,24,50,0.18)',
                cursor: 'pointer',
              }}
            >
              Tengo un código
            </button>

            {showCodeForm && (
              <div className="mt-3">
                <p className="text-xs mb-2" style={{ color: '#591427', opacity: 0.55 }}>
                  Código promo o de Skool (miembros de la comunidad)
                </p>
                <form onSubmit={handleRedeem} className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO"
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                    style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', letterSpacing: '0.05em' }}
                    onFocus={e => (e.target.style.borderColor = '#7A1832')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
                  />
                  <button
                    type="submit"
                    disabled={codeLoading || !code.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{
                      background: '#7A1832',
                      color: 'white',
                      opacity: codeLoading || !code.trim() ? 0.5 : 1,
                      cursor: codeLoading || !code.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {codeLoading ? '...' : 'Aplicar'}
                  </button>
                </form>
                {codeError && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs" style={{ color: '#c0394e' }}>{codeError}</p>
                    <SupportButton variant="compact" subject="Problema con código de acceso en BRÄVE Studio" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action C: Gestionar mi suscripción (only if stripe_customer_id) */}
          {hasStripeCustomer && (
            <div className="mb-4">
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'white',
                  color: '#591427',
                  border: '1.5px solid rgba(122,24,50,0.18)',
                  cursor: portalLoading ? 'not-allowed' : 'pointer',
                  opacity: portalLoading ? 0.65 : 1,
                }}
              >
                {portalLoading ? 'Cargando...' : 'Gestionar mi suscripción'}
              </button>
              {portalError && (
                <div className="mt-2 flex items-center gap-2 justify-center">
                  <p className="text-xs" style={{ color: '#c0394e' }}>{portalError}</p>
                  <SupportButton variant="compact" subject="Problema gestionando suscripción en BRÄVE Studio" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: SupportButton */}
        <div className="flex justify-center mt-6">
          <SupportButton variant="full" subject="Problema de acceso en BRÄVE Studio" />
        </div>
      </div>
    </div>
  )
}