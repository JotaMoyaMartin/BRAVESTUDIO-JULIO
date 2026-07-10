'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Profile } from '@/types/database'
import BraviMascot from '@/components/bravi/BraviMascot'
import BraviGuide from '@/components/bravi/BraviGuide'
import SupportButton from '@/components/SupportButton'
import { Loader2, Check, Edit3, X, AlertTriangle } from 'lucide-react'

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

const FAQ_ITEMS = [
  {
    q: '¿Cómo cancelo mi suscripción?',
    a: 'Puedes cancelar desde esta misma página en la sección "Mi suscripción" → "Cancelar suscripción". Tu acceso se mantiene hasta la fecha de renovación. También puedes gestionarlo desde el portal de Stripe.',
  },
  {
    q: '¿Cómo cambio mi contraseña?',
    a: 'En la sección "Seguridad" de esta página. Necesitas tu nueva contraseña (mínimo 8 caracteres) y confirmarla.',
  },
  {
    q: '¿Puedo cambiar de plan?',
    a: 'Sí. Ve a "Gestionar suscripción en Stripe" y desde el portal puedes cambiar de mensual a anual o viceversa.',
  },
  {
    q: '¿Cómo edito mi marca?',
    a: 'Desde "Mi Marca" en el menú lateral. Allí puedes actualizar tu información de salón, servicios y estrategia.',
  },
  {
    q: '¿Cómo uso Bravi?',
    a: 'Bravi te ayuda a crear contenido para Instagram: Reels, Carruseles y Stories. Ve a "Crear contenido" o "Stories" desde el menú y sigue los pasos. También puedes usar "Sorpréndeme" en Inicio para ideas rápidas.',
  },
]

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
  const [success, setSuccess] = useState('')

  // Edit profile state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || '',
    salon_name: profile?.salon_name || '',
    city: profile?.city || '',
    professional_role: profile?.professional_role || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Password state
  const [pwdForm, setPwdForm] = useState({ newPassword: '', confirm: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)

  // Cancel subscription state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [canceledInfo, setCanceledInfo] = useState<{ cancels_at: number } | null>(null)
  const [cancelError, setCancelError] = useState('')

  // Demo mode
  if (demoMode || !profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#591427' }}>Mi perfil</h1>
        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)' }}
        >
          <BraviGuide section="account" size={80} className="mb-4 mx-auto" />
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
  const isAlreadyCanceled = !!subscription?.canceled_at || status === 'canceled'

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

  async function handleSaveProfile() {
    setSavingProfile(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/account/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setSuccess('Perfil actualizado correctamente')
      setEditing(false)
      // Update local profile state via reload to reflect changes
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSavingProfile(false)
  }

  async function handleChangePassword() {
    setPwdError('')
    setPwdSuccess(false)
    if (pwdForm.newPassword.length < 8) {
      setPwdError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdError('Las contraseñas no coinciden')
      return
    }
    setSavingPwd(true)
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwdForm.newPassword, confirm: pwdForm.confirm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setPwdSuccess(true)
      setPwdForm({ newPassword: '', confirm: '' })
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Error al cambiar contraseña')
    }
    setSavingPwd(false)
  }

  async function handleCancelSubscription() {
    setCancelError('')
    setCancelLoading(true)
    try {
      const res = await fetch('/api/account/cancel-subscription', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setCanceledInfo({ cancels_at: data.cancels_at })
      setShowCancelModal(false)
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Error al cancelar')
    }
    setCancelLoading(false)
  }

  const cardStyle = {
    background: 'white',
    border: '1.5px solid rgba(122,24,50,0.1)',
    boxShadow: '0 4px 24px rgba(89,20,39,0.05)',
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BraviGuide section="account" size={72} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#591427' }}>Mi cuenta</h1>
          <p className="text-sm" style={{ color: '#7A1832', opacity: 0.7 }}>
            Tu perfil, suscripción y seguridad
          </p>
        </div>
      </div>

      {/* Toast notifications */}
      {success && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: '#e8f5e9', color: '#2a8a4a' }}>
          <Check size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: '#fde8e8', color: '#c0394e' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Datos personales — editable */}
      <div className="rounded-3xl p-6 mb-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A1832', opacity: 0.6 }}>
            Datos personales
          </p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium hover:underline"
              style={{ color: '#7A1832' }}
            >
              <Edit3 size={12} /> Editar
            </button>
          )}
        </div>

        {!editing ? (
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
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#591427', opacity: 0.6 }}>Nombre</label>
              <input
                value={editForm.full_name}
                onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#591427', opacity: 0.6 }}>Salón</label>
              <input
                value={editForm.salon_name}
                onChange={e => setEditForm(f => ({ ...f, salon_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#591427', opacity: 0.6 }}>Ciudad</label>
              <input
                value={editForm.city}
                onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#591427', opacity: 0.6 }}>Rol profesional</label>
              <input
                value={editForm.professional_role}
                onChange={e => setEditForm(f => ({ ...f, professional_role: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#7A1832', opacity: savingProfile ? 0.6 : 1 }}
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {savingProfile ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditForm({
                  full_name: profile.full_name || '',
                  salon_name: profile.salon_name || '',
                  city: profile.city || '',
                  professional_role: profile.professional_role || '',
                }) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#F5F0E8', color: '#591427' }}
              >
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}

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

      {/* Seguridad — cambio de contraseña */}
      <div className="rounded-3xl p-6 mb-4" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A1832', opacity: 0.6 }}>
          Seguridad
        </p>

        {pwdSuccess ? (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#e8f5e9' }}>
            <Check size={16} style={{ color: '#2a8a4a' }} />
            <p className="text-sm" style={{ color: '#2a8a4a' }}>Contraseña actualizada correctamente</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#591427', opacity: 0.6 }}>Nueva contraseña</label>
              <input
                type="password"
                value={pwdForm.newPassword}
                onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#591427', opacity: 0.6 }}>Confirmar contraseña</label>
              <input
                type="password"
                value={pwdForm.confirm}
                onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repite la nueva contraseña"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
              />
            </div>
            {pwdError && (
              <p className="text-xs" style={{ color: '#c0394e' }}>{pwdError}</p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={savingPwd || !pwdForm.newPassword || !pwdForm.confirm}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#7A1832', opacity: savingPwd || !pwdForm.newPassword || !pwdForm.confirm ? 0.6 : 1 }}
            >
              {savingPwd ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {savingPwd ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
          </div>
        )}
      </div>

      {/* Mi suscripción */}
      <div className="rounded-3xl p-6 mb-4" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A1832', opacity: 0.6 }}>
          Mi suscripción
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
                  {subscription.canceled_at || canceledInfo ? 'Se cancela el' : 'Próxima renovación'}
                </span>
                <span className="text-sm font-medium" style={{ color: '#591427' }}>
                  {formatDate(canceledInfo?.cancels_at ?? subscription.current_period_end)}
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

        {/* Gestión de suscripción */}
        {hasStripeCustomer && (
          <div className="mt-5 pt-4 border-t space-y-2" style={{ borderColor: 'rgba(122,24,50,0.08)' }}>
            <button
              onClick={handlePortal}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.2)', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
              {loading ? 'Abriendo…' : 'Gestionar en Stripe'}
            </button>

            {!isAlreadyCanceled && !canceledInfo && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:underline"
                style={{ color: '#c0394e' }}
              >
                Cancelar suscripción
              </button>
            )}

            {(isAlreadyCanceled || canceledInfo) && (
              <p className="text-xs text-center pt-1" style={{ color: '#591427', opacity: 0.6 }}>
                ✓ Tu suscripción está cancelada. Se mantendrá el acceso hasta{' '}
                {formatDate(canceledInfo?.cancels_at ?? subscription?.current_period_end ?? null)}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Soporte */}
      <div className="rounded-3xl p-6 mb-4" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A1832', opacity: 0.6 }}>
          Soporte
        </p>

        <div className="mb-4">
          <p className="text-sm mb-3" style={{ color: '#591427' }}>
            ¿Necesitas ayuda? Estamos aquí para ayudarte.
          </p>
          <SupportButton variant="full" subject="Ayuda con mi cuenta en BRÄVE Studio" />
        </div>

        <div className="pt-4 border-t" style={{ borderColor: 'rgba(122,24,50,0.08)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A1832', opacity: 0.6 }}>
            Preguntas frecuentes
          </p>
          <div className="space-y-1">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="group">
                <summary
                  className="cursor-pointer py-2 text-sm font-medium list-none flex items-center justify-between"
                  style={{ color: '#591427' }}
                >
                  {item.q}
                  <span className="text-xs opacity-50 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="pb-2 text-xs leading-relaxed" style={{ color: '#591427', opacity: 0.7 }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de confirmación de cancelación */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="rounded-3xl p-6 max-w-sm w-full"
            style={{ background: 'white', boxShadow: '0 12px 48px rgba(89,20,39,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#fde8e8' }}
              >
                <AlertTriangle size={20} style={{ color: '#c0394e' }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: '#591427' }}>Cancelar suscripción</h3>
                <p className="text-xs mt-0.5" style={{ color: '#591427', opacity: 0.7 }}>
                  Tu acceso se mantiene hasta el{' '}
                  {formatDate(subscription?.current_period_end ?? null)}.
                  Después no se renovará.
                </p>
              </div>
            </div>

            {cancelError && (
              <p className="text-xs mb-3 p-2 rounded-lg" style={{ background: '#fde8e8', color: '#c0394e' }}>
                {cancelError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#c0394e', opacity: cancelLoading ? 0.6 : 1 }}
              >
                {cancelLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirmar cancelación'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#F5F0E8', color: '#591427' }}
              >
                Seguir pagando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}