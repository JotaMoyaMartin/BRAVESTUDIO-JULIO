'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LandingCTA() {
  return (
    <section className="relative bg-warm-light py-16 lg:py-24 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute pointer-events-none" style={{ top: '10%', left: '10%', width: 200, height: 200, borderRadius: '50%', background: 'var(--color-buttermilk)', opacity: 0.3, filter: 'blur(60px)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '5%', right: '10%', width: 240, height: 240, borderRadius: '50%', background: 'var(--color-pastel-blue)', opacity: 0.2, filter: 'blur(60px)' }} />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="rounded-[var(--radius-lg)] p-8 sm:p-12 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)',
            boxShadow: 'var(--shadow-strong)',
          }}
        >
          {/* Decorative sparkles inside */}
          <div className="absolute text-2xl pointer-events-none" style={{ top: 16, left: 24, opacity: 0.3 }}>✨</div>
          <div className="absolute text-xl pointer-events-none" style={{ bottom: 20, right: 28, opacity: 0.25 }}>✦</div>

          <div className="mb-4 flex justify-center">
            <div className="rounded-full flex items-center justify-center" style={{ width: 84, height: 84, background: 'rgba(255,241,181,0.95)' }}>
              <img src="/bravi2.png" alt="Bravi" className="bravi-float" style={{ width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(89,20,39,0.25))' }} draggable={false} />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--color-buttermilk)', letterSpacing: '-0.5px' }}>
            No vuelvas a quedarte sin ideas.
          </h2>
          <p className="text-base mb-6 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Empieza gratis hoy. Bravi te espera para crear contenido que llena tu agenda.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
            >
              Quiero probar BRÄVE
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-transform hover:-translate-y-0.5"
              style={{ background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)' }}
            >
              Empezar ahora
            </Link>
          </div>

          <p className="text-xs mt-5" style={{ color: 'rgba(255,241,181,0.6)' }}>
            Prueba gratuita de 3 días · Sin permanencia · Cancela cuando quieras
          </p>
        </motion.div>
      </div>
    </section>
  )
}