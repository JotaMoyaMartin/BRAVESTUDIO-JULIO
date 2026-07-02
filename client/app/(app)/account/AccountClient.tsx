'use client'
import { useState } from 'react'
import { Profile } from '@/types/database'
import BraviMascot from '@/components/bravi/BraviMascot'
import SupportButton from '@/components/SupportButton'

interface SubscriptionData {
  status: string
  current_period_end: number | null
  plan_amount: number | null
  plan_interval: 'month' | 'year' | null
  canceled_at: number | null
}

interface Props {
  profile: Profile | null
  subscription: SubscriptionData | null
  demoMode?: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Activa',       color: '#2a8a4a', bg: '#e8f5e9' },
  trialing:  { label: 'Prueba gratis', color: '#7A1832', bg: '#FFF1B5' },
  past_due:  { label: 'Pago pendiente', color: '#c0394e', bg: '#fde8e8' },
  canceled:  { label: 'Cancelada',     color: '#c0394e', bg: '#fde8e8' },
  unpaid:    { label: 'Impagada',      color: '#c0394e', bg: '#fde8e8' },
  none:      { label: 'Sin suscripción', color: '#591427', bg: '#FFF1B5' },
}

const SOURCE_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  skool: 'Comunidad BRÄVE (Skool)',
  promo: 'Código promocional',
  manual: 'Acceso manual (admin)',
  none: 'Sin acceso',
}

function formatMoney(amount: number | null, interval: string | null): string {
  if (amount == null || !interval) return '—'
  const euros = amount / 100
  const formatted = euros.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
  return interval === 'year' ? `${formatted}/año` : `${formatted}/mes`
}

function formatDate(unixSeconds: number | null): string {
  if (!unixSeconds) return 'No disponible'
  return new Date(unixSeconds * 1000).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AccountClient({ profile, subscription, demoMode }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Demo mode
  if (demoMode || !profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#591427' }}>Mi Cuenta</h1>
        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)' }}
        >
          <BraviMascot size={80} className="mb-4 mx-auto" />
          <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>
            Modo demo. La gestión de suscripción no está disponible en este entorno.
          </p>
        </div>
      </div>
    )
  }

  const hasStripeCustomer = !!profile.stripe_customer_id
  const status = subscription?.status || profile.subscription_status || 'none'
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.none

  // Acceso no-Stripe (skool/promo/manual)
  const isNonStripeAccess =
    profile.access_source === 'skool' ||
    profile.access_source === 'promo' ||
    profile.access_source === 'manual'

  async function handlePortal() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || 'No se pudo abrir el portal de gestión.')
    } catch {
      setError('Error al conectar con Stripe. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BraviMascot size={56} showMessage={false} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#591427' }}>Mi Cuenta</h1>
          <p className="text-sm" style={{ color: '#7A1832', opacity: 0.7 }}>
            Gestiona tu suscripción y método de pago
          </p>
        </div>
      </div>

      {/* Usuario */}
      <div
        className="rounded-3xl p-6 mb-4"
        style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.05)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A1832', opacity: 0.6 }}>
          Cuenta
        </p>
        <p className="text-base font-semibold mb-1" style={{ color: '#591427' }}>
          {profile.full_name || 'Sin nombre'}
        </p>
        <p className="text-sm" style={{ color: '#7A1832', opacity: 0.7 }}>
          {profile.email}
        </p>
        {profile.salon_name && (
          <p className="text-sm mt-1" style={{ color: '#7A1832', opacity: 0.7 }}>
            Salón: {profile.salon_name}
          </p>
        )}
      </div>

      {/* Suscripción */}
      <div
        className="rounded-3xl p-6 mb-4"
        style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.05)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A1832', opacity: 0.6 }}>
          Suscripción
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: '#591427', opacity: 0.55 }}>Tipo de acceso</p>
            <p className="text-sm font-semibold" style={{ color: '#591427' }}>
              {SOURCE_LABELS[profile.access_source || 'none'] || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#591427', opacity: 0.55 }}>Estado</p>
            <span
              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: statusInfo.bg, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>

        {hasStripeCustomer && subscription && (
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs mb-1" style={{ color: '#591427', opacity: 0.55 }}>Plan</p>
              <p className="text-sm font-semibold" style={{ color: '#591427' }}>
                {formatMoney(subscription.plan_amount, subscription.plan_interval)}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#591427', opacity: 0.55 }}>
                {subscription.canceled_at ? 'Se cancela el' : 'Próxima renovación'}
              </p>
              <p className="text-sm font-semibold" style={{ color: '#591427' }}>
                {formatDate(subscription.current_period_end)}
              </p>
            </div>
          </div>
        )}

        {hasStripeCustomer && !subscription && (
          <p className="text-sm mb-4" style={{ color: '#591427', opacity: 0.7 }}>
            No se pudo cargar la información de la suscripción desde Stripe. Puedes gestionarla directamente desde el portal.
          </p>
        )}

        {!hasStripeCustomer && isNonStripeAccess && (
          <div
            className="p-3 rounded-xl text-sm mb-4"
            style={{ background: '#FFF1B5', color: '#591427' }}
          >
            Tu acceso viene de {SOURCE_LABELS[profile.access_source!]}. No hay suscripción de Stripe que gestionar.
            {profile.access_source === 'promo' && profile.access_expires_at && (
              <> Caduca el {formatDate(new Date(profile.access_expires_at).getTime() / 1000)}.</>
            )}
          </div>
        )}

        {!hasStripeCustomer && !isNonStripeAccess && (
          <p className="text-sm mb-4" style={{ color: '#591427', opacity: 0.7 }}>
            No hay suscripción activa.
          </p>
        )}

        {hasStripeCustomer ? (
          <button
            onClick={handlePortal}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{
              background: '#7A1832',
              color: 'white',
              opacity: loading ? 0.65 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Abriendo portal…' : 'Gestionar suscripción'}
          </button>
        ) : (
          <a
            href="/pricing"
            className="block w-full py-3 rounded-xl font-semibold text-sm text-center"
            style={{ background: '#7A1832', color: 'white' }}
          >
            Ver planes
          </a>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 justify-center">
            <p className="text-xs" style={{ color: '#c0394e' }}>{error}</p>
            <SupportButton variant="compact" subject="Problema gestionando suscripción en BRÄVE Studio" />
          </div>
        )}
      </div>

      {/* Ayuda */}
      <div className="flex justify-center mt-6">
        <SupportButton variant="full" subject="Ayuda con mi cuenta en BRÄVE Studio" />
      </div>
    </div>
  )
}