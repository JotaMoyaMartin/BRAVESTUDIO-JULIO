'use client'
// Inicio · próximos pasos (antes iban dentro del cuadro del asistente).
// Barra de progreso real (pasos hechos / total) y el siguiente paso destacado.

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, Circle } from 'lucide-react'
import type { BraviStep } from '@/lib/home-bravi'

export default function NextStepsCard({ steps }: { steps: BraviStep[] }) {
  const done = steps.filter(s => s.done).length
  const next = steps.find(s => !s.done) ?? null
  const [open, setOpen] = useState(done < steps.length)
  if (steps.length === 0) return null
  const pct = Math.round((done / steps.length) * 100)

  return (
    <section className="rounded-[var(--radius-lg)] bg-white p-4 sm:p-5" style={{ border: '1.5px solid var(--color-borde)', boxShadow: 'var(--shadow-soft)' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center gap-3 text-left">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-cherry-dark">Tus próximos pasos</h2>
          <p className="text-[13px] text-tinta-2">
            {next ? `${done} de ${steps.length} hechos · ahora: ${next.label}` : `¡Los ${steps.length} pasos hechos!`}
          </p>
        </div>
        <ChevronDown size={18} className={`text-cherry flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden />
      </button>
      <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }} role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Pasos hechos">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: 'var(--color-cereza)' }} />
      </div>
      {open && (
        <ul className="mt-3 space-y-1.5">
          {steps.map(s => {
            const isNext = next?.id === s.id
            return (
              <li key={s.id}>
                <Link
                  href={s.href}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 transition-colors hover:bg-[var(--color-warm-light)]"
                  style={isNext ? { background: 'var(--color-mantequilla)' } : { opacity: s.done ? 0.55 : 1 }}
                >
                  {s.done
                    ? <CheckCircle2 size={20} className="flex-shrink-0 text-cherry" aria-label="Hecho" />
                    : <Circle size={20} className="flex-shrink-0" style={{ color: 'rgba(122,24,50,0.4)' }} aria-label="Pendiente" />}
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[15px] font-semibold text-ink ${s.done ? 'line-through decoration-1' : ''}`}>{s.label}</span>
                    {!s.done && <span className="block text-[13px] text-tinta-2 leading-snug">{s.desc}</span>}
                  </span>
                  <ArrowRight size={16} className="flex-shrink-0 text-cherry" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
