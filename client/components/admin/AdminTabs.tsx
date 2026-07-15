'use client'

import { ReactNode } from 'react'

export type TabKey = 'dashboard' | 'analitica' | 'usuarios' | 'codigos' | 'planes' | 'suscripciones' | 'soporte' | 'inspiracion' | 'transiciones' | 'reto10k' | 'academia'

interface AdminTabsProps {
  active: TabKey
  onChange: (tab: TabKey) => void
  counts?: Partial<Record<TabKey, number>>
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'analitica', label: 'Analítica' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'codigos', label: 'Códigos' },
  { key: 'planes', label: 'Planes' },
  { key: 'suscripciones', label: 'Suscripciones' },
  { key: 'inspiracion', label: 'Inspiración Reels' },
  { key: 'transiciones', label: 'Transiciones Reels' },
  { key: 'reto10k', label: 'Reto 10K' },
  { key: 'academia', label: 'Academia' },
  { key: 'soporte', label: 'Soporte' },
]

export default function AdminTabs({ active, onChange, counts }: AdminTabsProps) {
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-[var(--radius-md)] p-1.5"
      style={{ background: 'var(--color-warm-gray)' }}
    >
      {TABS.map(tab => {
        const isActive = tab.key === active
        const count = counts?.[tab.key]
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-all duration-200 whitespace-nowrap"
            style={{
              background: isActive ? 'var(--color-cherry)' : 'transparent',
              color: isActive ? 'white' : 'var(--color-cherry-dark)',
              opacity: isActive ? 1 : 0.65,
            }}
          >
            {tab.label}
            {typeof count === 'number' && count > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-buttermilk)',
                  color: isActive ? 'white' : 'var(--color-cherry-dark)',
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}