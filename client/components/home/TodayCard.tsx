'use client'
import Link from 'next/link'
import { Clapperboard, CalendarCheck, Clock, Sparkles, Star, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { TodayDecision, TodayKind } from '@/lib/home-today'

const KIND_ICON: Record<TodayKind, typeof Star> = {
  marca: Star,
  'reto-mision': Clapperboard,
  'reto-continuar': Clapperboard,
  'publicar-hoy': CalendarCheck,
  continuar: Clock,
  sugerencia: Sparkles,
}

// ACCIÓN PRINCIPAL de Home v2 — debe dominar visualmente (PRODUCT §6.1).
// Brevi vive dentro: flota y saluda — marca el recuadro como "lo importante".
export default function TodayCard({ decision, retoNote }: { decision: TodayDecision; retoNote?: boolean }) {
  const Icon = KIND_ICON[decision.kind]

  return (
    <div
      className="rounded-[var(--radius-lg)] p-6 sm:p-8"
      style={{
        // Amarillo de marca (el de los chips de acción): la recomendación del
        // día debe llamarse a la vista sobre el fondo crema de la app.
        background: 'var(--color-buttermilk)',
        border: '2px solid var(--color-cherry)',
        boxShadow: '0 10px 30px -18px rgba(122,24,50,0.35)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-cherry)' }}
          >
            <Icon size={21} className="text-white" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60">
            Recomendado para hoy · {decision.timeLabel}
          </p>
        </div>
        {/* Brevi: se balancea (framer-motion, cero conflicto con SSR) */}
        <motion.img
          src="/bravi2.png"
          alt="Brevi"
          draggable={false}
          aria-hidden
          animate={{ y: [0, -7, 0], rotate: [0, -6, 3, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 sm:w-16 sm:h-16 object-contain flex-shrink-0 -my-2"
          style={{ filter: 'drop-shadow(0 3px 6px rgba(89,20,39,0.22))' }}
        />
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-ink mt-4" style={{ letterSpacing: '-0.5px' }}>
        {decision.title}
      </h2>
      <p className="text-sm text-cherry-dark opacity-70 mt-1.5">{decision.reason}</p>

      <div className="flex items-center gap-4 flex-wrap mt-5">
        <Link
          href={decision.ctaHref}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-transform hover:scale-[1.03]"
          style={{ background: 'var(--color-cherry)' }}
        >
          {decision.ctaLabel} <ArrowRight size={15} />
        </Link>
      </div>

      {retoNote && (
        <p className="text-xs text-cherry-dark opacity-55 mt-4">
          Esta acción también cuenta para tu Reto 10K.
        </p>
      )}
    </div>
  )
}