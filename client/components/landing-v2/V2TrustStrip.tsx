'use client'
import { Store, Scissors, Sparkles, Check } from 'lucide-react'
import Reveal from './Reveal'
import { TRUST } from './content'

const ICONS = [Store, Scissors, Sparkles]

/**
 * Franja de identificación bajo el hero. Sin métricas inventadas:
 * mientras no existan datos reales (rating, usuarios), solo categorías.
 * Espacio preparado para añadir números cuando sean reales.
 */
export default function V2TrustStrip() {
  return (
    <section className="bg-white border-b" style={{ borderColor: 'var(--v2-border-light)' }} aria-label="Para quién está hecho BRÄVE">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <Reveal>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <p className="v2-eyebrow" style={{ color: 'rgba(74,15,30,0.55)' }}>
              {TRUST.label}
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {TRUST.items.map((item, i) => {
                const Icon = ICONS[i] ?? Check
                return (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold"
                    style={{ background: 'var(--v2-blush)', color: 'var(--color-cherry-dark)' }}
                  >
                    <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
                    {item}
                  </span>
                )
              })}
            </div>
          </div>
          {/* Hueco para prueba social real (rating/usuarios/testimonios) cuando existan datos */}
        </Reveal>
      </div>
    </section>
  )
}