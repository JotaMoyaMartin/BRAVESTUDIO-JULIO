'use client'
import { X, ArrowRight, TrendingUp, Check } from 'lucide-react'
import Reveal from './Reveal'
import { PROBLEM } from './content'

/**
 * Problema / transformación: ANTES vs DESPUÉS con BRÄVE.
 * Sin fotos de stock gigantes — comparativa en tarjetas limpias.
 */
export default function V2Problem() {
  return (
    <section className="py-16 sm:py-24" style={{ background: 'var(--v2-ivory)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="v2-h2 text-[26px] sm:text-4xl" style={{ color: 'var(--v2-ink)' }}>
            {PROBLEM.title}
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {/* ANTES */}
          <Reveal>
            <div
              className="h-full rounded-3xl p-7 sm:p-9"
              style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                  style={{ background: 'rgba(74,15,30,0.07)' }}
                  aria-hidden="true"
                >
                  <TrendingUp size={16} style={{ color: 'rgba(74,15,30,0.5)' }} className="rotate-180" />
                </span>
                <h3 className="v2-eyebrow" style={{ color: 'rgba(74,15,30,0.6)' }}>Antes</h3>
              </div>
              <ul className="space-y-3.5">
                {PROBLEM.antes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] leading-snug" style={{ color: 'var(--v2-ink)' }}>
                    <X size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" style={{ color: 'rgba(74,15,30,0.4)' }} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* DESPUÉS */}
          <Reveal delay={0.08}>
            <div
              className="h-full rounded-3xl p-7 sm:p-9 relative overflow-hidden"
              style={{ background: 'var(--color-cherry)', border: '1.5px solid var(--color-cherry-dark)', boxShadow: '0 20px 50px rgba(122,24,50,0.25)' }}
            >
              <div aria-hidden="true" className="absolute -top-14 -right-14 w-44 h-44 rounded-full blur-3xl opacity-30" style={{ background: 'rgba(255,241,181,0.4)' }} />
              <div className="flex items-center gap-3 mb-6 relative">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                  style={{ background: 'var(--color-buttermilk)' }}
                  aria-hidden="true"
                >
                  <ArrowRight size={16} className="rotate-0" style={{ color: 'var(--color-cherry-dark)' }} />
                </span>
                <h3 className="v2-eyebrow" style={{ color: 'var(--color-buttermilk)' }}>Después con BRÄVE</h3>
              </div>
              <ul className="space-y-3.5 relative">
                {PROBLEM.despues.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] leading-snug font-medium" style={{ color: '#fff' }}>
                    <span
                      className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                      style={{ background: 'rgba(255,241,181,0.25)' }}
                      aria-hidden="true"
                    >
                      <Check aria-hidden="true" size={11} strokeWidth={3} style={{ color: 'var(--color-buttermilk)' }} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}