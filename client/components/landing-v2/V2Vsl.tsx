'use client'
import Image from 'next/image'
import { PlayCircle } from 'lucide-react'
import Reveal from './Reveal'
import { VSL } from './content'

/**
 * VSL: vídeo real de Loom con el recorrido de la app.
 * ES LO PRIMERO que se ve (lo pidió Jota): antes del hero, sobre el mismo
 * fondo oscuro para que VSL + hero fundan una sola apertura.
 */
export default function V2Vsl() {
  return (
    <section id="vsl" className="v2-dark relative overflow-hidden" style={{ paddingTop: 112, paddingBottom: 56 }}>
      <div aria-hidden="true" className="absolute -top-24 left-[6%] w-[380px] h-[380px] rounded-full blur-3xl opacity-25" style={{ background: 'rgba(160,64,96,0.6)' }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <p className="v2-eyebrow inline-flex items-center gap-2" style={{ color: 'var(--color-buttermilk)' }}>
            <PlayCircle size={13} aria-hidden="true" />
            {VSL.eyebrow}
          </p>
          <h2 className="v2-h2 text-[26px] sm:text-4xl mt-4" style={{ color: 'var(--v2-on-dark)' }}>
            {VSL.title}
          </h2>
          <p className="mt-4 text-[15px] sm:text-base leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--v2-on-dark-soft)' }}>
            {VSL.body}
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            className="relative rounded-[28px] overflow-hidden"
            style={{
              background: 'var(--v2-paper)',
              border: '1px solid var(--v2-border-dark)',
              boxShadow: '0 30px 70px rgba(46,8,18,0.45)',
            }}
          >
            <div className="relative aspect-video">
              <iframe
                src={VSL.videoUrl}
                title="Vídeo: así funciona BRÄVE por dentro"
                loading="lazy"
                allowFullScreen
                allow="fullscreen; picture-in-picture; clipboard-write"
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <div
            className="relative rounded-[28px] overflow-hidden mt-8"
            style={{
              border: '1px solid var(--v2-border-dark)',
              boxShadow: '0 30px 70px rgba(46,8,18,0.45)',
            }}
          >
            <Image
              src={VSL.mockupImage}
              alt={VSL.mockupAlt}
              width={1672}
              height={941}
              sizes="(max-width: 640px) 94vw, (max-width: 1024px) 92vw, 960px"
              className="w-full h-auto"
              priority={false}
            />
          </div>
        </Reveal>
      </div>
    </section>
  )
}