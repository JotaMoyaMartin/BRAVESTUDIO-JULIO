'use client'
import { PlayCircle } from 'lucide-react'
import Reveal from './Reveal'
import { VSL } from './content'

/**
 * VSL: vídeo real de Loom con el recorrido de la app.
 * Va entre el Problema y Cómo funciona — el vídeo muestra la app en acción.
 */
export default function V2Vsl() {
  return (
    <section id="vsl" className="py-16 sm:py-24" style={{ background: 'var(--v2-sand)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <p className="v2-eyebrow inline-flex items-center gap-2" style={{ color: 'var(--color-cherry)' }}>
            <PlayCircle size={13} aria-hidden="true" />
            {VSL.eyebrow}
          </p>
          <h2 className="v2-h2 text-[26px] sm:text-4xl mt-4" style={{ color: 'var(--v2-ink)' }}>
            {VSL.title}
          </h2>
          <p className="mt-4 text-[15px] sm:text-base leading-relaxed max-w-xl mx-auto" style={{ color: 'rgba(42,11,18,0.75)' }}>
            {VSL.body}
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            className="relative rounded-[28px] overflow-hidden"
            style={{
              background: 'var(--v2-paper)',
              border: '1px solid var(--v2-border-light)',
              boxShadow: '0 30px 70px rgba(46,8,18,0.18)',
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
      </div>
    </section>
  )
}