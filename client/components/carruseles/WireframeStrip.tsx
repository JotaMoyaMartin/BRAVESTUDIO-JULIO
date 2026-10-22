'use client'
/**
 * WIREFRAME — muestra qué tipo visual tendrá cada slide, ANTES de generar
 * imágenes. Ayuda a entender que las fotografías serán variadas, no cuatro
 * copias del mismo encuadre.
 */
import type { CopyProposal } from '@/lib/carruseles/types'
import { visualTypeLabel } from '@/lib/carruseles/styles'

const ROLE_LABEL: Record<string, string> = {
  hook: 'Gancho',
  desarrollo: 'Valor',
  cierre: 'Cierre',
  cta: 'CTA',
}

export default function WireframeStrip({ proposal }: { proposal: CopyProposal }) {
  const slides = proposal.slides
  return (
    <div className="mt-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45 mb-3">
        Cómo se apoyará visualmente · 1 de {slides.length} …
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {slides.map((s, i) => (
          <div
            key={s.n}
            className="shrink-0 w-[118px] rounded-[var(--radius-sm)] border border-ink/10 bg-warm-light p-2.5"
          >
            <div className="text-[11px] font-semibold text-cherry-dark tracking-wide">
              {String(s.n).padStart(2, '0')}
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink/45 mt-0.5">
              {ROLE_LABEL[s.role]}
            </div>
            <div className="mt-1.5 text-xs text-ink/75 leading-snug">
              {visualTypeLabel(s.visual)}
            </div>
            {i === 0 && (
              <div className="mt-1.5 text-[9px] uppercase tracking-[0.14em] text-cherry/60">
                Gancho visual
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}