'use client'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote: 'Antes nunca sabía qué publicar. Ahora tengo contenido para todo el mes en menos de diez minutos.',
    name: 'Laura',
    city: 'Barcelona',
    badge: '+4.200 seguidores',
    badgeColor: '#7A1832',
  },
  {
    quote: 'He conseguido volver a publicar todas las semanas. Mis clientas ahora llegan diciendo que me ven continuamente.',
    name: 'María',
    city: 'Madrid',
    badge: 'Publica cada semana',
    badgeColor: '#2a5a6a',
  },
  {
    quote: 'Solo con las Stories he empezado a recibir mensajes todos los días.',
    name: 'Andrea',
    city: 'Valencia',
    badge: 'Mensajes diarios',
    badgeColor: '#7a6000',
  },
  {
    quote: 'Por fin siento que mi Instagram parece un salón premium.',
    name: 'Patricia',
    city: 'Sevilla',
    badge: 'Imagen premium',
    badgeColor: '#2a8a4a',
  },
]

export default function LandingTestimonials() {
  return (
    <section className="relative bg-cream py-16 lg:py-24 overflow-hidden">
      {/* Decorative */}
      <div className="absolute pointer-events-none" style={{ top: '15%', right: '-8%', width: 280, height: 280, borderRadius: '50%', background: 'var(--color-pastel-green)', opacity: 0.12, filter: 'blur(60px)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '10%', left: '-6%', width: 240, height: 240, borderRadius: '50%', background: 'var(--color-buttermilk)', opacity: 0.25, filter: 'blur(50px)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark mb-3" style={{ letterSpacing: '-0.5px' }}>
            Miles de estilistas ya crean contenido sin bloquearse
          </h2>
          <p className="text-sm sm:text-base text-cherry-dark opacity-70 max-w-xl mx-auto">
            Únete a estilistas que han dejado de procrastinar y ahora publican con estrategia.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="card p-5 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[0, 1, 2, 3, 4].map(j => (
                  <Star key={j} size={14} fill="var(--color-cherry)" color="var(--color-cherry)" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm leading-relaxed text-cherry-dark mb-4 flex-1">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-cherry-dark">{t.name}</p>
                  <p className="text-xs text-cherry-dark opacity-60">{t.city}</p>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ background: `${t.badgeColor}15`, color: t.badgeColor }}
                >
                  {t.badge}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}