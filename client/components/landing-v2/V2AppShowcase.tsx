'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Check, PlayCircle, Smartphone } from 'lucide-react'
import Reveal from './Reveal'
import { SHOWCASE } from './content'

/**
 * App showcase: mockup del móvil (imagen de Jota con callouts) + copy breve.
 * Va justo bajo el TrustStrip — el visitante ve la app antes del problema.
 */
export default function V2AppShowcase() {
  return (
    <section id="app" className="py-16 sm:py-24" style={{ background: 'var(--v2-blush)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[minmax(0,420px)_1fr] gap-10 lg:gap-16 items-center">
          {/* Mockup */}
          <Reveal className="order-1 mx-auto w-full max-w-[420px]">
            <div
              className="rounded-[32px] overflow-hidden"
              style={{
                background: 'var(--v2-paper)',
                border: '1px solid var(--v2-border-light)',
                boxShadow: '0 30px 70px rgba(46,8,18,0.16)',
              }}
            >
              <Image
                src={SHOWCASE.image}
                alt={SHOWCASE.imageAlt}
                width={941}
                height={1672}
                sizes="(max-width: 1024px) 94vw, 420px"
                className="w-full h-auto"
              />
            </div>
          </Reveal>

          {/* Copy */}
          <div className="order-2">
            <Reveal>
              <p className="v2-eyebrow inline-flex items-center gap-2" style={{ color: 'var(--color-cherry)' }}>
                <Smartphone size={13} aria-hidden="true" />
                {SHOWCASE.eyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="v2-h2 text-[26px] sm:text-4xl mt-4" style={{ color: 'var(--v2-ink)' }}>
                {SHOWCASE.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 text-[15px] sm:text-base leading-relaxed max-w-md" style={{ color: 'rgba(42,11,18,0.75)' }}>
                {SHOWCASE.body}
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <ul className="mt-6 space-y-3">
                {SHOWCASE.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[15px] leading-snug font-medium" style={{ color: 'var(--v2-ink)' }}>
                    <span
                      className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                      style={{ background: 'rgba(122,24,50,0.12)' }}
                      aria-hidden="true"
                    >
                      <Check size={11} strokeWidth={3} style={{ color: 'var(--color-cherry-dark)' }} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.24}>
              <Link
                href="#vsl"
                className="mt-8 inline-flex items-center gap-2 text-[15px] font-bold"
                style={{ color: 'var(--color-cherry)' }}
              >
                <PlayCircle size={18} aria-hidden="true" />
                Mira cómo funciona en vídeo
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}