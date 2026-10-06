'use client'
import { Sparkles, Compass, ListChecks, PenLine, Mic, LineChart } from 'lucide-react'
import Reveal from './Reveal'
import { HOW } from './content'

const ICONS = [Sparkles, Compass, ListChecks, PenLine, Mic, LineChart]

/**
 * Cómo funciona BRÄVE: 6 pasos del ecosistema.
 */
export default function V2HowItWorks() {
  return (
    <section id="como-funciona" className="v2-dark py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="v2-h2 text-[26px] sm:text-4xl" style={{ color: 'var(--v2-on-dark)' }}>
            {HOW.title}
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {HOW.steps.map((step, i) => {
            const Icon = ICONS[i] ?? Sparkles
            return (
              <Reveal key={step.title} delay={i * 0.05}>
                <article
                  className="h-full rounded-3xl p-6 sm:p-7 relative"
                  style={{ background: 'rgba(255,246,236,0.06)', border: '1px solid var(--v2-border-dark)' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="inline-flex items-center justify-center w-11 h-11 rounded-2xl shrink-0"
                      style={{ background: 'var(--color-buttermilk)' }}
                      aria-hidden="true"
                    >
                      <Icon size={19} strokeWidth={2.2} style={{ color: 'var(--color-cherry-dark)' }} />
                    </span>
                    <span className="v2-eyebrow" style={{ color: 'var(--color-buttermilk)' }}>
                      {step.kicker}
                    </span>
                  </div>
                  <h3 className="v2-h2 text-lg mb-2" style={{ color: 'var(--v2-on-dark)' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--v2-on-dark-soft)' }}>
                    {step.body}
                  </p>
                  {/* Conector sutil entre pasos (desktop) */}
                  {i < HOW.steps.length - 1 && (
                    <span className="hidden xl:block absolute top-1/2 -right-3.5 w-7 text-center" aria-hidden="true">
                      <span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: 'rgba(255,241,181,0.5)' }} />
                    </span>
                  )}
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}