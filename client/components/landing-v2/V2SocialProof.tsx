import Image from 'next/image'
import { BadgeCheck, Eye, Heart, MousePointerClick, Send, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import Reveal from './Reveal'
import { RESULTS, CTA_PRIMARY } from './content'

/**
 * Resultados — caso destacado (Nerea) + 4 tarjetas de evidencia.
 * TODO real: las capturas de /testimonials son las originales (verificadas,
 * una a una). Los recortes solo esconden chrome (barras de estado, teclado,
 * cabeceras de app) con object-fit/object-position — los originales quedan
 * intactos. Frases y cifras son las de las capturas. Nada inventado.
 */

const METRIC_ICONS: LucideIcon[] = [TrendingUp, Users, Eye, MousePointerClick]

function RealLabel({ children, onDark }: { children: string; onDark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold leading-tight"
      style={{ color: onDark ? 'rgba(255,246,236,0.6)' : 'rgba(42,11,18,0.5)' }}
    >
      <BadgeCheck size={12} strokeWidth={2.4} aria-hidden="true" />
      {children}
    </span>
  )
}

function CaptureShot({
  src, alt, ratio, pos, tilt, sizes, height, width,
}: {
  src: string; alt: string; ratio: string; pos?: string; tilt?: string; sizes: string; height?: number; width?: number | string
}) {
  return (
    <figure
      className="v2-shot relative rounded-xl overflow-hidden bg-white"
      style={{ aspectRatio: ratio, width, height, maxWidth: '100%', transform: tilt }}
    >
      <Image
        src={src} alt={alt} fill sizes={sizes}
        className="object-cover"
        style={pos ? { objectPosition: pos } : undefined}
      />
    </figure>
  )
}

export default function V2SocialProof() {
  const { nerea, olga, libia, shirley, camili } = RESULTS

  return (
    <section id="resultados" className="py-16 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <p className="v2-eyebrow" style={{ color: 'var(--color-cherry)' }}>{RESULTS.eyebrow}</p>
          <h2 className="v2-h2 text-[26px] sm:text-4xl mt-3" style={{ color: 'var(--v2-ink)' }}>
            {RESULTS.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'rgba(42,11,18,0.7)' }}>
            {RESULTS.sub}
          </p>
        </Reveal>

        {/* Fila 1: Nerea destacada (~60%) + Olga compacta */}
        <div className="grid md:grid-cols-5 gap-4 sm:gap-5 mb-4 sm:mb-5 items-stretch">
          {/* ── NEREA (destacada) ── */}
          <Reveal className="md:col-span-3">
            <article
              className="v2-result-card h-full rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col"
              style={{
                background: 'var(--v2-vino)',
                border: '1px solid rgba(255,241,181,0.25)',
                boxShadow: '0 18px 44px rgba(74,15,30,0.35)',
              }}
            >
              <div aria-hidden="true" className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-30" style={{ background: 'rgba(255,241,181,0.45)' }} />

              <div className="grid sm:grid-cols-2 gap-6 relative">
                {/* Texto + métricas reales */}
                <div className="flex flex-col">
                  <p className="v2-eyebrow" style={{ color: 'rgba(255,241,181,0.85)' }}>Testimonio real · {nerea.name}</p>
                  <h3 className="mt-3" style={{ color: '#fff' }}>
                    <span className="block text-[52px] font-extrabold tracking-tight leading-none" style={{ color: 'var(--color-buttermilk)' }}>
                      {nerea.stat}
                    </span>
                    <span className="block mt-2 text-lg font-bold uppercase tracking-tight">
                      {nerea.statUnit}
                    </span>
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'rgba(255,246,236,0.75)' }}>
                    {nerea.context}
                  </p>

                  <ul className="mt-4 grid grid-cols-2 gap-2">
                    {nerea.metrics.map((m, i) => {
                      const Icon = METRIC_ICONS[i] ?? TrendingUp
                      return (
                        <li
                          key={m.label}
                          className="rounded-xl px-3 py-2.5"
                          style={{ background: 'rgba(255,241,181,0.12)', border: '1px solid rgba(255,241,181,0.2)' }}
                        >
                          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,246,236,0.6)' }}>
                            <Icon size={11} aria-hidden="true" />
                            {m.label}
                          </span>
                          <span className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold" style={{ color: '#fff' }}>{m.value}</span>
                            <span className="text-[11px] font-bold" style={{ color: 'var(--color-buttermilk)' }}>{m.delta}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>

                  <blockquote className="mt-4 text-[14px] leading-relaxed italic" style={{ color: 'rgba(255,246,236,0.92)' }}>
                    «{nerea.quote}»
                  </blockquote>
                  <div className="mt-auto pt-4">
                    <RealLabel onDark>{nerea.label}</RealLabel>
                  </div>
                </div>

                {/* Collage: insights reales (capturas intactas, recorte solo visual) */}
                <div className="relative flex flex-col sm:h-full sm:justify-center">
                  <div className="w-[68%] self-start">
                    <CaptureShot
                      src={nerea.imgRing.src} alt={nerea.imgRing.alt}
                      ratio={nerea.imgRing.ratio} pos={nerea.imgRing.pos}
                      tilt="rotate(-2deg)"
                      sizes="(max-width: 640px) 66vw, (max-width: 1024px) 40vw, 200px"
                    />
                  </div>
                  <div className="w-[58%] self-end -mt-[6%] sm:-mt-[16%]">
                    <CaptureShot
                      src={nerea.imgStory.src} alt={nerea.imgStory.alt}
                      ratio={nerea.imgStory.ratio} pos={nerea.imgStory.pos}
                      tilt="rotate(3deg)"
                      sizes="(max-width: 640px) 56vw, (max-width: 1024px) 34vw, 175px"
                    />
                  </div>
                </div>
              </div>
            </article>
          </Reveal>

          {/* ── OLGA (compacta) ── */}
          <Reveal delay={0.06} className="md:col-span-2">
            <article
              className="v2-result-card h-full rounded-3xl p-6 sm:p-7 flex flex-col gap-4"
              style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)', boxShadow: '0 10px 30px rgba(74,15,30,0.08)' }}
            >
              <div>
                <p className="v2-eyebrow" style={{ color: 'var(--color-cherry)' }}>Testimonio real · {olga.name}</p>
                <h3 className="mt-2 text-[20px] sm:text-[22px] font-extrabold uppercase tracking-tight leading-tight" style={{ color: 'var(--v2-ink)' }}>
                  {olga.headline}
                </h3>
              </div>

              <div className="flex items-end gap-2.5 flex-wrap">
                {olga.stats.map((s, i) => (
                  <span
                    key={s.label}
                    className="inline-flex items-baseline gap-1.5 rounded-full px-3.5 py-1.5"
                    style={
                      i === 0
                        ? { background: 'var(--color-cherry)', color: 'white' }
                        : { background: 'var(--v2-blush)', color: 'var(--color-cherry-dark)' }
                    }
                  >
                    {i === 0 ? <Send size={11} aria-hidden="true" /> : <Heart size={11} aria-hidden="true" />}
                    <span className="text-sm font-extrabold">{s.value}</span>
                    <span className="text-[11px] font-semibold" style={{ opacity: 0.75 }}>{s.label}</span>
                  </span>
                ))}
              </div>

              <blockquote className="text-[13px] leading-relaxed italic" style={{ color: 'rgba(42,11,18,0.75)' }}>
                «{olga.quote}»
              </blockquote>

              <div className="mt-auto flex flex-col gap-2.5">
                <CaptureShot
                  src={olga.img.src} alt={olga.img.alt}
                  ratio={olga.img.ratio} sizes="(max-width: 768px) 92vw, 430px"
                />
                <RealLabel>{olga.label}</RealLabel>
              </div>
            </article>
          </Reveal>
        </div>

        {/* Fila 2: Libia · Shirley · Camili */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
          {/* LIBIA — conversión */}
          <Reveal className="flex">
            <article
              className="v2-result-card h-full rounded-3xl p-6 flex flex-col gap-3.5 w-full"
              style={{ background: 'var(--color-buttermilk)', border: '1px solid rgba(89,20,39,0.15)', boxShadow: '0 10px 30px rgba(74,15,30,0.08)' }}
            >
              <div>
                <p className="v2-eyebrow" style={{ color: 'var(--color-cherry-dark)' }}>{libia.name}</p>
                <h3 className="mt-2 text-[24px] font-extrabold uppercase tracking-tight leading-tight" style={{ color: 'var(--v2-ink)' }}>
                  {libia.headline}
                </h3>
                <span
                  className="mt-2.5 inline-block rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ background: 'var(--color-cherry)', color: 'white' }}
                >
                  {libia.stat}
                </span>
              </div>
              <blockquote className="text-[13px] leading-relaxed italic" style={{ color: 'rgba(89,20,39,0.9)' }}>
                «{libia.quote}»
              </blockquote>
              <div className="mt-auto flex flex-col gap-2.5">
                <CaptureShot
                  src={libia.img.src} alt={libia.img.alt}
                  ratio={libia.img.ratio} sizes="(max-width: 768px) 92vw, 360px"
                />
                <RealLabel>{libia.label}</RealLabel>
              </div>
            </article>
          </Reveal>

          {/* SHIRLEY — confianza */}
          <Reveal delay={0.05} className="flex">
            <article
              className="v2-result-card h-full rounded-3xl p-6 flex flex-col gap-3.5 w-full"
              style={{ background: 'var(--v2-sand)', border: '1px solid var(--v2-border-light)', boxShadow: '0 10px 30px rgba(74,15,30,0.08)' }}
            >
              <div>
                <p className="v2-eyebrow" style={{ color: 'var(--color-cherry-dark)' }}>{shirley.name}</p>
                <p
                  className="mt-1 text-base tracking-[0.2em]"
                  style={{ color: 'var(--color-cherry)' }}
                  role="img"
                  aria-label="5 de 5 estrellas"
                >
                  {'★★★★★'}
                </p>
                <h3 className="mt-2 text-[19px] font-extrabold uppercase tracking-tight leading-tight" style={{ color: 'var(--v2-ink)' }}>
                  {shirley.headline}
                </h3>
              </div>
              <blockquote className="text-[13px] leading-relaxed italic" style={{ color: 'rgba(42,11,18,0.75)' }}>
                «{shirley.quote}»
              </blockquote>
              <div className="mt-auto flex flex-col gap-2.5">
                <CaptureShot
                  src={shirley.img.src} alt={shirley.img.alt}
                  ratio={shirley.img.ratio} sizes="(max-width: 768px) 92vw, 360px"
                />
                <RealLabel>{shirley.label}</RealLabel>
              </div>
            </article>
          </Reveal>

          {/* CAMILI — aprendizaje (card menor) */}
          <Reveal delay={0.1} className="flex">
            <article
              className="v2-result-card h-full rounded-3xl p-6 flex flex-col gap-3.5 w-full"
              style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)', boxShadow: '0 10px 30px rgba(74,15,30,0.08)' }}
            >
              <div>
                <p className="v2-eyebrow" style={{ color: 'var(--color-cherry-dark)' }}>{camili.name}</p>
                <h3 className="mt-2 text-[19px] font-extrabold tracking-tight leading-snug" style={{ color: 'var(--v2-ink)' }}>
                  {camili.headline}
                </h3>
              </div>
              <blockquote className="text-[13px] leading-relaxed italic" style={{ color: 'rgba(42,11,18,0.75)' }}>
                «{camili.quote}»
              </blockquote>
              <div className="mt-auto flex flex-col gap-2.5">
                <CaptureShot
                  src={camili.img.src} alt={camili.img.alt}
                  ratio={camili.img.ratio} pos={camili.img.pos} sizes="(max-width: 768px) 92vw, 360px"
                />
                <RealLabel>{camili.label}</RealLabel>
              </div>
            </article>
          </Reveal>
        </div>

        {/* Franja de chats reales (WhatsApp): sin copia, las capturas hablan */}
        <Reveal className="mt-8 sm:mt-10">
          <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'rgba(42,11,18,0.45)' }}>
            {RESULTS.chats.label}
          </p>
          <div className="v2-chat-strip mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {RESULTS.chats.shots.map((s) => (
              <CaptureShot
                key={s.src}
                src={s.src} alt={s.alt}
                ratio={s.ratio} pos={s.pos} width={s.width}
                sizes="(max-width: 768px) 88vw, 420px"
              />
            ))}
          </div>
        </Reveal>

        {/* Nota de autenticidad + CTA */}
        <Reveal className="mt-10 text-center max-w-xl mx-auto">
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(42,11,18,0.55)' }}>
            {RESULTS.note}
          </p>
          <a href="#precios" className="v2-cta v2-btn v2-btn-dark mt-5 inline-flex">
            {CTA_PRIMARY}
          </a>
          <p className="mt-2 text-[11px] font-semibold" style={{ color: 'rgba(42,11,18,0.5)' }}>
            {RESULTS.ctaText}
          </p>
        </Reveal>
      </div>
    </section>
  )
}