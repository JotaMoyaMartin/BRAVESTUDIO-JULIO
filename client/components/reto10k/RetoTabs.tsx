'use client'

import { motion } from 'framer-motion'
import { Rocket, Map, Lightbulb, Calendar, Trophy } from 'lucide-react'

export type RetoTabId = 'dashboard' | 'camino' | 'ideas' | 'calendario' | 'progreso'

interface Props {
  active: RetoTabId
  onChange: (tab: RetoTabId) => void
  ideaCount?: number
}

const TABS: { id: RetoTabId; label: string; icon: typeof Rocket }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Rocket },
  { id: 'camino', label: 'Mi camino', icon: Map },
  { id: 'ideas', label: 'Mis ideas', icon: Lightbulb },
  { id: 'calendario', label: 'Mi calendario', icon: Calendar },
  { id: 'progreso', label: 'Mi progreso', icon: Trophy },
]

export default function RetoTabs({ active, onChange, ideaCount = 0 }: Props) {
  return (
    <div
      className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-3 mb-4"
      style={{
        background: 'linear-gradient(180deg, var(--color-cream) 80%, rgba(255,253,245,0) 100%)',
        borderBottom: '1.5px solid rgba(255,241,181,0.6)',
      }}
    >
      <div
        className="flex gap-1.5 overflow-x-auto no-scrollbar rounded-[var(--radius-md)] p-1.5"
        style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
              style={{
                color: isActive ? 'white' : 'var(--color-cherry-dark)',
                background: isActive ? 'var(--color-cherry)' : 'transparent',
                minHeight: 36,
              }}
            >
              <Icon size={15} />
              {label}
              {id === 'ideas' && ideaCount > 0 && (
                <span
                  className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                  style={{
                    background: isActive ? 'white' : 'var(--color-cherry)',
                    color: isActive ? 'var(--color-cherry)' : 'white',
                  }}
                >
                  {ideaCount}
                </span>
              )}
              {isActive && (
                <motion.span
                  layoutId="reto-tab-active"
                  className="absolute inset-0 rounded-[var(--radius-sm)] -z-10"
                  style={{ background: 'var(--color-cherry)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}