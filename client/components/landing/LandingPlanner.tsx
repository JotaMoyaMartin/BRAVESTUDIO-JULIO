'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

const DAYS = [
  { d: 1, empty: true }, { d: 2, empty: true }, { d: 3, label: 'Reel', c: 'var(--color-cherry)' },
  { d: 4, empty: true }, { d: 5, label: 'Carrusel', c: '#2a5a6a' }, { d: 6, empty: true }, { d: 7, empty: true },
  { d: 8, label: 'Story', c: '#7a6000' }, { d: 9, empty: true }, { d: 10, label: 'Reel', c: 'var(--color-cherry)' },
  { d: 11, empty: true }, { d: 12, label: 'Carrusel', c: '#2a5a6a' }, { d: 13, empty: true }, { d: 14, empty: true },
  { d: 15, empty: true }, { d: 16, label: 'Story', c: '#7a6000' }, { d: 17, empty: true },
  { d: 18, label: 'Reel', c: 'var(--color-cherry)' }, { d: 19, empty: true }, { d: 20, empty: true }, { d: 21, empty: true },
]

export default function LandingPlanner() {
  return (
    <section className="bg-warm-light py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left: calendar mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="order-2 lg:order-1"
          >
            <div
              className="card p-4 sm:p-5"
              style={{ maxWidth: 460, margin: '0 auto' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] text-white"
                    style={{ background: 'var(--color-cherry)' }}
                  >✦</div>
                  <span className="text-sm font-bold text-cherry-dark">Octubre</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--color-cherry)' }}>
                  8 ideas
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                  <div key={d} className="text-center text-[9px] font-bold text-cherry-dark opacity-50 pb-1">
                    {d}
                  </div>
                ))}
                {DAYS.map((day, i) => (
                  <div
                    key={i}
                    className="rounded-md aspect-square flex flex-col items-center justify-center text-[9px]"
                    style={{
                      background: day.empty ? 'var(--color-cream)' : 'white',
                      border: '1px solid rgba(255,241,181,0.6)',
                      color: 'var(--color-cherry-dark)',
                    }}
                  >
                    <span className="font-semibold opacity-60">{day.d}</span>
                    {day.label && (
                      <span
                        className="mt-0.5 px-1 py-0.5 rounded text-[7px] font-bold text-white"
                        style={{ background: day.c }}
                      >
                        {day.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark mb-4 leading-tight" style={{ letterSpacing: '-0.5px' }}>
              Planifica tu contenido del mes en minutos.
            </h2>
            <p className="text-base leading-relaxed text-cherry-dark opacity-75 mb-6">
              Selecciona tus servicios, frecuencia y objetivo. Bravi crea una planificación completa
              para Reels, carruseles y Stories.
            </p>
            <Link href="/signup" className="btn-primary">
              Crear mi planificación
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}