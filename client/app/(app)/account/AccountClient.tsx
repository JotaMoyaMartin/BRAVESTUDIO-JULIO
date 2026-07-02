'use client'
import { useState } from 'react'
import Link from 'next/link'
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
  active:    { label: 'Activa',        color: '#2a8a4a', bg: '#e8f5e9' },
  trialing:  { label: 'Prueba gratis',  color: '#7A1832', bg: '#FFF1B5' },
  past_due:  { label: 'Pago pendiente', color: '#c0394e', bg: '#fde8e8' },
  canceled:  { label: 'Cancelada',      color: '#c0394e', bg: '#fde8e8' },
  unpaid:    { label: 'Impagada',       color: '#c0394e', bg: '#fde8e8' },
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
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#591427' }}>Mi perfil</h1>
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
          <h1 className="text-2xl font-bold" style={{ color: '#591427' }}>Mi perfil</h1>
          <p className="text-sm" style={{ color: '#7A1832', opacity: 0.7 }}>
            Tu información personal y de acceso
          </p>
        </div>
      </div>

      {/* Datos personales */}
      <div
        className="rounded-3xl p-6 mb-4"
        style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.05)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A1832', opacity: 0.6 }}>
          Datos personales
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>Nombre</span>
            <span className="text-sm font-medium" style={{ color: '#591427' }}>
              {profile.full_name || 'Sin nombre'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>Email</span>
            <span className="text-sm font-medium" style={{ color: '#591427' }}>{profile.email}</span>
          </div>
          {profile.salon_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>Salón</span>
              <span className="text-sm font-medium" style={{ color: '#591427' }}>{profile.salon_name}</span>
            </div>
          )}
          {profile.city && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>Ciudad</span>
              <span className="text-sm font-medium" style={{ color: '#591427' }}>{profile.city}</span>
            </div>
          )}
          {profile.professional_role && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>Rol</span>
              <span className="text-sm font-medium" style={{ color: '#591427' }}>{profile.professional_role}</span>
            </div>
          )}
        </div>

        {/* Enlace a editar marca */}
        <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(122,24,50,0.08)' }}>
          <Link
            href="/mi-marca"
            className="text-xs font-medium hover:underline"
            style={{ color: '#7A1832', opacity: 0.7 }}
          >
            Editar mi marca →
          </Link>
        </div>
      </div>

      {/* Acceso */}
      <div
        className="rounded-3xl p-6 mb-4"
        style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.05)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A1832', opacity: 0.6 }}>
          Acceso
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>Tipo</span>
            <span className="text-sm font-medium" style={{ color: '#591427' }}>
              {SOURCE_LABELS[profile.access_source || 'none'] || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>Estado</span>
            <span
              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: statusInfo.bg, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>

          {hasStripeCustomer && subscription && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>Plan</span>
                <span className="text-sm font-medium" style={{ color: '#591427' }}>
                  {formatMoney(subscription.plan_amount, subscription.plan_interval)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>
                  {subscription.canceled_at ? 'Se cancela el' : 'Próxima renovación'}
                </span>
                <span className="text-sm font-medium" style={{ color: '#591427' }}>
                  {formatDate(subscription.current_period_end)}
                </span>
              </div>
            </>
          )}

          {hasStripeCustomer && !subscription && (
            <p className="text-sm pt-1" style={{ color: '#591427', opacity: 0.65 }}>
              No se pudo cargar la información de la suscripción desde Stripe.
            </p>
          )}

          {!hasStripeCustomer && isNonStripeAccess && (
            <p className="text-sm pt-1" style={{ color: '#591427', opacity: 0.65 }}>
              Tu acceso viene de {SOURCE_LABELS[profile.access_source!]}.
              {profile.access_source === 'promo' && profile.access_expires_at && (
                <> Caduca el {formatDate(new Date(profile.access_expires_at).getTime() / 1000)}.</>
              )}
            </p>
          )}

          {!hasStripeCustomer && !isNonStripeAccess && (
            <p className="text-sm pt-1" style={{ color: '#591427', opacity: 0.65 }}>
              No hay suscripción activa.{' '}
              <Link href="/pricing" className="font-medium hover:underline" style={{ color: '#7A1832' }}>
                Ver planes
              </Link>
            </p>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 justify-center">
            <p className="text-xs" style={{ color: '#c0394e' }}>{error}</p>
            <SupportButton variant="compact" subject="Problema gestionando suscripción en BRÄVE Studio" />
          </div>
        )}
      </div>

      {/* Sección discreta de gestión de suscripción — pequeña, al final */}
      {hasStripeCustomer && (
        <div
          className="rounded-2xl px-5 py-4 mb-4 flex items-center justify-between"
          style={{ background: 'rgba(255,241,181,0.4)', border: '1px solid rgba(122,24,50,0.08)' }}
        >
          <div>
            <p className="text-xs font-medium" style={{ color: '#591427', opacity: 0.7 }}>
              Método de pago y cancelación
            </p>
            <p className="text-xs" style={{ color: '#591427', opacity: 0.55 }}>
              Gestionado por Stripe
            </p>
          </div>
          <button
            onClick={handlePortal}
            disabled={loading}
            className="text-xs font-medium hover:underline disabled:opacity-50"
            style={{ color: '#7A1832', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Abriendo…' : 'Gestionar'}
          </button>
        </div>
      )}

      {/* Soporte */}
      <div className="flex justify-center mt-6">
        <SupportButton variant="compact" subject="Ayuda con mi cuenta en BRÄVE Studio" />
      </div>
    </div>
  )
}