'use client'
import { Sparkles } from 'lucide-react'
import Reveal from './Reveal'
import { BRAIN } from './content'

/**
 * Mi Marca / Business Brain: flujo INPUTS → BRÄVE → CONTENIDO PERSONALIZADO.
 * Diagrama HTML real (sin imágenes): cada dato de la marca a la izquierda,
 * el motor en el centro, el resultado a la derecha.
 */
export default function V2BusinessBrain() {
  return (
    <section id="marca" className="py-14 sm:py-24" style={{ background: 'var(--v2-blush)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-14 items-center">
          {/* Texto */}
          <div>
            <Reveal>
              <p className="v2-eyebrow inline-flex items-center gap-2" style={{ color: 'var(--color-cherry)' }}>
                <Sparkles size={13} aria-hidden="true" />
                {BRAIN.eyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="v2-h2 text-[26px] sm:text-4xl mt-4" style={{ color: 'var(--v2-ink)' }}>
                {BRAIN.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 text-[15px] sm:text-base leading-relaxed max-w-md" style={{ color: 'rgba(42,11,18,0.75)' }}>
                {BRAIN.body}
              </p>
            </Reveal>
          </div>

          {/* Diagrama */}
          <Reveal delay={0.1}>
            <div
              className="rounded-[28px] p-6 sm:p-8"
              style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)', boxShadow: '0 24px 60px rgba(74,15,30,0.1)' }}
              aria-label="Diagrama: los datos de tu marca alimentan a BRÄVE, y BRÄVE devuelve contenido personalizado"
            >
              <div className="grid grid-cols-[1fr_auto_1fr] sm:grid-cols-[1fr_auto_1.2fr] gap-3 sm:gap-4 items-center">
                {/* INPUTS */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  {BRAIN.inputs.map((input) => (
                    <span
                      key={input}
                      className="text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg truncate"
                      style={{ background: 'var(--v2-sand)', color: 'var(--color-cherry-dark)' }}
                    >
                      {input}
                    </span>
                  ))}
                </div>

                {/* MOTOR */}
                <div className="flex flex-col items-center gap-2 px-1">
                  <span className="w-px min-h-6 hidden sm:block" style={{ background: 'var(--color-cherry)', opacity: 0.35 }} />
                  <span
                    className="inline-flex items-center justify-center rounded-2xl v2-float"
                    style={{ width: 58, height: 58, background: 'var(--color-cherry)', boxShadow: '0 14px 34px rgba(122,24,50,0.4)' }}
                  >
                    <Sparkles size={24} style={{ color: 'var(--color-buttermilk)' }} aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: 'var(--color-cherry)' }}>
                    BRÄVE
                  </span>
                  <span className="w-px min-h-6 hidden sm:block" style={{ background: 'var(--color-cherry)', opacity: 0.35 }} />
                </div>

                {/* OUTPUT */}
                <div className="rounded-2xl p-4 sm:p-5 self-center" style={{ background: 'var(--color-cherry)' }}>
                  <p className="text-base sm:text-lg font-extrabold leading-snug" style={{ color: '#fff' }}>
                    Contenido personalizado para ti
                  </p>
                  <p className="text-[11px] mt-2 leading-snug" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Ideas, ganchos, guiones y planes que suenan a tu salón.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}