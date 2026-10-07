'use client'
import { Check, Camera, TrendingUp, AlertCircle, Target } from 'lucide-react'
import Reveal from './Reveal'
import { INSIGHTS } from './content'

const CHIP_ICONS = [TrendingUp, AlertCircle, Target, Check]

/**
 * Diagnóstico Instagram — bloque informativo (presente, sin avisos de "llega pronto").
 */
export default function V2ComingSoon() {
  return (
    <section id="diagnostico" className="py-14 sm:py-24" style={{ background: 'var(--v2-sand)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Reveal>
          <div
            className="rounded-[28px] p-8 sm:p-12 text-center relative overflow-hidden"
            style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)' }}
          >
            <div aria-hidden="true" className="absolute -top-16 -left-16 w-52 h-52 rounded-full blur-3xl opacity-40" style={{ background: 'var(--v2-blush-deep)' }} />

            <Reveal delay={0.05}>
              <span
                className="v2-eyebrow inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px]"
                style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
              >
                <Camera size={13} aria-hidden="true" />
                {INSIGHTS.eyebrow}
              </span>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="v2-h2 text-[24px] sm:text-4xl mt-5 max-w-xl mx-auto" style={{ color: 'var(--v2-ink)' }}>
                {INSIGHTS.title}
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-[15px] leading-relaxed max-w-lg mx-auto" style={{ color: 'rgba(42,11,18,0.7)' }}>
                {INSIGHTS.sub}
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto">
                {INSIGHTS.chips.map((chip, i) => {
                  const Icon = CHIP_ICONS[i] ?? Check
                  return (
                    <span
                      key={chip}
                      className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 justify-center px-3 py-3 rounded-2xl text-xs sm:text-[13px] font-bold"
                      style={{ background: 'var(--v2-blush)', color: 'var(--color-cherry-dark)' }}
                    >
                      <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
                      {chip}
                    </span>
                  )
                })}
              </div>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  )
}