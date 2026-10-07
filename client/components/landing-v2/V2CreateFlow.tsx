'use client'
import Link from 'next/link'
import { ArrowRight, Lightbulb, Magnet, ScrollText, Zap, Mic } from 'lucide-react'
import Reveal from './Reveal'
import { CREATE, CTA_SIGNUP_HREF } from './content'

const ICONS = [Lightbulb, Magnet, ScrollText, Zap, Mic]

/**
 * Cadena de creación: Idea → Gancho → Guion → Stories → Teleprompter.
 * Las herramientas se encadenan — lo que eliges en un paso sigue en el siguiente.
 */
export default function V2CreateFlow() {
  return (
    <section id="crear" className="v2-dark py-14 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <p className="v2-eyebrow" style={{ color: 'var(--color-buttermilk)' }}>{CREATE.eyebrow}</p>
          <h2 className="v2-h2 text-[26px] sm:text-4xl mt-3" style={{ color: 'var(--v2-on-dark)' }}>
            {CREATE.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--v2-on-dark-soft)' }}>
            {CREATE.body}
          </p>
        </Reveal>

        <div className="relative">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {CREATE.steps.map((step, i) => {
              const Icon = ICONS[i] ?? Lightbulb
              return (
                <Reveal key={step.name} delay={i * 0.07}>
                  <article
                    className="relative rounded-2xl p-5 h-full"
                    style={{ background: 'rgba(255,246,236,0.06)', border: '1px solid var(--v2-border-dark)' }}
                  >
                    <span
                      className="hidden lg:inline-flex absolute top-1/2 -right-5 -translate-y-1/2 items-center justify-center w-8 h-8 rounded-full z-10"
                      style={{ background: 'var(--v2-vino-deep)', border: '1px solid var(--v2-border-dark)' }}
                      aria-hidden="true"
                    >
                      <ArrowRight size={13} style={{ color: 'var(--color-buttermilk)' }} />
                    </span>
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                      style={{ background: 'var(--color-buttermilk)' }}
                      aria-hidden="true"
                    >
                      <Icon size={17} strokeWidth={2.3} style={{ color: 'var(--color-cherry-dark)' }} />
                    </span>
                    <p className="v2-eyebrow text-[10px]" style={{ color: 'var(--color-buttermilk)' }}>
                      Paso {i + 1}
                    </p>
                    <h3 className="text-base font-extrabold mt-1" style={{ color: 'var(--v2-on-dark)' }}>
                      {step.name}
                    </h3>
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--v2-on-dark-soft)' }}>
                      {step.sample}
                    </p>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </div>

        <Reveal className="text-center mt-10">
          <Link href={CTA_SIGNUP_HREF} className="v2-cta v2-cta-light v2-btn v2-btn-light" style={{ padding: '1.05rem 2rem', fontSize: '0.95rem' }}>
            {CREATE.cta}
          </Link>
        </Reveal>
      </div>
    </section>
  )
}