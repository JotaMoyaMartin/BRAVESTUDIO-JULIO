'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { IMacMockup, IPhoneMockup } from '@/components/Mockups'
import BraviBubble from './BraviBubble'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
}

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, var(--color-cream), var(--color-warm-light))' }}>
      {/* Decorative blurred circles */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-80px',
          right: '-60px',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'var(--color-pastel-blue)',
          opacity: 0.35,
          filter: 'blur(70px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-100px',
          left: '-80px',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'var(--color-buttermilk)',
          opacity: 0.4,
          filter: 'blur(80px)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: copy */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center lg:text-left"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs font-semibold"
              style={{ background: 'rgba(122,24,50,0.08)', color: 'var(--color-cherry)' }}
            >
              ✦ Hecho para estilistas y salones de belleza
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.05] mb-5 text-cherry-dark"
              style={{ letterSpacing: '-0.5px' }}
            >
              No volverás a quedarte sin ideas y conseguirás atraer más clientas con Instagram.
            </h1>
            <p className="text-base sm:text-lg leading-relaxed mb-7 max-w-xl mx-auto lg:mx-0 text-cherry-dark opacity-75">
              Bravi, tu asistente de IA especializado en salones de belleza, crea contenido
              estratégico por ti. Tú solo copias, grabas y publicas. Tu agenda se llena sola.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4">
              <Link href="/signup" className="btn-primary justify-center text-base px-7 py-3.5">
                Empieza gratis 3 días
              </Link>
              <a
                href="#planes"
                className="btn-secondary justify-center text-base px-7 py-3.5"
              >
                Ver planes
              </a>
            </div>
            <p className="text-xs text-cherry-dark opacity-55">
              Prueba gratuita de 3 días. Cancela cuando quieras. Acceso inmediato.
            </p>
          </motion.div>

          {/* Right: mockups + Bravi */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="relative flex items-center justify-center min-h-[420px] lg:min-h-[480px]"
          >
            {/* iMac */}
            <div className="relative z-10 w-full max-w-[520px]">
              <IMacMockup />
            </div>

            {/* iPhone — overlapped bottom-right */}
            <div
              className="hidden sm:block absolute z-20"
              style={{ right: '-4%', bottom: '-8%', transform: 'rotate(-6deg)' }}
            >
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'bottom right' }}>
                <IPhoneMockup />
              </div>
            </div>

            {/* Bravi bubble — top-right */}
            <div
              className="hidden md:block absolute z-30"
              style={{ top: '-10px', right: '8%' }}
            >
              <BraviBubble
                size={80}
                message="Hola, soy Bravi 🤖 Estoy aquí para ayudarte a llenar tu agenda."
              />
            </div>

            {/* Decorative sparkles */}
            <div
              className="absolute text-2xl pointer-events-none"
              style={{ top: '20%', left: '2%', opacity: 0.5, transform: 'rotate(-12deg)' }}
            >
              ✨
            </div>
            <div
              className="absolute text-xl pointer-events-none"
              style={{ bottom: '14%', left: '8%', opacity: 0.45 }}
            >
              ✦
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}