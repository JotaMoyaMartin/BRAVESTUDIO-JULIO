'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Rocket, Flame, Film, TrendingUp, Sparkles } from 'lucide-react'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RETO_LEVELS } from '@/types/reto10k'
import { computeCurrentDay } from '@/lib/reto-plan'
import RetoMissionDay from './RetoMissionDay'
import RetoRoadmap from './RetoRoadmap'
import RetoPlanGenerator from './RetoPlanGenerator'
import { RetoTabId } from './RetoTabs'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  contentItems: ContentItem[]
  demoMode: boolean
  onGoToTab: (tab: RetoTabId) => void
  onChanged: () => void
}

export default function RetoDashboardView({ profile, progress, config, brand, contentItems, demoMode, onGoToTab, onChanged }: Props) {
  const [showPlan, setShowPlan] = useState(false)

  const currentDay = computeCurrentDay(progress.started_at)
  const currentPhase = progress.current_phase || 1
  const phases = config?.phases || []
  const missions = config?.missions || []
  const currentPhaseData = phases.find(p => p.order === currentPhase) || phases[0]
  const currentMission = missions.find(m => m.day === currentDay) || null
  const progressPct = Math.round((currentDay / 30) * 100)

  // Placeholder del plan para la misión de hoy (para actualizarlo al generar contenido)
  const currentPlaceholderId = useMemo(() => {
    const ph = contentItems.find(i => {
      if (i.tag !== 'reto-10k') return false
      const json = i.content_json as Record<string, unknown>
      return json?.is_plan_placeholder === true && json?.mission_day === currentDay
    })
    return ph?.id || null
  }, [contentItems, currentDay])

  const stats = useMemo(() => {
    const retoItems = contentItems.filter(i => i.tag === 'reto-10k')
    const creadas = retoItems.length
    const publicadas = retoItems.filter(i => i.reto_status === 'publicado').length
    const ideas = retoItems.filter(i => (i.reto_status || 'idea') === 'idea').length

    // Racha: días consecutivos con al menos un item creado
    const dayKeys = new Set(retoItems.filter(i => i.created_at).map(i => new Date(i.created_at).toISOString().split('T')[0]))
    let streak = 0
    const check = new Date()
    while (dayKeys.has(check.toISOString().split('T')[0])) {
      streak++
      check.setDate(check.getDate() - 1)
    }
    return { creadas, publicadas, ideas, streak }
  }, [contentItems])

  const xp = profile?.xp_total || 0
  const level = useMemo(() => {
    let lvl = RETO_LEVELS[0]
    for (const l of RETO_LEVELS) if (xp >= l.minXp) lvl = l
    return lvl
  }, [xp])
  const nextLevel = RETO_LEVELS.find(l => l.minXp > xp)
  const levelProgress = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div
        className="rounded-[var(--radius-md)] p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }}
      >
        <div className="absolute -right-4 -top-4 text-6xl opacity-10">🚀</div>
        <div className="relative">
          <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.5px' }}>
            Reto 10K 🚀
          </h1>
          <p className="text-sm text-white/85 mt-0.5">
            De estilista invisible a referente del sector en 30 días creando contenido estratégico.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              DÍA {currentDay} / 30
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
              {level.emoji} {level.name}
            </span>
          </div>
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigStat icon={Flame} value={`${stats.streak} días`} label="Racha creando" emoji="🔥" />
        <BigStat icon={Film} value={stats.creadas} label="Piezas creadas" emoji="🎥" />
        <BigStat icon={TrendingUp} value={stats.publicadas} label="Publicadas" emoji="🚀" />
        <BigStat icon={Sparkles} value={xp} label="Puntos" emoji="⭐" />
      </div>

      {/* Barra de progreso del reto */}
      <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
        <div className="flex items-center justify-between text-xs font-semibold text-cherry-dark mb-2">
          <span>Progreso del Reto</span>
          <span>{progressPct}% · Día {currentDay}/30</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }}
          />
        </div>
        {nextLevel && (
          <p className="text-[10px] text-cherry-dark opacity-60 mt-2">
            {levelProgress}% hacia {nextLevel.emoji} {nextLevel.name} · {nextLevel.minXp - xp} puntos
          </p>
        )}
        {/* Barra de publicadas: se actualiza al marcar Publicado 🚀 */}
        <div className="flex items-center justify-between text-xs font-semibold text-cherry-dark mt-3 mb-1.5">
          <span>Publicadas 🚀</span>
          <span>{stats.publicadas} / {Math.max(30, stats.creadas)}</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (stats.publicadas / Math.max(30, stats.creadas)) * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #2a6a3a 0%, #3a8a4a 100%)' }}
          />
        </div>
      </div>

      {/* Roadmap compacto siempre visible */}
      <RetoRoadmap
        phases={phases}
        currentPhase={currentPhase}
        variant="compact"
        onPhaseClick={() => onGoToTab('camino')}
      />

      {/* Misión del día */}
      {currentMission && (
        <RetoMissionDay
          mission={currentMission}
          phase={currentPhaseData}
          profile={profile}
          progress={progress}
          config={config}
          brand={brand}
          demoMode={demoMode}
          placeholderId={currentPlaceholderId}
        />
      )}

      {/* CTA Plan de 30 días */}
      <button
        onClick={() => setShowPlan(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-[var(--radius-md)] text-sm font-bold text-white transition-all glow-ready"
        style={{ background: 'linear-gradient(135deg, var(--color-cherry-light) 0%, var(--color-cherry) 100%)', minHeight: 48 }}
      >
        <Rocket size={18} /> Generar mi plan de 30 días
      </button>

      {showPlan && (
        <RetoPlanGenerator
          profile={profile}
          progress={progress}
          config={config}
          demoMode={demoMode}
          onDone={() => { setShowPlan(false); onChanged(); onGoToTab('calendario') }}
          onClose={() => setShowPlan(false)}
        />
      )}
    </div>
  )
}

function BigStat({ icon: Icon, value, label, emoji }: { icon: typeof Film; value: number | string; label: string; emoji: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
      <div className="flex items-center justify-between mb-1">
        <Icon size={16} className="text-cherry opacity-60" />
        <span className="text-base">{emoji}</span>
      </div>
      <div className="text-xl font-bold text-cherry-dark">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-cherry-dark opacity-60 mt-0.5">{label}</div>
    </div>
  )
}