'use client'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const BENEFITS = [
  {
    emoji: '📅',
    title: 'Planifica tu mes en 5 minutos',
    desc: 'Reels, carruseles y Stories estratégicos para cada día. Listos para copiar y publicar.',
    accent: 'var(--color-pastel-blue)',
  },
  {
    emoji: '🎬',
    title: 'Guiones que llenan tu agenda',
    desc: 'Gancho, contexto, solución y CTA. Contenido que convierte en reservas.',
    accent: 'var(--color-buttermilk)',
  },
  {
    emoji: '💬',
    title: 'Stories que responden solas',
    desc: 'Secuencia estratégica: Problema → Autoridad → Resultado + Acción.',
    accent: 'var(--color-pastel-green)',
  },
  {
    emoji: '📚',
    title: 'Nunca más el bloqueo',
    desc: 'Biblioteca ilimitada de ideas y guiones personalizados para tu salón.',
    accent: 'var(--color-buttermilk)',
  },
  {
    emoji: '✨',
    title: 'Suena a ti, no a robot',
    desc: 'Bravi adapta todo a tu salón, tus servicios y tu clienta ideal.',
    accent: 'var(--color-pastel-blue)',
  },
]

export default function LandingBenefits() {
  return (
    <section id="beneficios" className="bg-cream py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark mb-3" style={{ letterSpacing: '-0.5px' }}>
            Deja de procrastinar.{' '}
            <span className="title-shine">Empieza a publicar con estrategia.</span>
          </h2>
          <p className="text-sm sm:text-base text-cherry-dark opacity-70 max-w-xl mx-auto">
            Todo lo que necesitas para ser la referente de tu zona y llenar tu agenda con clientas que te encuentran en Instagram.
          </p>
        </motion.div>

        {/* Cards grandes: 2 col en móvil, tappable con flecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className="card relative p-6 sm:p-7 cursor-pointer group overflow-hidden"
              style={{
                gridColumn: i === BENEFITS.length - 1 ? 'span 1' : undefined,
                borderWidth: 2,
                borderColor: 'rgba(122,24,50,0.08)',
              }}
            >
              {/* Mancha de color de fondo */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: -40,
                  right: -40,
                  width: 130,
                  height: 130,
                  borderRadius: '50%',
                  background: b.accent,
                  opacity: 0.35,
                  filter: 'blur(40px)',
                }}
              />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <motion.div
                    className="text-4xl sm:text-5xl"
                    whileHover={{ scale: 1.2, rotate: -8 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {b.emoji}
                  </motion.div>
                  {/* Flecha que invita a pulsar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-cherry group-hover:text-white text-cherry"
                    style={{ background: 'rgba(122,24,50,0.07)' }}
                  >
                    <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </div>
                </div>
                <h3 className="font-bold text-lg sm:text-xl mb-2 text-cherry-dark leading-snug">{b.title}</h3>
                <p className="text-sm sm:text-base leading-relaxed text-cherry-dark opacity-70">{b.desc}</p>
              </div>
            </motion.div>
          ))}

          {/* Card CTA final que ocupa hueco — incita a pulsar */}
          <motion.a
            href="/signup"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: BENEFITS.length * 0.07 }}
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.97 }}
            className="relative p-6 sm:p-7 flex flex-col justify-between overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)',
              boxShadow: 'var(--shadow-strong)',
            }}
          >
            <div className="absolute text-3xl pointer-events-none" style={{ top: 14, right: 18, opacity: 0.25 }}>✨</div>
            <div>
              <div className="text-4xl sm:text-5xl mb-4">🚀</div>
              <h3 className="font-bold text-lg sm:text-xl mb-2 leading-snug" style={{ color: 'var(--color-buttermilk)' }}>
                Tu agenda llena empieza hoy
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                7 días gratis. Sin permanencia. Bravi te espera.
              </p>
            </div>
            <span
              className="inline-flex items-center justify-center gap-2 mt-5 px-5 py-3 rounded-xl font-bold text-sm sm:text-base transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
            >
              Empieza gratis →
            </span>
          </motion.a>
        </div>
      </div>
    </section>
  )
}