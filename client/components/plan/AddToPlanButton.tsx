'use client'
/**
 * «Añadir a mi plan» (Mi plan · fase C): pone lo que acabas de crear en un día
 * de tu plan. Hoja inferior con la fecha (por defecto, mañana) y confirmación.
 */
import { useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, Check, Loader2, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { addToPlan, nextFreeDay, type AddToPlanPayload, type PlanStatus } from '@/lib/plan/progress'
import { createClient } from '@/lib/supabase/client'
import { demoGetPlan } from '@/lib/demo-store'

export default function AddToPlanButton({ userId, getPayload, status = 'preparado', className = 'btn-ghost text-sm', label = 'Añadir a mi plan' }: {
  userId: string
  /** Se llama al confirmar: así guarda el texto tal y como está en ese momento. */
  getPayload: () => AddToPlanPayload | null
  status?: PlanStatus
  className?: string
  label?: string
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  const human = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  /** Abre la hoja proponiendo el primer día sin nada programado. */
  async function openSheet() {
    setAdded(null)
    setDate(nextFreeDay([]))
    setOpen(true)
    try {
      let taken: string[] = []
      if (userId === 'demo') {
        taken = demoGetPlan().map(i => i.scheduled_date as string | null).filter((d): d is string => !!d)
      } else {
        const { data } = await createClient().from('content_items').select('scheduled_date').eq('user_id', userId).not('scheduled_date', 'is', null)
        taken = (data || []).map(r => r.scheduled_date as string)
      }
      setDate(nextFreeDay(taken))
    } catch { /* se queda mañana */ }
  }

  async function confirm() {
    const payload = getPayload()
    if (!payload || !date) return
    setBusy(true)
    const ok = await addToPlan(userId, payload, date, userId === 'demo', status)
    setBusy(false)
    if (!ok) {
      toast.show('No se ha podido añadir a tu plan. Inténtalo de nuevo.', 'info')
      return
    }
    setAdded(date)
  }

  return (
    <>
      <button onClick={openSheet} className={className}>
        <CalendarPlus size={15} aria-hidden /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Añadir a mi plan" onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-burdeos">{added ? 'Añadido a tu plan' : '¿Qué día lo publicas?'}</p>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-warm-gray flex items-center justify-center" aria-label="Cerrar"><X size={16} /></button>
            </div>
            {added ? (
              <>
                <p className="text-[15px] text-tinta-2 flex gap-2"><Check size={18} className="text-[#2A7A4A] flex-shrink-0" aria-hidden /> Lo tienes el <b className="text-ink first-letter:lowercase">{human(added)}</b>.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOpen(false)} className="btn-ghost justify-center">Seguir aquí</button>
                  <Link href="/calendario" className="btn-primary justify-center">Ver Mi plan</Link>
                </div>
              </>
            ) : (
              <>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field text-base" aria-label="Fecha de publicación" />
                {date && <p className="text-[14px] text-tinta-2 first-letter:uppercase">{human(date)}</p>}
                <button onClick={confirm} disabled={busy || !date} className="btn-primary w-full justify-center">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} aria-hidden />} Añadir a mi plan
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
