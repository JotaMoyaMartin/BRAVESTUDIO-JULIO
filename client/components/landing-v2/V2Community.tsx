'use client'
import Link from 'next/link'
import { Bot, GraduationCap, Users, RefreshCcw, Ticket } from 'lucide-react'
import Reveal from './Reveal'
import { COMMUNITY, SKOOL } from './content'

const ICONS = [Bot, GraduationCap, Users, RefreshCcw]

/**
 * Acompañamiento — solo lo REAL de hoy:
 * asistente dentro de la app, Academia (sección existente), comunidad Skool
 * y actualizaciones continuas. Nada de promesas de funcionalidades inexistentes.
 */
export default function V2Community() {
  return (
    <section id="acompanamiento" className="py-14 sm:py-24" style={{ background: 'var(--v2-blush)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="v2-h2 text-[26px] sm:text-4xl" style={{ color: 'var(--v2-ink)' }}>
            {COMMUNITY.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'rgba(42,11,18,0.75)' }}>
            {COMMUNITY.body}
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMMUNITY.items.map((item, i) => {
            const Icon = ICONS[i] ?? Users
            return (
              <Reveal key={item.name} delay={i * 0.06}>
                <article
                  className="h-full rounded-3xl p-6"
                  style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)', boxShadow: '0 8px 26px rgba(74,15,30,0.06)' }}
                >
                  <span
                    className="inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-4"
                    style={{ background: 'var(--color-cherry)' }}
                    aria-hidden="true"
                  >
                    <Icon size={19} style={{ color: 'var(--color-buttermilk)' }} strokeWidth={2.2} />
                  </span>
                  <h3 className="font-extrabold text-[15px] tracking-tight" style={{ color: 'var(--v2-ink)' }}>
                    {item.name}
                  </h3>
                  <p className="text-[13px] mt-2 leading-relaxed" style={{ color: 'rgba(42,11,18,0.65)' }}>
                    {item.copy}
                  </p>
                </article>
              </Reveal>
            )
          })}
        </div>

        {/* Acceso comunidad Skool (REAL: existe /skool-access) */}
        <Reveal delay={0.1}>
          <div
            className="mt-8 rounded-3xl px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)' }}
          >
            <div>
              <p className="font-extrabold text-[15px]" style={{ color: 'var(--v2-ink)' }}>
                {SKOOL.title}
              </p>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(42,11,18,0.65)' }}>
                {SKOOL.body}
              </p>
            </div>
            <Link
              href={SKOOL.href}
              className="v2-btn v2-btn-outline-dark shrink-0 self-start sm:self-center"
              style={{ padding: '0.75rem 1.4rem' }}
            >
              <Ticket size={14} aria-hidden="true" />
              {SKOOL.cta}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}