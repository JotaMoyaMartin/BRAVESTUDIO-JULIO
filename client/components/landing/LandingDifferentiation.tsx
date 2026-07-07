'use client'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Check } from 'lucide-react'
import BraviBubble from './BraviBubble'

const POINTS = [
  'IA especializada en salones de belleza',
  'Ahorra horas cada semana',
  'Contenido que educa, conecta y vende',
  'Más visibilidad, más reservas, más ingresos',
]

export default function LandingDifferentiation() {
  return (
    <section id="para-quien" className="bg-warm-gray py-16 lg:py-24">
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
              No es otra app más. Es tu estrategia completa en un solo lugar.
            </h2>
            <p className="text-base leading-relaxed text-cherry-dark opacity-75 mb-6">
              BRÄVE Studio no genera contenido genérico. Está diseñado para estilistas y salones de
              belleza que quieren aumentar su autoridad, atraer mejores clientas y publicar con
              constancia.
            </p>
            <ul className="space-y-2.5">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0"
                    style={{ background: 'var(--color-pastel-green)', color: '#2a6a3a' }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-sm sm:text-base font-medium text-cherry-dark">{p}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: iPhone mockup with Instagram-like elements + Bravi */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative flex items-center justify-center min-h-[440px]"
          >
            {/* Phone */}
            <div
              className="relative z-10"
              style={{
                width: 240,
                borderRadius: 36,
                padding: 10,
                background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
                border: '2px solid rgba(89,20,39,0.15)',
                boxShadow: 'var(--shadow-strong)',
              }}
            >
              {/* Notch */}
              <div
                className="absolute left-1/2 -translate-x-1/2 z-20"
                style={{ top: 10, width: 80, height: 18, background: '#591427', borderRadius: '0 0 12px 12px' }}
              />
              {/* Screen */}
              <div
                className="rounded-[28px] overflow-hidden"
                style={{ background: 'var(--color-cream)', aspectRatio: '9 / 19' }}
              >
                {/* Status bar */}
                <div className="flex items-center justify-between px-4 pt-3 text-[8px] font-semibold text-cherry-dark">
                  <span>9:41</span>
                  <span>●●●●</span>
                </div>
                {/* Post header */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white"
                    style={{ background: 'var(--color-cherry)' }}
                  >
                    ✦
                  </div>
                  <span className="text-[10px] font-bold text-cherry-dark">brave.studio</span>
                </div>
                {/* Balayage image simulation */}
                <div
                  className="mx-3 rounded-2xl"
                  style={{
                    aspectRatio: '4 / 5',
                    background: 'linear-gradient(155deg, #b8835a 0%, #d9a878 35%, #e8c098 60%, #f0d4a8 80%, #8a5a3a 100%)',
                    boxShadow: 'inset 0 -40px 60px rgba(60,30,10,0.25)',
                  }}
                />
                {/* Actions */}
                <div className="flex items-center gap-3 px-3 pt-2.5">
                  <Heart size={16} fill="var(--color-cherry)" color="var(--color-cherry)" />
                  <MessageCircle size={16} color="var(--color-cherry-dark)" />
                  <span className="ml-auto text-[9px] font-semibold text-cherry-dark">1.247 me gusta</span>
                </div>
                <p className="px-3 pt-1.5 text-[9px] leading-tight text-cherry-dark">
                  <strong>brave.studio</strong> Balayage profesional hecho a mano ✨
                </p>
              </div>
            </div>

            {/* Bravi bubble */}
            <div className="absolute z-20" style={{ top: '8%', right: '-4%' }}>
              <BraviBubble size={76} message="Trabajo contigo las 24 horas del día." />
            </div>

            {/* Decorative floating likes */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="absolute z-20"
              style={{ bottom: '12%', left: '0%' }}
            >
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'white', color: 'var(--color-cherry)', boxShadow: 'var(--shadow-soft)' }}
              >
                <Heart size={12} fill="var(--color-cherry)" color="var(--color-cherry)" />
                +328
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}