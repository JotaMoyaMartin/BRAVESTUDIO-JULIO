'use client'

import { motion } from 'framer-motion'
import { Map, Check, Lock, Clock } from 'lucide-react'
import { Reto10kConfig, Reto10kProgress } from '@/types/reto10k'
import { computeCurrentDay } from '@/lib/reto-plan'
import RetoRoadmap from './RetoRoadmap'
import { RetoTabId } from './RetoTabs'

interface Props {
  progress: Reto10kProgress
  config: Reto10kConfig | null
  onGoToTab: (tab: RetoTabId) => void
}

export default function RetoCaminoView({ progress, config, onGoToTab }: Props) {
  const currentDay = computeCurrentDay(progress.started_at)
  const currentPhase = progress.current_phase || 1
  const phases = config?.phases || []
  const missions = config?.missions || []

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'var(--color-cherry)' }}>
          <Map size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-cherry-dark">Mi camino</h1>
          <p className="text-sm text-cherry-dark opacity-70">Las 4 fases de tu transformación</p>
        </div>
      </div>

      {/* Camino día a día */}
      <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-3">Tu recorrido · 30 días</p>
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
          {missions.map(m => {
            const done = m.day < currentDay
            const today = m.day === currentDay
            const locked = m.day > currentDay
            return (
              <button
                key={m.day}
                onClick={() => onGoToTab('dashboard')}
                className="aspect-square rounded-[var(--radius-sm)] flex flex-col items-center justify-center text-[10px] font-bold transition-all hover:scale-105"
                style={{
                  background: done ? 'var(--color-pastel-green)' : today ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                  color: done ? '#2a6a3a' : today ? 'white' : 'var(--color-cherry-dark)',
                  opacity: locked ? 0.5 : 1,
                  border: today ? '2px solid var(--color-buttermilk)' : 'none',
                }}
                title={m.title}
              >
                <span className="text-xs">{m.day}</span>
                {done && <Check size={9} strokeWidth={3} />}
                {today && <Clock size={9} />}
                {locked && <Lock size={8} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Roadmap completo */}
      <RetoRoadmap phases={phases} currentPhase={currentPhase} missions={missions} variant="full" />

      {/* Bravi */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-[var(--radius-md)] p-4 flex items-start gap-3"
        style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.15)' }}
      >
        <img src="/bravi2.png" alt="Bravi" className="flex-shrink-0 bravi-float" style={{ width: 28, height: 28, objectFit: 'contain' }} draggable={false} />
        <p className="text-sm text-cherry-dark">
          Cada fase tiene su propósito. Avanza paso a paso, sin prisa pero sin pausa. El día marcado en burdeos es tu misión de hoy.
        </p>
      </motion.div>
    </div>
  )
}