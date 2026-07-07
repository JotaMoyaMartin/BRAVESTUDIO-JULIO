'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Check, X, AlertTriangle, RefreshCw, Loader2,
  Eye, EyeOff, History, Zap,
} from 'lucide-react'
import SectionTitle from '@/components/ui/SectionTitle'

// ── Types ──────────────────────────────────────────────────────────
type PlanRow = {
  id: number
  name: 'monthly' | 'yearly'
  display_name: string
  interval: 'month' | 'year'
  currency: 'eur' | 'usd'
  current_price: number
  original_price: number | null
  stripe_product_id: string | null
  stripe_price_id: string | null
  is_active: boolean
  is_visible: boolean
  trial_days: number
  badge_text: string | null
  description: string | null
  features: string[]
  created_at: string
  updated_at: string
}

type HistoryRow = {
  id: number
  plan_id: number
  old_price: number | null
  new_price: number | null
  old_stripe_price_id: string | null
  new_stripe_price_id: string | null
  changed_by: string | null
  created_at: string
}

const CURRENCY_SYMBOL: Record<string, string> = { eur: '€', usd: '$' }

function fmtPrice(amount: number, currency: string): string {
  return `${amount} ${CURRENCY_SYMBOL[currency] ?? '€'}`
}

// ── Component ──────────────────────────────────────────────────────
export default function PlansTab() {
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<PlanRow | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/plans')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar planes')
      setPlans(data.plans ?? [])
      setHistory(data.history ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  async function handleInit() {
    if (!confirm('Inicializar la tabla de planes desde los Price IDs de entorno. ¿Continuar?')) return
    setError('')
    try {
      const res = await fetch('/api/admin/plans', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al inicializar')
      await fetchPlans()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Planes y precios"
        subtitle="Gestiona los planes visibles en landing, pricing y checkout"
        icon={<Sparkles size={18} />}
      />

      {/* Warning banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(255,241,181,0.5)', border: '1.5px solid rgba(122,24,50,0.15)' }}
      >
        <AlertTriangle size={18} className="text-cherry flex-shrink-0 mt-0.5" />
        <p className="text-sm text-cherry-dark">
          <strong>Cambiar un precio no modifica suscripciones antiguas automáticamente.</strong> Solo
          afecta a nuevos clientes. Al cambiar el precio actual se crea un nuevo Price ID en Stripe y
          se archiva el anterior.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm text-center" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-cherry-dark opacity-60">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
        >
          <p className="text-sm text-cherry-dark mb-1">No hay planes en la base de datos.</p>
          <p className="text-xs text-cherry-dark opacity-60 mb-5">
            Inicializa desde los Price IDs configurados en variables de entorno.
          </p>
          <button onClick={handleInit} className="btn-primary">
            <Zap size={16} /> Inicializar planes
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} index={i} onEdit={() => setEditing(plan)} />
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn-ghost text-xs"
            >
              <History size={14} />
              {showHistory ? 'Ocultar historial' : 'Ver historial de cambios'}
            </button>
            <button onClick={fetchPlans} className="btn-ghost text-xs">
              <RefreshCw size={14} /> Refrescar
            </button>
          </div>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <HistoryList history={history} plans={plans} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <PlanEditModal
            plan={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); fetchPlans() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Plan card ──────────────────────────────────────────────────────
function PlanCard({ plan, index, onEdit }: { plan: PlanRow; index: number; onEdit: () => void }) {
  const sym = CURRENCY_SYMBOL[plan.currency] ?? '€'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl p-5"
      style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-cherry-dark">{plan.display_name}</h3>
            <span
              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
            >
              {plan.currency.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-cherry-dark opacity-60">
            {plan.interval === 'month' ? 'Suscripción mensual' : 'Suscripción anual'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {plan.is_visible ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
              <Eye size={12} /> Visible
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-cherry-dark opacity-50">
              <EyeOff size={12} /> Oculto
            </span>
          )}
          {!plan.is_active && (
            <span className="text-[10px] font-semibold text-danger">Inactivo</span>
          )}
        </div>
      </div>

      <div className="mb-3">
        {plan.original_price !== null && (
          <span className="text-sm line-through text-cherry-dark opacity-40 mr-2">
            {fmtPrice(plan.original_price, plan.currency)}
          </span>
        )}
        <span className="text-2xl font-bold text-cherry">
          {fmtPrice(plan.current_price, plan.currency)}
        </span>
        <span className="text-xs text-cherry-dark opacity-60 ml-1">
          /{plan.interval === 'month' ? 'mes' : 'año'}
        </span>
      </div>

      {plan.badge_text && (
        <span
          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-3"
          style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
        >
          {plan.badge_text}
        </span>
      )}

      <div className="space-y-1 text-xs text-cherry-dark mb-3">
        <div className="flex items-center justify-between">
          <span className="opacity-60">Días de prueba</span>
          <span className="font-semibold">{plan.trial_days}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="opacity-60">Stripe Price ID</span>
          <code className="font-mono text-[10px] opacity-80">
            {plan.stripe_price_id ? plan.stripe_price_id.slice(0, 16) + '…' : '—'}
          </code>
        </div>
      </div>

      <button onClick={onEdit} className="btn-secondary w-full justify-center text-xs py-2">
        Editar plan
      </button>
    </motion.div>
  )
}

// ── Edit modal ─────────────────────────────────────────────────────
function PlanEditModal({
  plan, onClose, onSaved,
}: {
  plan: PlanRow
  onClose: () => void
  onSaved: () => void
}) {
  const [displayName, setDisplayName] = useState(plan.display_name)
  const [currentPrice, setCurrentPrice] = useState(String(plan.current_price))
  const [originalPrice, setOriginalPrice] = useState(plan.original_price !== null ? String(plan.original_price) : '')
  const [trialDays, setTrialDays] = useState(String(plan.trial_days))
  const [badgeText, setBadgeText] = useState(plan.badge_text ?? '')
  const [description, setDescription] = useState(plan.description ?? '')
  const [isVisible, setIsVisible] = useState(plan.is_visible)
  const [isActive, setIsActive] = useState(plan.is_active)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState(false)

  const priceChanged = parseFloat(currentPrice) !== Number(plan.current_price)

  async function save() {
    setErr('')
    const body = {
      id: plan.id,
      display_name: displayName,
      current_price: parseFloat(currentPrice),
      original_price: originalPrice === '' ? null : parseFloat(originalPrice),
      trial_days: parseInt(trialDays, 10),
      badge_text: badgeText || null,
      description: description || null,
      is_visible: isVisible,
      is_active: isActive,
      confirm_price_change: pendingConfirm,
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'price_change_requires_confirmation') {
          setPendingConfirm(true)
          setErr(data.message)
        } else {
          throw new Error(data.error || 'Error al guardar')
        }
        setSaving(false)
        return
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error desconocido')
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(89,20,39,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-cream)', boxShadow: 'var(--shadow-strong)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-buttermilk)' }}>
          <h3 className="font-bold text-cherry-dark">
            Editar: {plan.display_name} {plan.currency.toUpperCase()}
          </h3>
          <button onClick={onClose} className="text-cherry-dark opacity-60 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="Nombre visible">
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="input-field" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Precio actual (${CURRENCY_SYMBOL[plan.currency]})`}>
              <input
                type="number" step="0.01" value={currentPrice}
                onChange={e => { setCurrentPrice(e.target.value); setPendingConfirm(false) }}
                className="input-field"
              />
            </Field>
            <Field label={`Precio tachado (${CURRENCY_SYMBOL[plan.currency]})`}>
              <input
                type="number" step="0.01" value={originalPrice}
                onChange={e => setOriginalPrice(e.target.value)}
                className="input-field"
                placeholder="Opcional"
              />
            </Field>
          </div>

          {priceChanged && (
            <div
              className="p-3 rounded-xl text-xs"
              style={{ background: 'rgba(255,241,181,0.6)', border: '1px solid rgba(122,24,50,0.2)', color: 'var(--color-cherry-dark)' }}
            >
              <AlertTriangle size={14} className="inline mr-1" />
              Cambiar el precio creará un <strong>nuevo Price ID en Stripe</strong>. Los clientes
              actuales mantienen su precio anterior.
              {pendingConfirm && (
                <div className="mt-2 font-semibold" style={{ color: 'var(--color-cherry)' }}>
                  ✓ Confirmado — al guardar se creará el nuevo Price.
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Días de prueba">
              <input
                type="number" value={trialDays}
                onChange={e => setTrialDays(e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Badge (opcional)">
              <input
                value={badgeText}
                onChange={e => setBadgeText(e.target.value)}
                className="input-field"
                placeholder="Ej: Mejor precio"
              />
            </Field>
          </div>

          <Field label="Descripción (opcional)">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="input-field resize-none"
            />
          </Field>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-cherry-dark cursor-pointer">
              <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} />
              Visible en landing
            </label>
            <label className="flex items-center gap-2 text-sm text-cherry-dark cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Activo
            </label>
          </div>

          <div className="pt-2 text-xs text-cherry-dark opacity-60">
            Stripe Price ID actual: <code className="font-mono">{plan.stripe_price_id || '—'}</code>
          </div>

          {err && (
            <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
              {err}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t" style={{ borderColor: 'var(--color-buttermilk)' }}>
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary flex-1 justify-center"
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {priceChanged && !pendingConfirm ? 'Revisar cambio' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-cherry-dark opacity-70 mb-1 block">{label}</span>
      {children}
    </label>
  )
}

// ── History list ───────────────────────────────────────────────────
function HistoryList({ history, plans }: { history: HistoryRow[]; plans: PlanRow[] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-cherry-dark opacity-50">
        Sin cambios registrados todavía.
      </div>
    )
  }
  const planMap = new Map(plans.map(p => [p.id, p]))
  return (
    <div className="space-y-2">
      {history.map(h => {
        const p = planMap.get(h.plan_id)
        return (
          <div
            key={h.id}
            className="flex items-center gap-3 p-3 rounded-xl text-xs"
            style={{ background: 'white', border: '1px solid var(--color-buttermilk)' }}
          >
            <div className="flex-1">
              <span className="font-semibold text-cherry-dark">
                {p ? `${p.display_name} ${p.currency.toUpperCase()}` : `Plan #${h.plan_id}`}
              </span>
              <span className="mx-2 text-cherry-dark opacity-40">→</span>
              <span className="text-cherry-dark">
                {h.old_price !== null ? fmtPrice(h.old_price, p?.currency ?? 'eur') : '—'} a{' '}
                {h.new_price !== null ? fmtPrice(h.new_price, p?.currency ?? 'eur') : '—'}
              </span>
            </div>
            <div className="text-cherry-dark opacity-50 text-right">
              <div>{new Date(h.created_at).toLocaleDateString('es-ES')}</div>
              {h.new_stripe_price_id && (
                <code className="font-mono text-[9px]">{h.new_stripe_price_id.slice(0, 14)}…</code>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}