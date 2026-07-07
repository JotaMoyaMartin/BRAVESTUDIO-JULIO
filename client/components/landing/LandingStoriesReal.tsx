'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BALAYAGE_GRADIENTS } from './DeviceShowcase'

const STORIES = [
  {
    n: 1,
    role: 'Problema',
    text: '¿Tu color dura menos de un mes?',
    gradient: BALAYAGE_GRADIENTS.honey,
    bottom: { type: 'poll', text: '📊 Encuesta', options: 'Sí · No' },
  },
  {
    n: 2,
    role: 'Autoridad',
    text: 'Antes de cualquier balayage analizo el estado del cabello.',
    gradient: BALAYAGE_GRADIENTS.process,
    bottom: { type: 'questions', text: '💭 Caja de preguntas', emoji: '❓' },
  },
  {
    n: 3,
    role: 'Resultado',
    text: 'Escribe BALAYAGE y te asesoro personalmente.',
    gradient: BALAYAGE_GRADIENTS.result,
    bottom: { type: 'cta', text: '💌 Escribe BALAYAGE', emoji: '✨' },
  },
]

export default function LandingStoriesReal() {
  return (
    <section className="relative bg-cream py-16 lg:py-24 overflow-hidden">
      <div className="absolute pointer-events-none" style={{ top: '20%', left: '-8%', width: 300, height: 300, borderRadius: '50%', background: 'var(--color-pastel-blue)', opacity: 0.12, filter: 'blur(60px)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3"
              style={{ background: 'var(--color-pastel-blue)', color: '#2a5a6a' }}
            >
              Stories BRÄVE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-cherry-dark mb-4 leading-tight" style={{ letterSpacing: '-0.5px' }}>
              Convierte cualquier trabajo del salón en una conversación que termina en reserva.
            </h2>
            <p className="text-base leading-relaxed text-cherry-dark opacity-75 mb-6">
              Transforma un balayage en una secuencia estratégica de 3 Stories: Problema → Autoridad → Resultado + Acción. Con encuestas, cajas de preguntas y CTAs que hacen que tus clientas te escriban.
            </p>
            <Link href="/signup" className="btn-primary">
              Crear mis Stories
            </Link>
          </motion.div>

          {/* Right: 3 realistic story mockups */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex gap-3 sm:gap-4 justify-center lg:justify-end"
          >
            {STORIES.map((s, i) => (
              <StoryCard key={s.n} story={s} index={i} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function StoryCard({ story, index }: { story: typeof STORIES[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
      whileHover={{ scale: 1.05, y: -6 }}
      className="relative flex-shrink-0"
      style={{ width: 140, height: 248 }}
    >
      {/* Phone frame */}
      <div
        className="relative w-full h-full rounded-[24px] p-1.5"
        style={{
          background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
          border: '2px solid rgba(89,20,39,0.15)',
          boxShadow: 'var(--shadow-strong)',
        }}
      >
        <div className="rounded-[18px] overflow-hidden relative w-full h-full">
          {/* Story image — balayage gradient */}
          <div style={{ position: 'absolute', inset: 0, background: story.gradient }} />
          {/* Dark overlay for legibility */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.65) 100%)' }} />

          {/* Progress bar */}
          <div className="flex gap-0.5 px-2 pt-2 relative z-10">
            {[0, 1, 2].map(j => (
              <div key={j} className="flex-1 h-0.5 rounded-full" style={{ background: j === index ? 'white' : 'rgba(255,255,255,0.35)' }} />
            ))}
          </div>

          {/* User bar */}
          <div className="flex items-center gap-1 px-2 pt-1.5 relative z-10">
            <div className="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[6px] text-white font-bold" style={{ background: '#7A1832' }}>✦</div>
            <span className="text-[6px] font-bold text-white">brave.studio</span>
            <span className="text-[5px] text-white opacity-60 ml-auto">2h</span>
          </div>

          {/* Role label */}
          <div className="absolute top-8 left-0 right-0 text-center z-10">
            <span
              className="inline-block text-[7px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: story.n === 1 ? 'rgba(122,24,50,0.85)'
                  : story.n === 2 ? 'rgba(42,90,106,0.85)'
                  : 'rgba(42,138,74,0.85)',
                color: 'white',
              }}
            >
              {story.role}
            </span>
          </div>

          {/* Centered text */}
          <div className="absolute inset-0 flex items-center justify-center px-3 z-10" style={{ paddingTop: 20 }}>
            <p className="text-[10px] font-bold text-white text-center leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
              {story.text}
            </p>
          </div>

          {/* Bottom element */}
          <div className="absolute bottom-2.5 left-0 right-0 px-2 z-10">
            {story.bottom.type === 'poll' && (
              <div className="rounded-lg px-2 py-1 flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                <span className="text-[6px] text-white font-semibold">📊</span>
                <span className="text-[6px] text-white font-semibold">Encuesta</span>
                <span className="text-[6px] text-white opacity-80 ml-auto">Sí · No</span>
              </div>
            )}
            {story.bottom.type === 'questions' && (
              <div className="rounded-lg px-2 py-1 flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                <span className="text-[6px]">💭</span>
                <span className="text-[6px] text-white font-semibold">Pregunta</span>
                <span className="text-[6px] text-white opacity-80 ml-auto">❓</span>
              </div>
            )}
            {story.bottom.type === 'cta' && (
              <div className="rounded-lg px-2 py-1.5 flex items-center justify-center gap-1" style={{ background: 'rgba(255,241,181,0.95)' }}>
                <span className="text-[7px]">💌</span>
                <span className="text-[6px] font-bold" style={{ color: '#7A1832' }}>Escribe BALAYAGE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decorative sparkle on first story */}
      {index === 0 && (
        <div className="absolute text-lg pointer-events-none" style={{ top: -8, right: -6, transform: 'rotate(12deg)' }}>✨</div>
      )}
    </motion.div>
  )
}