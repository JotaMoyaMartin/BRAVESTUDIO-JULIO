'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { RetoPhase, RetoMission } from '@/types/reto10k'

interface Props {
  mission: RetoMission
  phase: RetoPhase | undefined
  onGenerate: () => void
}

export default function RetoMissionDay({ mission, phase, onGenerate }: Props) {
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
            Tu misión de hoy · Día {mission.day}
          </p>
          <h3 className="font-bold text-base text-cherry-dark">{mission.title}</h3>
        </div>
      </div>

      <p className="text-sm text-cherry-dark opacity-80 leading-relaxed mb-2">{mission.description}</p>

      {mission.prompt_hint && (
        <div
          className="rounded-[var(--radius-sm)] p-3 mb-3"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(122,24,50,0.1)' }}
        >
          <p className="text-xs text-cherry-dark opacity-70 italic">{mission.prompt_hint}</p>
        </div>
      )}

      <button
        onClick={onGenerate}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-white transition-all"
        style={{ background: 'var(--color-cherry)' }}
      >
        <Sparkles size={15} /> Generar contenido para esta misión
      </button>
    </motion.div>
  )
}