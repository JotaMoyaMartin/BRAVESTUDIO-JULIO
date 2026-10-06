'use client'
import Link from 'next/link'
import { Mic, Video, Camera, Save, Eye, FlipHorizontal2 } from 'lucide-react'
import Reveal from './Reveal'
import { TeleprompterPhone } from './MockupsV2'
import { TELEPROMPTER, CTA_SIGNUP_HREF } from './content'

const FEATURES = [
  { icon: FlipHorizontal2, label: 'Efecto espejo' },
  { icon: Video, label: 'Grabación vertical HD' },
  { icon: Eye, label: 'Míralo antes de guardarlo' },
  { icon: Save, label: 'Guardado directo en tu móvil' },
]

/**
 * Teleprompter: la sección más visual. Móvil con el guion delante.
 * CTA: CREAR MI PRIMER GUION.
 */
export default function V2Teleprompter() {
  return (
    <section id="teleprompter" className="v2-dark py-16 sm:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <Reveal>
              <p className="v2-eyebrow inline-flex items-center gap-2" style={{ color: 'var(--color-buttermilk)' }}>
                <Mic size={13} aria-hidden="true" />
                {TELEPROMPTER.eyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="v2-h2 text-[26px] sm:text-4xl mt-4 max-w-md" style={{ color: 'var(--v2-on-dark)' }}>
                {TELEPROMPTER.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 text-[15px] sm:text-base leading-relaxed max-w-md" style={{ color: 'var(--v2-on-dark-soft)' }}>
                {TELEPROMPTER.body}
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-7 flex flex-wrap gap-2.5">
                {FEATURES.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,246,236,0.07)', border: '1px solid var(--v2-border-dark)', color: 'var(--v2-on-dark)' }}
                  >
                    <f.icon size={13} style={{ color: 'var(--color-buttermilk)' }} aria-hidden="true" />
                    {f.label}
                  </span>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <Link href={CTA_SIGNUP_HREF} className="v2-cta v2-cta-light v2-btn v2-btn-light mt-8" style={{ padding: '1rem 1.9rem', fontSize: '0.95rem' }}>
                {TELEPROMPTER.cta}
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="justify-self-center">
            <TeleprompterPhone />
          </Reveal>
        </div>
      </div>
    </section>
  )
}