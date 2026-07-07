'use client'
import { motion } from 'framer-motion'

interface LevelBarProps {
  level: number
  levelLabel: string
  emoji: string
  total: number
  progress: number
}

export default function LevelBar({ level, levelLabel, emoji, total, progress }: LevelBarProps) {
  return (
    <div
      className="rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3"
      style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
    >
      <div
        className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: 'var(--color-buttermilk)' }}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs font-semibold text-ink truncate">
            Nivel {level} · {levelLabel}
          </p>
          <span className="text-xs font-bold text-cherry flex-shrink-0">{total} XP</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--color-cherry), var(--color-cherry-light))' }}
          />
        </div>
      </div>
    </div>
  )
}