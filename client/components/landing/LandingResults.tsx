'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'

const STATS = [
  { value: 18000, suffix: '+', label: 'Seguidores generados', emoji: '📈', color: '#7A1832' },
  { value: 1200, suffix: '+', label: 'Contenidos creados', emoji: '🎬', color: '#2a5a6a' },
  { value: 500, suffix: '+', label: 'Salones usando BRÄVE', emoji: '💇‍♀️', color: '#7a6000' },
  { value: 250000, suffix: '+', label: 'Ideas generadas', emoji: '✨', color: '#2a8a4a' },
]

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf: number
    const start = performance.now()
    const duration = 1600
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value])

  const formatted = display >= 1000
    ? display.toLocaleString('es-ES').replace(/,/g, '.')
    : String(display)

  return <span ref={ref}>{formatted}{suffix}</span>
}

export default function LandingResults() {
  return (
    <section className="relative bg-cherry py-16 lg:py-20 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute pointer-events-none" style={{ top: '-30%', right: '-5%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,241,181,0.08)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-20%', left: '-5%', width: 250, height: 250, borderRadius: '50%', background: 'rgba(193,219,232,0.08)' }} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--color-buttermilk)', letterSpacing: '-0.5px' }}>
            Lo que consiguen nuestros salones
          </h2>
          <p className="text-sm sm:text-base opacity-80" style={{ color: 'rgba(255,241,181,0.85)' }}>
            Resultados reales de estilistas que publican con BRÄVE Studio.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl mb-2">{s.emoji}</div>
              <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: 'var(--color-buttermilk)', letterSpacing: '-0.5px' }}>
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}