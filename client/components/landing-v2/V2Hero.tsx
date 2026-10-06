'use client'
import Link from 'next/link'
import { Sparkle } from 'lucide-react'
import Reveal from './Reveal'
import HeroShowcase from './MockupsV2'
import { HERO, CTA_PRIMARY, CTA_SIGNUP_HREF } from './content'

/**
 * Hero: fondo burgundy oscuro, 2 columnas en desktop (mensaje + CTA / mockup).
 */
export default function V2Hero() {
  return (
    <section className="v2-dark relative overflow-hidden" style={{ paddingTop: 112, paddingBottom: 72 }}>
      {/* Decoración de fondo */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 right-[8%] w-[420px] h-[420px] rounded-full blur-3xl opacity-35" style={{ background: 'rgba(160,64,96,0.6)' }} />
        <div className="absolute bottom-[-160px] left-[-120px] w-[480px] h-[480px] rounded-full blur-3xl opacity-25" style={{ background: 'rgba(255,241,181,0.18)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          {/* Columna izquierda: mensaje + CTAs */}
          <div className="order-1 lg:order-1 max-w-xl">
            <Reveal>
              <p className="v2-eyebrow inline-flex items-center gap-2.5" style={{ color: 'var(--color-buttermilk)' }}>
                <Sparkle size={13} aria-hidden="true" />
                {HERO.eyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="v2-display text-[42px] min-[420px]:text-[48px] sm:text-[64px] lg:text-[68px] mt-5" style={{ color: 'var(--v2-on-dark)' }}>
                {HERO.headlineLines.map((line, i) => (
                  <span key={line} className={i === HERO.headlineLines.length - 1 ? 'block' : 'block'} style={i === 3 ? { color: 'var(--color-buttermilk)' } : undefined}>
                    {line}
                  </span>
                ))}
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 text-base sm:text-lg leading-relaxed max-w-md" style={{ color: 'var(--v2-on-dark-soft)' }}>
                {HERO.sub}
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href={CTA_SIGNUP_HREF} className="v2-cta v2-cta-light v2-btn v2-btn-light" style={{ padding: '1.15rem 2.3rem', fontSize: '1.02rem' }}>
                  {CTA_PRIMARY}
                </Link>
                <Link href="#como-funciona" className="v2-btn v2-btn-outline" style={{ padding: '1.05rem 1.6rem', fontSize: '0.85rem' }}>
                  {HERO.ctaSecondary}
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.24}>
              <p className="mt-4 text-xs font-medium" style={{ color: 'var(--v2-on-dark-soft)' }}>
                {HERO.microcopy}
              </p>
            </Reveal>
          </div>

          {/* Columna derecha: mockup del producto */}
          <div className="order-3 lg:order-2 w-full max-w-[560px] mx-auto lg:mx-0 lg:justify-self-end">
            <Reveal delay={0.15}>
              <HeroShowcase />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}