'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { RetoPhase, RetoMission } from '@/types/reto10k'

interface Props {
  phases: RetoPhase[]
  currentPhase: number
  missions?: RetoMission[]
  variant?: 'compact' | 'full'
  onPhaseClick?: (phase: RetoPhase) => void
}

const PHASE_COLORS = [
  { bg: '#B8D8B0', bgSoft: 'rgba(184,216,176,0.2)', text: '#2a6a3a' },
  { bg: '#7A1832', bgSoft: 'rgba(122,24,50,0.12)', text: '#7A1832' },
  { bg: '#A04060', bgSoft: 'rgba(160,64,96,0.12)', text: '#A04060' },
  { bg: '#591427', bgSoft: 'rgba(89,20,39,0.12)', text: '#591427' },
]

export default function RetoRoadmap({ phases, currentPhase, missions = [], variant = 'full', onPhaseClick }: Props) {
  if (variant === 'compact') {
    return <CompactRoadmap phases={phases} currentPhase={currentPhase} onPhaseClick={onPhaseClick} />
  }
  return <FullRoadmap phases={phases} currentPhase={currentPhase} missions={missions} onPhaseClick={onPhaseClick} />
}

// ── Compact: horizontal, siempre visible en dashboard ────────────────

function CompactRoadmap({ phases, currentPhase, onPhaseClick }: {
  phases: RetoPhase[]
  currentPhase: number
  onPhaseClick?: (phase: RetoPhase) => void
}) {
  return (
    <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-3">Tu camino · 4 fases</p>
      <div className="relative">
        {/* Línea conectora */}
        <div
          className="absolute top-5 left-5 right-5 h-0.5"
          style={{ background: 'linear-gradient(90deg, var(--color-pastel-green) 0%, var(--color-cherry) 100%)', opacity: 0.3 }}
        />
        <div className="flex items-start justify-between gap-1 relative">
          {phases.map((phase, i) => {
            const colors = PHASE_COLORS[i % PHASE_COLORS.length]
            const completed = phase.order < currentPhase
            const active = phase.order === currentPhase
            const locked = phase.order > currentPhase
            return (
              <button
                key={i}
                onClick={() => onPhaseClick?.(phase)}
                className="flex flex-col items-center gap-1.5 flex-1 group"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all group-hover:scale-110"
                  style={{
                    background: completed ? 'var(--color-pastel-green)' : active ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                    border: active ? '3px solid var(--color-buttermilk)' : '2px solid white',
                    boxShadow: active ? '0 0 0 2px var(--color-cherry)' : 'none',
                  }}
                >
                  {completed ? <Check size={16} strokeWidth={4} /> : locked ? <Lock size={13} /> : <span className="text-base">{phase.emoji}</span>}
                </div>
                <span
                  className="text-[9px] font-semibold text-center leading-tight"
                  style={{ color: active ? 'var(--color-cherry)' : 'var(--color-cherry-dark)', opacity: active ? 1 : 0.6 }}
                >
                  {phase.title.split(' ').slice(0, 3).join(' ')}…
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Full: vertical, para tab "Mi camino" ──────────────────────────────

function FullRoadmap({ phases, currentPhase, missions, onPhaseClick }: {
  phases: RetoPhase[]
  currentPhase: number
  missions: RetoMission[]
  onPhaseClick?: (phase: RetoPhase) => void
}) {
  const [expanded, setExpanded] = useState<number | null>(currentPhase)

  return (
    <div className="rounded-[var(--radius-lg)] p-5 sm:p-7" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
      <div className="relative max-w-3xl mx-auto">
        {/* Línea conectora */}
        <div
          className="absolute left-5 top-4 bottom-4 w-0.5"
          style={{
            background: 'linear-gradient(180deg, var(--color-pastel-green) 0%, var(--color-cherry) 50%, var(--color-cherry-dark) 100%)',
            opacity: 0.25,
          }}
        />
        <div className="space-y-4">
          {phases.map((phase, i) => {
            const colors = PHASE_COLORS[i % PHASE_COLORS.length]
            const completed = phase.order < currentPhase
            const active = phase.order === currentPhase
            const isOpen = expanded === phase.order
            const phaseMissions = missions.filter(m => m.phase === phase.order)
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
                <button
                  onClick={() => setExpanded(isOpen ? null : phase.order)}
                  className="absolute left-0 top-3 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-soft z-10 transition-transform hover:scale-110"
                  style={{
                    background: completed ? 'var(--color-pastel-green)' : colors.bg,
                    border: '3px solid var(--color-cream)',
                  }}
                >
                  {completed ? <Check size={16} strokeWidth={4} /> : <span className="text-base">{phase.emoji}</span>}
                </button>

                {/* Card */}
                <div
                  className="rounded-[var(--radius-md)] overflow-hidden transition-all cursor-pointer"
                  style={{
                    border: active ? '2px solid var(--color-cherry)' : `1.5px solid ${colors.bgSoft}`,
                    background: completed ? 'rgba(184,216,176,0.12)' : 'white',
                  }}
                  onClick={() => setExpanded(isOpen ? null : phase.order)}
                >
                  <div className="h-1.5" style={{ background: colors.bg }} />
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text, opacity: 0.75 }}>
                        Fase {phase.order}
                      </span>
                      {active && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-cherry)', color: 'white' }}>
                          En progreso
                        </span>
                      )}
                      {completed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-pastel-green)', color: '#2a6a3a' }}>
                          <Check size={10} strokeWidth={3} /> Completada
                        </span>
                      )}
                      {phase.order > currentPhase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', opacity: 0.6 }}>
                          <Lock size={9} /> Bloqueada
                        </span>
                      )}
                      <ChevronDown
                        size={16}
                        className="ml-auto text-cherry-dark opacity-40 transition-transform"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                      />
                    </div>
                    <h4 className="font-bold text-base text-cherry-dark mb-1">{phase.title}</h4>
                    <p className="text-sm text-cherry-dark opacity-75 mb-3">
                      <strong className="opacity-90">Objetivo:</strong> {phase.objective}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {phase.content.map((c, j) => (
                        <span key={j} className="text-xs px-2.5 py-1 rounded-full" style={{ background: colors.bgSoft, color: colors.text }}>
                          {c}
                        </span>
                      ))}
                    </div>

                    {/* Misiones de la fase (expandible) */}
                    <AnimatePresence>
                      {isOpen && phaseMissions.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: '1px dashed rgba(122,24,50,0.15)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-60 mb-2">
                              Misiones · {phaseMissions.length} días
                            </p>
                            {phaseMissions.map(m => (
                              <div key={m.day} className="flex items-center gap-2 text-xs">
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                                  style={{
                                    background: m.day < currentPhase * 7 ? 'var(--color-pastel-green)' : 'var(--color-warm-gray)',
                                    color: m.day < currentPhase * 7 ? '#2a6a3a' : 'var(--color-cherry-dark)',
                                  }}
                                >
                                  {m.day}
                                </span>
                                <span className="text-cherry-dark opacity-80">{m.title}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}