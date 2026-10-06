'use client'
import Link from 'next/link'
import { Sparkle } from 'lucide-react'
import Reveal from './Reveal'
import { FINAL_CTA, CTA_PRICING_ANCHOR } from './content'

/**
 * CTA final — fondo burgundy, cierre de la narrativa.
 */
export default function V2FinalCTA() {
  return (
    <section className="v2-dark py-20 sm:py-28 relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full blur-3xl opacity-30" style={{ background: 'rgba(160,64,96,0.7)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <Reveal>
          <p className="v2-eyebrow inline-flex items-center gap-2 justify-center" style={{ color: 'var(--color-buttermilk)' }}>
            <Sparkle size={13} aria-hidden="true" />
            BRÄVE Studio
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="v2-display text-[30px] min-[420px]:text-4xl sm:text-5xl mt-5" style={{ color: 'var(--v2-on-dark)' }}>
            {FINAL_CTA.title}
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-6 text-[15px] sm:text-base leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--v2-on-dark-soft)' }}>
            {FINAL_CTA.body}
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <Link
            href={CTA_PRICING_ANCHOR}
            className="v2-cta v2-cta-light v2-btn v2-btn-light mt-9"
            style={{ padding: '1.2rem 2.5rem', fontSize: '1rem' }}
          >
            {FINAL_CTA.cta}
          </Link>
          <p className="mt-4 text-xs font-medium" style={{ color: 'var(--v2-on-dark-soft)' }}>
            {FINAL_CTA.microcopy}
          </p>
        </Reveal>
      </div>
    </section>
  )
}