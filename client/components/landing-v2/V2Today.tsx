'use client'
import { ArrowRight, Check, Compass, Sparkles } from 'lucide-react'
import Reveal from './Reveal'
import { TODAY } from './content'

/**
 * Filosofía del HOME: abres la app y BRÄVE te dice qué hacer hoy.
 * Mockup HTML de la card "Tu plan para hoy" (como la TodayCard real de la app).
 */
export default function V2Today() {
  const m = TODAY.mock
  return (
    <section id="plan" className="py-16 sm:py-24" style={{ background: 'var(--v2-ivory)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Mockup */}
          <Reveal className="order-2 lg:order-1">
            <div
              className="rounded-[28px] p-6 sm:p-8 v2-float-slow"
              style={{
                background: 'linear-gradient(150deg, var(--v2-vino), var(--v2-vino-deep))',
                boxShadow: '0 30px 70px rgba(46,8,18,0.4)',
              }}
              aria-label="Vista de la app: tu plan para hoy"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px]" style={{ background: 'var(--color-cherry)' }} aria-hidden="true">
                  ✦
                </span>
                <span className="text-xs font-extrabold tracking-tight" style={{ color: 'var(--v2-on-dark)' }}>BRÄVE · Inicio</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--v2-on-dark)' }}>
                {m.hi}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--v2-on-dark-soft)' }}>
                {m.planTitle}
              </p>

              {/* Recomendación */}
              <div className="mt-5 rounded-2xl p-5" style={{ background: 'var(--color-buttermilk)', border: '2px solid var(--color-cherry)' }}>
                <span className="v2-eyebrow text-[10px]" style={{ color: 'var(--color-cherry-dark)' }}>
                  {m.recommended}
                </span>
                <p className="mt-2 text-lg font-extrabold leading-snug" style={{ color: '#1a1a1a' }}>
                  {m.recommendation}
                </p>
                <span
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white"
                  style={{ background: 'var(--color-cherry)' }}
                >
                  {m.cta}
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>

              {/* Libertad debajo */}
              <div className="mt-4 flex items-center gap-2">
                <Check size={14} strokeWidth={3} style={{ color: 'var(--color-buttermilk)' }} aria-hidden="true" />
                <p className="text-xs" style={{ color: 'var(--v2-on-dark-soft)' }}>
                  {m.secondary}
                </p>
              </div>
            </div>
          </Reveal>

          {/* Texto */}
          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="v2-eyebrow inline-flex items-center gap-2" style={{ color: 'var(--color-cherry)' }}>
                <Compass size={13} aria-hidden="true" />
                {TODAY.eyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="v2-h2 text-[26px] sm:text-4xl mt-4" style={{ color: 'var(--v2-ink)' }}>
                {TODAY.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 text-[15px] sm:text-base leading-relaxed max-w-md" style={{ color: 'rgba(42,11,18,0.75)' }}>
                {TODAY.body}
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div
                className="mt-7 inline-flex items-center gap-3 rounded-2xl px-5 py-4"
                style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)' }}
              >
                <Sparkles size={18} style={{ color: 'var(--color-cherry)' }} aria-hidden="true" />
                <p className="text-[13px] font-semibold leading-snug max-w-[280px]" style={{ color: 'var(--v2-ink)' }}>
                  La app elimina la pregunta “¿y ahora qué publico?” antes de que aparezca.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}