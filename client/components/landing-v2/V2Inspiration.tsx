'use client'
import Image from 'next/image'
import { Eye, ArrowRight } from 'lucide-react'
import Reveal from './Reveal'
import { INSPIRATION } from './content'

/**
 * Inspiración: referencias de Reels y Transiciones con covers REALES de la BD.
 * Estructura en dos capas (para poder volverla dinámica): fondo decorativo +
 * thumbnails HTML encima. En la app el contenido se actualiza semanalmente.
 */
function CoverFan({ covers, caption }: { covers: string[]; caption: string }) {
  const tilts = [-7, -2.5, 3, 8]
  return (
    <div className="relative h-full flex items-center justify-center py-8 px-4" aria-hidden="true">
      {/* Capa decorativa detrás */}
      <div
        className="absolute inset-x-6 inset-y-4 rounded-3xl blur-2xl opacity-60"
        style={{ background: 'linear-gradient(120deg, rgba(122,24,50,0.25), rgba(255,241,181,0.5))' }}
      />
      <div className="relative flex -space-x-6 sm:-space-x-8 items-center">
        {covers.map((cover, i) => (
          <span
            key={cover}
            className="relative block rounded-2xl overflow-hidden shrink-0"
            style={{
              transform: `rotate(${tilts[i % tilts.length]}deg) translateY(${Math.abs(i - (covers.length - 1) / 2) * 6}px)`,
              border: '3px solid white',
              boxShadow: '0 14px 34px rgba(46,8,18,0.28)',
              zIndex: i,
              aspectRatio: '3 / 4',
              height: 'clamp(120px, 38vw, 180px)',
            }}
          >
            <Image src={cover} alt="" fill sizes="200px" className="object-cover" />
          </span>
        ))}
      </div>
      <p className="absolute bottom-3 inset-x-0 text-center text-[11px] font-semibold tracking-wide" style={{ color: 'rgba(42,11,18,0.55)' }}>
        {caption}
      </p>
    </div>
  )
}

export default function V2Inspiration() {
  return (
    <section id="inspiracion" className="py-14 sm:py-24" style={{ background: 'var(--v2-ivory)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <p className="v2-eyebrow inline-flex items-center gap-2" style={{ color: 'var(--color-cherry)' }}>
            <Eye size={13} aria-hidden="true" />
            Inspiración real
          </p>
          <h2 className="v2-h2 text-[26px] sm:text-4xl mt-3" style={{ color: 'var(--v2-ink)' }}>
            {INSPIRATION.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'rgba(42,11,18,0.75)' }}>
            {INSPIRATION.body}
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5">
          {INSPIRATION.groups.map((group, gi) => (
            <Reveal key={group.name} delay={gi * 0.08}>
              <article
                className="rounded-[24px] overflow-hidden"
                style={{ background: 'var(--v2-paper)', border: '1px solid var(--v2-border-light)', boxShadow: '0 10px 34px rgba(74,15,30,0.07)' }}
              >
                <div className="h-[230px] sm:h-[250px] relative">
                  <CoverFan covers={group.covers} caption={group.caption} />
                </div>
                <div className="p-5 sm:p-6 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--v2-border-light)' }}>
                  <div>
                    <p className="font-extrabold text-base tracking-tight" style={{ color: 'var(--v2-ink)' }}>
                      {group.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(42,11,18,0.6)' }}>
                      Actualizado cada semana · con análisis y cómo adaptarlo
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                    style={{ background: 'var(--v2-blush)' }}
                    aria-hidden="true"
                  >
                    <ArrowRight size={15} style={{ color: 'var(--color-cherry)' }} />
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}