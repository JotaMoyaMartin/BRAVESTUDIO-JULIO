'use client'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const STEPS = [
  {
    n: 1,
    title: 'Configura tu salón',
    desc: 'Cuéntale a Bravi sobre tu marca una vez. Lo recordará para siempre.',
  },
  {
    n: 2,
    title: 'Elige qué quieres crear',
    desc: 'Reels, carruseles, Stories, ganchos o planificación mensual.',
  },
  {
    n: 3,
    title: 'Copia, graba y publica',
    desc: 'Textos listos para copiar y pegar. Ideas visuales para grabar sin pensar.',
  },
]

export default function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="bg-cream py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark" style={{ letterSpacing: '-0.5px' }}>
            Cómo funciona
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-4 relative">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative flex flex-col items-center text-center"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl mb-4"
                style={{ background: 'var(--color-cherry)', color: 'var(--color-buttermilk)' }}
              >
                {s.n}
              </div>
              <h3 className="font-bold text-lg mb-2 text-cherry-dark">{s.title}</h3>
              <p className="text-sm leading-relaxed text-cherry-dark opacity-70 max-w-xs">{s.desc}</p>

              {/* Connector arrow (desktop) */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden lg:block absolute"
                  style={{ top: 28, right: '-20px', color: 'var(--color-cherry)', opacity: 0.35 }}
                >
                  <ArrowRight size={22} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}