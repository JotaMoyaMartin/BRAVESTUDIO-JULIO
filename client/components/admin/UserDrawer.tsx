'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, XCircle, Clock, ShieldAlert, History } from 'lucide-react'
import { Profile, UserActivityLog, PromoRedemption } from '@/types/database'
import { hasActiveAccess } from '@/lib/access'
import { SOURCE_LABELS, SIGNUP_LABELS, EVENT_LABELS } from '@/lib/admin-labels'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface UserDrawerProps {
  user: Profile | null
  onClose: () => void
  onUpdate: (user: Profile) => void
  stats?: { contentCount: number; lastActivity: string | null; brandComplete: boolean }
}

export default function UserDrawer({ user, onClose, onUpdate, stats }: UserDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState<UserActivityLog[]>([])
  const [promos, setPromos] = useState<PromoRedemption[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const userId = user?.id

  useEffect(() => {
    if (!userId) {
      setLogs([])
      setPromos([])
      return
    }
    let cancelled = false
    setLoadingHistory(true)
    fetch(`/api/admin/users/${userId}/activity`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setLogs(d.logs || [])
        setPromos(d.promos || [])
      })
      .catch(() => {
        if (cancelled) return
        setLogs([])
        setPromos([])
      })
      .finally(() => { if (!cancelled) setLoadingHistory(false) })
    return () => { cancelled = true }
  }, [userId])

  if (!user) return null
  const isActive = hasActiveAccess(user)

  async function updateAccess(profile: Profile, activate: boolean) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/activate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, activate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar acceso')
      onUpdate(data.user as Profile)
      // Refrescar historial
      const hRes = await fetch(`/api/admin/users/${profile.id}/activity`)
      const hData = await hRes.json()
      setLogs(hData.logs || [])
      setPromos(hData.promos || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmtDateTime(d: string) {
    return new Date(d).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <AnimatePresence>
      {user && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(90,20,39,0.35)', backdropFilter: 'blur(2px)' }}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
            style={{ width: 480, maxWidth: '100vw', background: 'var(--color-cream)', borderLeft: '1.5px solid rgba(122,24,50,0.12)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1.5px solid rgba(122,24,50,0.1)' }}>
              <div>
                <h3 className="text-base font-bold text-cherry-dark">Ficha de usuaria</h3>
                <p className="text-xs text-cherry-dark opacity-60 mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-[var(--radius-sm)] text-cherry-dark hover:bg-[rgba(122,24,50,0.06)]"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {error && (
                <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
              )}

              {/* Perfil */}
              <section>
                <h4 className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Perfil</h4>
                <div className="rounded-[var(--radius-md)] bg-white p-4 border border-soft space-y-2">
                  <Row label="Nombre" value={user.full_name || '—'} />
                  <Row label="Salón" value={user.salon_name || '—'} />
                  <Row label="Ciudad" value={user.city || '—'} />
                  <Row label="Especialidad" value={user.professional_role || '—'} />
                  <Row label="Rol" value={user.role} />
                  <Row label="Creado" value={fmtDate(user.created_at)} />
                </div>
              </section>

              {/* Acceso */}
              <section>
                <h4 className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Acceso</h4>
                <div className="rounded-[var(--radius-md)] bg-white p-4 border border-soft space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cherry-dark opacity-70">Estado</span>
                    {isActive ? (
                      <Badge tone="green"><CheckCircle size={12} className="mr-1" /> Activo</Badge>
                    ) : (
                      <Badge tone="danger"><XCircle size={12} className="mr-1" /> Inactivo</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cherry-dark opacity-70">Fuente</span>
                    <Badge tone={SOURCE_LABELS[user.access_source].tone}>{SOURCE_LABELS[user.access_source].label}</Badge>
                  </div>
                  <Row label="Expira" value={fmtDate(user.access_expires_at)} />
                  {user.promo_code_used && <Row label="Promo usado" value={user.promo_code_used} />}
                </div>
              </section>

              {/* Trazabilidad */}
              <section>
                <h4 className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Trazabilidad</h4>
                <div className="rounded-[var(--radius-md)] bg-white p-4 border border-soft space-y-2">
                  <Row label="Origen alta" value={SIGNUP_LABELS[user.signup_method]} />
                  <Row label="Activado por" value={user.activated_by ? 'Admin' : '—'} />
                  <Row label="Activado el" value={fmtDate(user.activated_at)} />
                </div>
              </section>

              {/* Suscripción */}
              <section>
                <h4 className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Suscripción</h4>
                <div className="rounded-[var(--radius-md)] bg-white p-4 border border-soft space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cherry-dark opacity-70">Estado</span>
                    <SubBadge status={user.subscription_status} />
                  </div>
                  <Row label="Plan" value={user.subscription_plan || '—'} />
                  <Row label="Customer ID" value={user.stripe_customer_id || '—'} />
                  <Row label="Subscription ID" value={user.stripe_subscription_id || '—'} />
                </div>
              </section>

              {/* Uso */}
              {stats && (
                <section>
                  <h4 className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Uso</h4>
                  <div className="rounded-[var(--radius-md)] bg-white p-4 border border-soft space-y-2">
                    <Row label="Contenidos" value={String(stats.contentCount)} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cherry-dark opacity-70">Marca</span>
                      {stats.brandComplete ? (
                        <Badge tone="green">Completa</Badge>
                      ) : (
                        <Badge tone="buttermilk">Pendiente</Badge>
                      )}
                    </div>
                    <Row label="Últ. actividad" value={fmtDate(stats.lastActivity)} />
                  </div>
                </section>
              )}

              {/* Historial */}
              <section>
                <h4 className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2 flex items-center gap-1.5">
                  <History size={12} /> Historial de actividad
                </h4>
                <div className="rounded-[var(--radius-md)] bg-white p-4 border border-soft">
                  {loadingHistory ? (
                    <p className="text-xs text-cherry-dark opacity-50">Cargando…</p>
                  ) : logs.length === 0 && promos.length === 0 ? (
                    <p className="text-xs text-cherry-dark opacity-50">Sin actividad registrada.</p>
                  ) : (
                    <ol className="space-y-2.5">
                      {logs.map(l => (
                        <li key={l.id} className="flex gap-2.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-cherry mt-1.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-cherry-dark">{EVENT_LABELS[l.event_type] || l.event_type}</span>
                              <span className="text-cherry-dark opacity-50 whitespace-nowrap">{fmtDateTime(l.created_at)}</span>
                            </div>
                            {l.actor_id && (
                              <span className="text-cherry-dark opacity-50">por Admin</span>
                            )}
                          </div>
                        </li>
                      ))}
                      {promos.map(p => (
                        <li key={p.id} className="flex gap-2.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227] mt-1.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-cherry-dark">Canjeó promo <code className="text-cherry">{p.code}</code></span>
                              <span className="text-cherry-dark opacity-50 whitespace-nowrap">{fmtDateTime(p.redeemed_at)}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            </div>

            {/* Actions */}
            <div className="px-6 py-5 space-y-2" style={{ borderTop: '1.5px solid rgba(122,24,50,0.1)' }}>
              <Button
                variant={isActive ? 'secondary' : 'primary'}
                fullWidth
                loading={loading}
                onClick={() => updateAccess(user, !isActive)}
              >
                {isActive ? 'Desactivar acceso' : 'Activar acceso'}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                disabled
                icon={<Clock size={14} />}
                title="Próximamente"
              >
                Extender trial (próximamente)
              </Button>
              {isActive && (
                <Button
                  variant="danger"
                  fullWidth
                  loading={loading}
                  icon={<ShieldAlert size={14} />}
                  onClick={() => updateAccess(user, false)}
                >
                  Revocar acceso
                </Button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-cherry-dark opacity-70">{label}</span>
      <span className="font-medium text-cherry-dark text-right">{value}</span>
    </div>
  )
}

function SubBadge({ status }: { status: Profile['subscription_status'] }) {
  if (!status || status === 'none') return <Badge tone="neutral">Sin suscripción</Badge>
  const map: Record<string, 'green' | 'buttermilk' | 'danger' | 'neutral'> = {
    active: 'green',
    trialing: 'buttermilk',
    canceled: 'danger',
    past_due: 'danger',
    unpaid: 'danger',
  }
  return <Badge tone={map[status] || 'neutral'}>{status}</Badge>
}