'use client'
import { motion } from 'framer-motion'

const BENEFITS = [
  {
    emoji: '📅',
    title: 'No vuelvas a pensar qué publicar',
    desc: 'Bravi planifica tu mes entero en 5 minutos. Ideas estratégicas para cada día, listas para copiar y publicar.',
  },
  {
    emoji: '🎬',
    title: 'Reels y guiones que llenan tu agenda',
    desc: 'Metodología BRÄVE: gancho, contexto, solución y CTA conversacional. Contenido que educa, conecta y convierte en reservas.',
  },
  {
    emoji: '💬',
    title: 'Convierte cualquier trabajo en una conversación que termina en reserva',
    desc: 'Stories en secuencia estratégica: Problema → Autoridad → Resultado + Acción. Tus clientas responden solas.',
  },
  {
    emoji: '📚',
    title: 'Nunca más el bloqueo del creador',
    desc: 'Biblioteca ilimitada de ideas y guiones personalizados para tu salón. Siempre tienes algo que publicar con intención.',
  },
  {
    emoji: '✨',
    title: 'Contenido que parece hecho por ti',
    desc: 'Bravi adapta todo a tu salón, tus servicios y tu clienta ideal. Tu voz, tu estilo, tu autoridad.',
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
            Deja de procrastinar. Empieza a publicar con estrategia.
          </h2>
          <p className="text-sm sm:text-base text-cherry-dark opacity-70 max-w-xl mx-auto">
            Todo lo que necesitas para ser la referente de tu zona y llenar tu agenda con clientas que te encuentran en Instagram.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ scale: 1.03 }}
              className="card p-5 sm:p-6"
              style={{
                gridColumn: i >= 3 ? 'span 1' : undefined,
              }}
            >
              <div className="text-3xl mb-3">{b.emoji}</div>
              <h3 className="font-bold text-base mb-1.5 text-cherry-dark">{b.title}</h3>
              <p className="text-sm leading-relaxed text-cherry-dark opacity-70">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}