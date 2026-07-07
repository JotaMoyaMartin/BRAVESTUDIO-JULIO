'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

const STORIES = [
  {
    n: 1,
    role: 'Problema',
    text: '¿Tu balayage no está durando?',
    bg: 'var(--color-cherry)',
    color: 'white',
  },
  {
    n: 2,
    role: 'Autoridad',
    text: 'Antes de empezar, analizo el cabello…',
    bg: 'var(--color-pastel-blue)',
    color: '#2a5a6a',
  },
  {
    n: 3,
    role: 'Resultado',
    text: 'Escribe BALAYAGE y te asesoro 💌',
    bg: 'var(--color-pastel-green)',
    color: '#2a6a3a',
  },
]

export default function LandingStories() {
  return (
    <section className="bg-cream py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark mb-4 leading-tight" style={{ letterSpacing: '-0.5px' }}>
              Crea Stories que no solo muestran resultados, sino que generan conversaciones.
            </h2>
            <p className="text-base leading-relaxed text-cherry-dark opacity-75 mb-6">
              Transforma cualquier trabajo del salón en una secuencia estratégica de 3 Stories:
              Problema → Autoridad → Resultado + Acción.
            </p>
            <Link href="/signup" className="btn-primary">
              Crear mis Stories
            </Link>
          </motion.div>

          {/* Right: 3 story cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex gap-3 sm:gap-4 justify-center lg:justify-end"
          >
            {STORIES.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.12 }}
                whileHover={{ scale: 1.04, y: -4 }}
                className="flex flex-col"
                style={{ width: 130, height: 220 }}
              >
                <div
                  className="rounded-2xl p-3 flex flex-col justify-between h-full"
                  style={{
                    background: s.bg,
                    color: s.color,
                    boxShadow: 'var(--shadow-medium)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: 'rgba(255,255,255,0.25)',
                        color: s.color,
                      }}
                    >
                      {s.n}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{s.role}</span>
                  </div>
                  <p className="text-xs font-semibold leading-snug">{s.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}