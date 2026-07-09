'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Flame, Film, TrendingUp, Check, Target, Zap } from 'lucide-react'
import { Profile, ContentItem } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RETO_LEVELS, RETO_POINTS } from '@/types/reto10k'
import { computeCurrentDay } from '@/lib/reto-plan'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  contentItems: ContentItem[]
}

export default function RetoProgresoView({ profile, progress, config, contentItems }: Props) {
  const currentDay = computeCurrentDay(progress.started_at)
  const currentPhase = progress.current_phase || 1
  const phases = config?.phases || []

  const stats = useMemo(() => {
    const retoItems = contentItems.filter(i => i.tag === 'reto-10k')
    const planificados = retoItems.filter(i => i.scheduled_date).length
    const creadas = retoItems.length
    const publicadas = retoItems.filter(i => i.reto_status === 'publicado').length
    const grabados = retoItems.filter(i => i.reto_status === 'grabado').length

    const dayKeys = new Set(retoItems.filter(i => i.created_at).map(i => new Date(i.created_at).toISOString().split('T')[0]))
    let streak = 0
    const check = new Date()
    while (dayKeys.has(check.toISOString().split('T')[0])) {
      streak++
      check.setDate(check.getDate() - 1)
    }
    return { planificados, creadas, publicadas, grabados, streak }
  }, [contentItems])

  const xp = profile?.xp_total || 0
  const level = useMemo(() => {
    let lvl = RETO_LEVELS[0]
    for (const l of RETO_LEVELS) if (xp >= l.minXp) lvl = l
    return lvl
  }, [xp])
  const nextLevel = RETO_LEVELS.find(l => l.minXp > xp)
  const levelProgress = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100

  const phasesCompleted = phases.filter(p => p.order < currentPhase).length

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'var(--color-cherry)' }}>
          <Trophy size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-cherry-dark">Mi progreso</h1>
          <p className="text-sm text-cherry-dark opacity-70">Tu evolución en el Reto 10K</p>
        </div>
      </div>

      {/* Nivel actual */}
      <div
        className="rounded-[var(--radius-md)] p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }}
      >
        <div className="absolute -right-2 -top-2 text-7xl opacity-10">{level.emoji}</div>
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">Nivel {level.id}</p>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">{level.emoji}</span> {level.name}
          </h2>
          <p className="text-sm text-white/85 mt-1">{xp} puntos acumulados</p>
          {nextLevel && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-white/80 mb-1">
                <span>{levelProgress}% hacia {nextLevel.emoji} {nextLevel.name}</span>
                <span>{nextLevel.minXp - xp} pts</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ background: 'var(--color-buttermilk)' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatBox icon={Target} value={stats.planificados} label="Planificados" color="var(--color-cherry)" />
        <StatBox icon={Film} value={stats.creadas} label="Creados" color="#2c5a78" />
        <StatBox icon={Check} value={stats.publicadas} label="Publicados" color="#2a6a3a" />
        <StatBox icon={Zap} value={stats.grabados} label="Grabados" color="#8a6d00" />
        <StatBox icon={Flame} value={`${stats.streak} días`} label="Racha" color="var(--color-cherry)" />
        <StatBox icon={TrendingUp} value={phasesCompleted} label="Fases completas" color="var(--color-cherry-dark)" />
      </div>

      {/* Sistema de puntos */}
      <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-3">Cómo ganas puntos</p>
        <div className="space-y-2">
          <PointRow emoji="🚀" label="Publicar un reel" points={`+${RETO_POINTS.publishReel}`} />
          <PointRow emoji="💡" label="Guardar una idea" points={`+${RETO_POINTS.saveIdea}`} />
          <PointRow emoji="✅" label="Completar una misión" points={`+${RETO_POINTS.completeMission}`} />
        </div>
      </div>

      {/* Niveles */}
      <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-3">Niveles del Reto</p>
        <div className="space-y-2">
          {RETO_LEVELS.map(l => {
            const reached = xp >= l.minXp
            const isCurrent = level.id === l.id
            return (
              <div
                key={l.id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] transition-all"
                style={{
                  background: isCurrent ? 'rgba(122,24,50,0.06)' : 'transparent',
                  border: isCurrent ? '1.5px solid var(--color-cherry)' : '1px solid var(--color-buttermilk)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: reached ? 'var(--color-pastel-green)' : 'var(--color-warm-gray)' }}
                >
                  {l.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-cherry-dark">Nivel {l.id}: {l.name}</p>
                  <p className="text-xs text-cherry-dark opacity-60">{l.minXp}+ puntos</p>
                </div>
                {reached && <Check size={18} className="text-pastel-green" style={{ color: '#2a6a3a' }} />}
                {isCurrent && <span className="text-[10px] font-bold uppercase text-cherry">Actual</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Logros */}
      <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-3">Logros</p>
        <div className="grid grid-cols-4 gap-2">
          <Achievement emoji="🌱" label="Empezaste" unlocked={currentDay >= 1} />
          <Achievement emoji="🔥" label="3 días racha" unlocked={stats.streak >= 3} />
          <Achievement emoji="🎥" label="5 piezas" unlocked={stats.creadas >= 5} />
          <Achievement emoji="🚀" label="1ª publicación" unlocked={stats.publicadas >= 1} />
          <Achievement emoji="⚡" label="10 piezas" unlocked={stats.creadas >= 10} />
          <Achievement emoji="📅" label="Semana 2" unlocked={currentDay >= 14} />
          <Achievement emoji="👑" label="Fase 3" unlocked={currentPhase >= 3} />
          <Achievement emoji="🏆" label="Reto completo" unlocked={currentDay >= 30} />
        </div>
      </div>
    </div>
  )
}

function StatBox({ icon: Icon, value, label, color }: { icon: typeof Film; value: number | string; label: string; color: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
      <Icon size={16} style={{ color }} className="mb-1" />
      <div className="text-xl font-bold text-cherry-dark">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-cherry-dark opacity-60">{label}</div>
    </div>
  )
}

function PointRow({ emoji, label, points }: { emoji: string; label: string; points: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{emoji}</span>
      <span className="text-sm text-cherry-dark flex-1">{label}</span>
      <span className="text-sm font-bold text-cherry">{points}</span>
    </div>
  )
}

function Achievement({ emoji, label, unlocked }: { emoji: string; label: string; unlocked: boolean }) {
  return (
    <div
      className="rounded-[var(--radius-sm)] p-2 flex flex-col items-center text-center transition-all"
      style={{
        background: unlocked ? 'rgba(184,216,176,0.2)' : 'var(--color-warm-gray)',
        opacity: unlocked ? 1 : 0.4,
        border: unlocked ? '1.5px solid var(--color-pastel-green)' : '1px solid var(--color-buttermilk)',
      }}
    >
      <span className="text-xl mb-0.5" style={{ filter: unlocked ? 'none' : 'grayscale(1)' }}>{emoji}</span>
      <span className="text-[9px] font-semibold text-cherry-dark leading-tight">{label}</span>
    </div>
  )
}