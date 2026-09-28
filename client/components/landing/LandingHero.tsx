'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { IMacMockup, IPhoneMockup } from '@/components/Mockups'
import BraviBubble from './BraviBubble'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
}

/** Card de foto de belleza con caption */
function HeroPic({ src, caption, className = '', style, size = 120 }: { src: string; caption: string; className?: string; style?: React.CSSProperties; size?: number }) {
  return (
    <div
      className={`relative overflow-hidden shrink-0 ${className}`}
      style={{
        width: size,
        height: size * 1.25,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-strong)',
        border: '3px solid white',
        ...style,
      }}
    >
      <img src={src} alt={caption} className="w-full h-full object-cover" draggable={false} />
      <div
        className="absolute inset-x-0 bottom-0 pt-6 pb-1.5 px-2"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(89,20,39,0.85))' }}
      >
        <p className="text-white text-[10px] font-bold leading-tight">{caption}</p>
      </div>
    </div>
  )
}

/** Foto ancha con overlay */
function HeroPicWide({ src, title, sub }: { src: string; title: string; sub: string }) {
  return (
    <div
      className="relative overflow-hidden w-full"
      style={{
        height: 180,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-strong)',
        border: '3px solid white',
        transform: 'rotate(-2deg)',
      }}
    >
      <img src={src} alt={title} className="w-full h-full object-cover" draggable={false} />
      <div
        className="absolute inset-x-0 bottom-0 pt-10 pb-2.5 px-3"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(89,20,39,0.85))' }}
      >
        <p className="text-white text-xs font-bold">{title}</p>
        <p className="text-white text-[10px] opacity-80">{sub}</p>
      </div>
    </div>
  )
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

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-14 lg:pt-16 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: copy — en móvil primero gancho, luego CTA grande */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center lg:text-left"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
              style={{ background: 'rgba(122,24,50,0.08)', color: 'var(--color-cherry)' }}
            >
              ✦ Hecho para estilistas y salones de belleza
            </div>
            <h1
              className="text-[2rem] sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.05] mb-4 text-cherry-dark"
              style={{ letterSpacing: '-0.5px' }}
            >
              No volverás a quedarte sin ideas y conseguirás{' '}
              <span className="title-shine">atraer más clientas</span> con Instagram.
            </h1>
            <p className="text-base sm:text-lg leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0 text-cherry-dark opacity-75">
              Bravi, tu asistente de IA especializado en salones de belleza, crea contenido
              estratégico por ti. Tú solo copias, grabas y publicas. Tu agenda se llena sola.
            </p>

            {/* CTA grande, full-width en móvil, con glow */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4">
              <Link
                href="/signup"
                className="btn-primary glow-ready justify-center text-lg px-8 py-4 shadow-strong"
              >
                Empieza gratis 3 días →
              </Link>
              <a href="#planes" className="btn-secondary justify-center text-lg px-8 py-4">
                Ver planes
              </a>
            </div>
            <p className="text-xs text-cherry-dark opacity-55">
              Prueba gratuita de 3 días. Cancela cuando quieras. Acceso inmediato.
            </p>
          </motion.div>

          {/* Right: composición visual — visible en móvil */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="relative flex items-center justify-center min-h-[380px] sm:min-h-[480px] lg:min-h-[520px]"
          >
            {/* ── MÓVIL: iPhone + fotos en columna ── */}
            <div className="sm:hidden relative w-full max-w-[320px] flex flex-col items-center">
              {/* Fotos pequeñas solapadas arriba */}
              <div className="relative w-full h-[120px] mb-[-30px] z-0">
                <HeroPic
                  src="/landing/color.jpg"
                  caption="Mechas ✨"
                  size={104}
                  className="absolute left-0 top-0 float-soft"
                  style={{ transform: 'rotate(-7deg)' }}
                />
                <HeroPic
                  src="/landing/transform.jpg"
                  caption="Antes / Después"
                  size={88}
                  className="absolute right-0 top-3"
                  style={{ transform: 'rotate(6deg)', animation: 'float-soft 4.8s ease-in-out 0.6s infinite' }}
                />
              </div>
              {/* iPhone en flow, delante */}
              <div className="relative z-10 float-soft">
                <div style={{ transform: 'scale(1.08)', transformOrigin: 'top center' }}>
                  <IPhoneMockup />
                </div>
              </div>
              {/* Foto ancha debajo */}
              <div className="relative z-0 w-full mt-[-24px]">
                <HeroPicWide
                  src="/landing/cutting.jpg"
                  title="Tu salón, lleno cada día"
                  sub="Contenido listo para publicar"
                />
              </div>
            </div>

            {/* ── SM+ : iMac + iPhone solapados + fotos + Bravi ── */}
            <div className="hidden sm:block relative w-full max-w-[520px]">
              {/* Fotos decorativas a los lados */}
              <HeroPic
                src="/landing/color.jpg"
                caption="Mechas que venden ✨"
                size={112}
                className="absolute float-soft"
                style={{ left: '-6%', top: '4%', transform: 'rotate(-8deg)', zIndex: 0 }}
              />
              <HeroPic
                src="/landing/transform.jpg"
                caption="Antes / Después"
                size={96}
                className="absolute"
                style={{ right: '-5%', top: '-2%', transform: 'rotate(7deg)', zIndex: 0, animation: 'float-soft 4.8s ease-in-out 0.6s infinite' }}
              />

              {/* iMac */}
              <div className="relative z-10">
                <IMacMockup />
              </div>

              {/* iPhone solapado abajo-derecha */}
              <div className="absolute z-20" style={{ right: '-4%', bottom: '-8%', transform: 'rotate(-6deg)' }}>
                <div style={{ transform: 'scale(0.85)', transformOrigin: 'bottom right' }}>
                  <IPhoneMockup />
                </div>
              </div>

              {/* Bravi bubble */}
              <div className="hidden md:block absolute z-30" style={{ top: '-10px', right: '8%' }}>
                <BraviBubble
                  size={80}
                  message="Hola, soy Bravi. Estoy aquí para ayudarte a llenar tu agenda."
                />
              </div>
            </div>

            {/* Decorative sparkles */}
            <div
              className="absolute text-2xl pointer-events-none"
              style={{ top: '4%', left: '4%', opacity: 0.5, transform: 'rotate(-12deg)' }}
            >
              ✨
            </div>
            <div
              className="absolute text-xl pointer-events-none"
              style={{ bottom: '6%', right: '6%', opacity: 0.45 }}
            >
              ✦
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}