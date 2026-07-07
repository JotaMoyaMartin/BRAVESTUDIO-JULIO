'use client'
import { Trophy } from 'lucide-react'

interface Achievement {
  id: string
  label: string
  desc: string
  emoji: string
  unlocked: boolean
}

interface AchievementsCarouselProps {
  achievements: Achievement[]
}

export default function AchievementsCarousel({ achievements }: AchievementsCarouselProps) {
  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} style={{ color: 'var(--color-cherry)' }} />
        <p className="text-sm font-semibold text-ink">
          Logros — {unlockedCount}/{achievements.length}
        </p>
      </div>
      <div
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x-carousel pb-1 -mx-1 px-1"
      >
        {achievements.map(a => (
          <div
            key={a.id}
            className="snap-item flex-shrink-0 w-28 p-3 rounded-[var(--radius-md)] text-center"
            style={{
              background: a.unlocked ? 'var(--color-buttermilk)' : 'var(--color-warm-gray)',
              opacity: a.unlocked ? 1 : 0.5,
            }}
          >
            <div className="text-2xl mb-1">{a.emoji}</div>
            <p className="text-xs font-semibold leading-tight text-cherry-dark">{a.label}</p>
            <p className="text-xs leading-tight text-cherry-dark opacity-60 mt-0.5" style={{ fontSize: '10px' }}>
              {a.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}