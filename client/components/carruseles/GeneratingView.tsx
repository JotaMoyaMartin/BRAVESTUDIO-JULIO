'use client'
/**
 * GENERANDO — progreso por slide. El copy está bloqueado; solo se ve avanzar.
 * Un slide falla ≠ todo falla: cada fila tiene su estado y su reintento.
 */
import { Check, Loader2, RotateCcw, TriangleAlert } from 'lucide-react'
import type { SlideResult, StyleConfig } from '@/lib/carruseles/types'
import { visualTypeLabel } from '@/lib/carruseles/styles'

interface Props {
  style: StyleConfig
  total: number
  results: SlideResult[]
  onRetry: (index: number) => void
}

export default function GeneratingView({ style, total, results, onRetry }: Props) {
  const done = results.filter(r => r.status === 'ok').length
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-cherry/50 mb-2">Estilo · {style.name}</p>
      <h2
        className="text-2xl md:text-[28px] text-ink leading-snug"
        style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 600 }}
      >
        Creando tu carrusel
      </h2>
      <p className="mt-2 text-sm text-ink/55">
        {done === total
          ? 'Listo. Cada slide con su propia foto, un mismo director de arte.'
          : `${done} de ${total} slides listas — generamos una a una para no perder variedad visual.`}
      </p>

      <div className="mt-6 space-y-2.5">
        {Array.from({ length: total }, (_, i) => {
          const r = results[i]
          const status = r?.status ?? 'pending'
          return (
            <div
              key={i}
              className="flex items-center gap-3.5 px-4 py-3.5 bg-white rounded-[var(--radius-sm)] border border-[rgba(122,24,50,0.1)]"
            >
              <span className="text-sm font-semibold text-cherry-dark w-10 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Loader2
                className={`w-4 h-4 shrink-0 ${status === 'generating' || status === 'pending' ? 'text-cherry animate-spin' : 'hidden'}`}
              />
              {status === 'ok' && <Check className="w-4 h-4 shrink-0 text-emerald-700" />}
              {status === 'error' && <TriangleAlert className="w-4 h-4 shrink-0 text-amber-700" />}
              {status === 'unavailable' && <TriangleAlert className="w-4 h-4 shrink-0 text-ink/40" />}

              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink/75 truncate">
                  {status === 'ok' || status === 'error' ? (r?.text || '') + ' — ' : ''}
                  <span className="text-ink/45">{visualTypeLabel(r?.visual ?? '')}</span>
                </p>
                {status === 'error' && r?.error && (
                  <p className="text-xs text-ink/55 mt-0.5">{r.error}</p>
                )}
              </div>

              {(status === 'error' || status === 'unavailable') && (
                <button
                  onClick={() => onRetry(i)}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-cherry border border-[rgba(122,24,50,0.18)] rounded-full px-3 py-1.5 hover:bg-[rgba(122,24,50,0.05)] transition-all shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reintentar
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}