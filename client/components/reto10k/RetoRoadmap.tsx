'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import { RetoPhase } from '@/types/reto10k'

interface Props {
  phases: RetoPhase[]
  currentPhase: number
  onBack: () => void
}

const PHASE_COLORS = [
  { bg: '#B8D8B0', bgSoft: 'rgba(184,216,176,0.2)', text: '#2a6a3a' },
  { bg: '#7A1832', bgSoft: 'rgba(122,24,50,0.12)', text: '#7A1832' },
  { bg: '#A04060', bgSoft: 'rgba(160,64,96,0.12)', text: '#A04060' },
  { bg: '#591427', bgSoft: 'rgba(89,20,39,0.12)', text: '#591427' },
]

export default function RetoRoadmap({ phases, currentPhase, onBack }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-cherry-dark hover:opacity-70 transition-colors"
      >
        <ArrowLeft size={16} /> Volver al dashboard
      </button>

      <div>
        <h1 className="text-2xl font-bold text-cherry-dark">Roadmap del Reto 10K</h1>
        <p className="text-sm text-cherry-dark opacity-70 mt-1">
          Las 4 fases de tu transformación de 30 días
        </p>
      </div>

      {/* Bravi */}
      <div
        className="rounded-[var(--radius-md)] p-4 flex items-start gap-3"
        style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.15)' }}
      >
        <img
          src="/bravi2.png"
          alt="Bravi"
          className="flex-shrink-0 bravi-float"
          style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(89,20,39,0.15))' }}
          draggable={false}
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry opacity-70 mb-0.5">Bravi dice</p>
          <p className="text-sm text-cherry-dark">
            Cada fase tiene su propósito. Avanza paso a paso, sin prisa pero sin pausa.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div
        className="rounded-[var(--radius-lg)] p-5 sm:p-7"
        style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
      >
        <div className="relative max-w-3xl mx-auto">
          {/* Linea conectora */}
          <div
            className="absolute left-5 top-4 bottom-4 w-0.5"
            style={{
              background: 'linear-gradient(180deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)',
              opacity: 0.25,
            }}
          />
          <div className="space-y-5">
            {phases.map((phase, i) => {
              const colors = PHASE_COLORS[i % PHASE_COLORS.length]
              const completed = phase.order < currentPhase
              const active = phase.order === currentPhase
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
                  className="relative pl-14"
                >
                  {/* Círculo */}
                  <div
                    className="absolute left-0 top-5 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-soft z-10"
                    style={{
                      background: completed ? 'var(--color-pastel-green)' : colors.bg,
                      border: '3px solid var(--color-cream)',
                    }}
                  >
                    {completed ? <Check size={16} strokeWidth={4} /> : phase.emoji}
                  </div>

                  {/* Card */}
                  <div
                    className="rounded-[var(--radius-md)] overflow-hidden transition-all"
                    style={{
                      border: active ? '2px solid var(--color-cherry)' : `1.5px solid ${colors.bgSoft}`,
                      background: completed ? 'rgba(184,216,176,0.12)' : 'white',
                    }}
                  >
                    <div className="h-1.5" style={{ background: colors.bg }} />
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: colors.text, opacity: 0.75 }}
                        >
                          Fase {phase.order}
                        </span>
                        {active && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'var(--color-cherry)', color: 'white' }}
                          >
                            Fase actual
                          </span>
                        )}
                        {completed && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'var(--color-pastel-green)', color: '#2a6a3a' }}
                          >
                            <Check size={10} strokeWidth={3} /> Completada
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-base text-cherry-dark mb-1">{phase.title}</h4>
                      <p className="text-sm text-cherry-dark opacity-75 mb-3">
                        Objetivo: {phase.objective}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {phase.content.map((c, j) => (
                          <span
                            key={j}
                            className="text-xs px-2.5 py-1 rounded-full"
                            style={{ background: colors.bgSoft, color: colors.text }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}