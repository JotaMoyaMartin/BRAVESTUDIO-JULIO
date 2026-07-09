'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Target, Lightbulb } from 'lucide-react'
import { Profile, BrandProfile } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RetoPhase, RetoMission } from '@/types/reto10k'
import RetoMissionGenerator from './RetoMissionGenerator'

interface Props {
  mission: RetoMission
  phase: RetoPhase | undefined
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  demoMode: boolean
  placeholderId?: string | null
  placeholderScheduledDate?: string | null
  onChanged?: () => void
}

export default function RetoMissionDay({ mission, phase, profile, progress, config, brand, demoMode, placeholderId, placeholderScheduledDate, onChanged }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-[var(--radius-md)] p-5"
      style={{
        background: 'linear-gradient(135deg, var(--color-buttermilk) 0%, var(--color-warm-light) 100%)',
        border: '2px solid var(--color-cherry)',
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: 'white' }}
        >
          {phase?.emoji || '✨'}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-0.5">
            Misión de hoy · Día {mission.day}
          </p>
          <h3 className="font-bold text-base text-cherry-dark">{mission.title}</h3>
        </div>
      </div>

      {/* Objetivo */}
      <div className="rounded-[var(--radius-sm)] p-3 mb-2 flex items-start gap-2" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(122,24,50,0.1)' }}>
        <Target size={14} className="text-cherry mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70">Objetivo</p>
          <p className="text-sm text-cherry-dark opacity-90">{mission.description}</p>
        </div>
      </div>

      {/* Inspiración */}
      {mission.prompt_hint && (
        <div className="rounded-[var(--radius-sm)] p-3 mb-3 flex items-start gap-2" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(122,24,50,0.1)' }}>
          <Lightbulb size={14} className="text-cherry mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70">Inspiración</p>
            <p className="text-xs text-cherry-dark opacity-80 italic">{mission.prompt_hint}</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all glow-ready"
        style={{ background: 'var(--color-cherry)', minHeight: 44 }}
      >
        <Sparkles size={16} /> {open ? 'Cerrar generador' : 'Crear mi contenido de esta misión'}
      </button>

      <AnimatePresence>
        {open && (
          <div className="mt-3">
            <RetoMissionGenerator
              profile={profile}
              progress={progress}
              config={config}
              brand={brand}
              mission={mission}
              phaseTitle={phase?.title || ''}
              demoMode={demoMode}
              placeholderId={placeholderId}
              placeholderScheduledDate={placeholderScheduledDate}
              onChanged={onChanged}
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}