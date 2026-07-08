'use client'

import { useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Rocket, BookOpen, Sparkles, Calendar, Film } from 'lucide-react'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RetoPhase, RetoMission } from '@/types/reto10k'
import { useSessionState } from '@/lib/session-store'
import RetoMissionDay from './RetoMissionDay'
import RetoRoadmap from './RetoRoadmap'
import RetoWeeklyGenerator from './RetoWeeklyGenerator'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  contentItems: ContentItem[]
  demoMode: boolean
}

function computeCurrentDay(startedAt: string | null): number {
  if (!startedAt) return 1
  const now = Date.now()
  const start = new Date(startedAt).getTime()
  const elapsed = Math.floor((now - start) / 86400000)
  return Math.max(1, Math.min(30, elapsed + 1))
}

export default function RetoDashboard({ profile, progress, config, brand, contentItems, demoMode }: Props) {
  const userId = profile?.id || 'demo'
  const [view, setView] = useState<'dashboard' | 'roadmap'>('dashboard')
  const [generating, setGenerating] = useSessionState(`u:${userId}:reto10k:generating`, false)
  const [generateTrigger, setGenerateTrigger] = useState(0)
  const generatorRef = useRef<HTMLDivElement>(null)

  const currentDay = computeCurrentDay(progress.started_at)
  const currentPhase = progress.current_phase || 1
  const totalItems = contentItems.length
  const scheduledItems = contentItems.filter(i => i.scheduled_date && i.status === 'scheduled').length
  const savedItems = contentItems.filter(i => i.status === 'library').length

  // Compute streak: consecutive days with at least one item created
  const streak = useMemo(() => {
    if (contentItems.length === 0) return 0
    const dayKeys = new Set(
      contentItems
        .filter(i => i.created_at)
        .map(i => new Date(i.created_at).toISOString().split('T')[0])
    )
    let s = 0
    const check = new Date()
    while (dayKeys.has(check.toISOString().split('T')[0])) {
      s++
      check.setDate(check.getDate() - 1)
    }
    return s
  }, [contentItems])

  const phases = config?.phases || []
  const missions = config?.missions || []
  const currentPhaseData = phases.find(p => p.order === currentPhase) || phases[0]
  const currentMission = missions.find(m => m.day === currentDay) || null

  const progressPct = Math.round((currentDay / 30) * 100)

  if (view === 'roadmap') {
    return <RetoRoadmap phases={phases} currentPhase={currentPhase} onBack={() => setView('dashboard')} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cherry-dark" style={{ letterSpacing: '-0.5px' }}>
            Reto 10K
          </h1>
          <p className="text-sm text-cherry-dark opacity-70 mt-0.5">
            Día {currentDay} de 30 · {currentPhaseData?.title || ''}
          </p>
        </div>
        <div
          className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center"
          style={{ background: 'var(--color-cherry)' }}
        >
          <Rocket size={24} className="text-white" />
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="rounded-[var(--radius-md)] p-5"
        style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
      >
        <div className="flex items-center justify-between text-xs font-semibold text-cherry-dark mb-2">
          <span>Progreso del Reto</span>
          <span>{progressPct}% · Día {currentDay}/30</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }}
          />
        </div>
        {/* Phase dots */}
        <div className="flex items-center justify-between mt-3">
          {phases.map((p: RetoPhase, i: number) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: p.order < currentPhase ? 'var(--color-pastel-green)' : p.order === currentPhase ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                  color: p.order === currentPhase ? 'white' : 'var(--color-cherry-dark)',
                }}
              >
                {p.order < currentPhase ? 'V' : p.emoji}
              </div>
              <span className="text-[9px] text-cherry-dark opacity-60 text-center hidden sm:block">Fase {p.order}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Contenido creado" value={totalItems} icon={Film} />
        <StatCard label="Guardadas" value={savedItems} icon={BookOpen} />
        <StatCard label="Programadas" value={scheduledItems} icon={Calendar} />
        <StatCard label="Días consecutivos" value={streak} icon={Sparkles} />
      </div>

      {/* Mission del día */}
      {currentMission && (
        <RetoMissionDay
          mission={currentMission}
          phase={currentPhaseData}
          onGenerate={() => setGenerateTrigger(t => t + 1)}
        />
      )}

      {/* Generador semanal */}
      <div ref={generatorRef}>
        <RetoWeeklyGenerator
          progress={progress}
          config={config}
          brand={brand}
          profile={profile}
          generating={generating}
          setGenerating={setGenerating}
          contentItems={contentItems}
          demoMode={demoMode}
          generateTrigger={generateTrigger}
          containerRef={generatorRef}
          mission={currentMission}
        />
      </div>

      {/* Ver roadmap */}
      <button
        onClick={() => setView('roadmap')}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-md)] text-sm font-semibold text-cherry-dark transition-all hover:bg-warm-light"
        style={{ border: '1.5px solid var(--color-buttermilk)' }}
      >
        <BookOpen size={16} /> Ver Roadmap completo del Reto
      </button>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Film }) {
  return (
    <div
      className="rounded-[var(--radius-sm)] p-3 text-center"
      style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
    >
      <Icon size={18} className="mx-auto text-cherry opacity-60" />
      <div className="text-xl font-bold text-cherry mt-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-cherry-dark opacity-60 mt-0.5">{label}</div>
    </div>
  )
}