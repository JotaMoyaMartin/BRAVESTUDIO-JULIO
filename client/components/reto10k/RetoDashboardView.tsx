'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, Flame, Film, TrendingUp, Sparkles, ChevronDown, RefreshCw, Calendar as CalendarIcon } from 'lucide-react'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RETO_LEVELS, RETO_POINTS } from '@/types/reto10k'
import { computeCurrentDay } from '@/lib/reto-plan'
import { generateRetos } from '@/lib/ai/prompts/reto10k'
import { buildBrandFullContext, hasBrandContext } from '@/lib/ai/brand-context'
import { saveRetoMissionItem, deleteItem, generateContentForPlaceholder } from '@/lib/content-utils'
import RetoContentCard from './RetoContentCard'
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

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const DAYS = ['dom','lun','mar','mié','jue','vie','sáb']

function isPlaceholder(item: ContentItem): boolean {
  const json = item.content_json as Record<string, unknown>
  return Boolean(json?.is_plan_placeholder)
}

function getMissionDay(item: ContentItem): number | null {
  const json = item.content_json as Record<string, unknown>
  return (json?.mission_day as number) || null
}

export default function RetoDashboardView({ profile, progress, config, brand, contentItems, demoMode, onGoToTab, onChanged }: Props) {
  const [showPlan, setShowPlan] = useState(false)
  const [guideOpen, setGuideOpen] = useState(() => {
    const publicadas = contentItems.filter(i => i.tag === 'reto-10k' && i.reto_status === 'publicado').length
    const day = progress.started_at ? computeCurrentDay(progress.started_at) : 1
    return publicadas < 2 && day <= 5
  })

  const currentDay = computeCurrentDay(progress.started_at)
  const currentPhase = progress.current_phase || 1
  const phases = config?.phases || []
  const missions = config?.missions || []
  const currentPhaseData = phases.find(p => p.order === currentPhase) || phases[0]
  const currentMission = missions.find(m => m.day === currentDay) || null
  const progressPct = Math.round((currentDay / 30) * 100)

  // ¿Existe el plan?
  const hasPlan = contentItems.some(i => i.tag === 'reto-10k')

  // Item de hoy (del plan)
  const todayItem = useMemo(() => {
    return contentItems.find(i => {
      if (i.tag !== 'reto-10k') return false
      return getMissionDay(i) === currentDay
    }) || null
  }, [contentItems, currentDay])

  const todayIsPlaceholder = todayItem ? isPlaceholder(todayItem) : false

  // Próxima misión si hoy no toca
  const nextMission = useMemo(() => {
    if (todayItem) return null
    const today = new Date().toISOString().split('T')[0]
    const upcoming = contentItems
      .filter(i => i.tag === 'reto-10k' && i.scheduled_date && i.scheduled_date >= today)
      .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))
    return upcoming[0] || null
  }, [contentItems, todayItem])

  const stats = useMemo(() => {
    const retoItems = contentItems.filter(i => i.tag === 'reto-10k')
    const creadas = retoItems.length
    const publicadas = retoItems.filter(i => i.reto_status === 'publicado').length
    const ideas = retoItems.filter(i => (i.reto_status || 'idea') === 'idea').length

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

  async function handleRegenerate(oldItem: ContentItem) {
    const phases = config?.phases || []
    const currentPhaseData = phases.find(p => p.order === progress.current_phase) || phases[0]
    const brandContext = hasBrandContext(brand) ? buildBrandFullContext(brand as any) : undefined
    const output = await generateRetos({
      objective: progress.objective || 'visibilidad',
      services: progress.services || [],
      level: progress.level || 'principiante',
      currentPhase: progress.current_phase || 1,
      phaseTitle: currentPhaseData?.title || '',
      currentDay: progress.current_day || 1,
      postsPerWeek: progress.posts_per_week || 4,
      brandContext,
    })
    const fresh = output.items[0]
    if (!fresh) return
    const json = oldItem.content_json as Record<string, unknown>
    const missionDay = (json?.mission_day as number) || fresh.day
    const oldScheduledDate = oldItem.scheduled_date
    await deleteItem(profile?.id || 'demo', oldItem.id, demoMode)
    await saveRetoMissionItem(profile?.id || 'demo', {
      type: fresh.type,
      title: fresh.title,
      service: fresh.service,
      objective: fresh.objective,
      category: fresh.category,
      format: fresh.format,
      script: fresh.script || { hook: '', context: '', solution: '', cta: '' },
      caption: fresh.caption,
      visual_idea: fresh.visual_idea,
      recording_tip: '',
      day: missionDay,
    }, demoMode, oldScheduledDate || undefined)
  }

  async function handleGenerateContent(item: ContentItem) {
    await generateContentForPlaceholder(profile?.id || 'demo', item, progress, config, brand, demoMode)
  }
  const level = useMemo(() => {
    let lvl = RETO_LEVELS[0]
    for (const l of RETO_LEVELS) if (xp >= l.minXp) lvl = l
    return lvl
  }, [xp])
  const nextLevel = RETO_LEVELS.find(l => l.minXp > xp)
  const levelProgress = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100

  // Guía según si hay plan o no
  const guideSteps = hasPlan
    ? [
        { num: 1, emoji: '📅', title: 'Tu plan está listo', text: 'Tienes 30 misiones estratégicas asignadas, una por día, según tu frecuencia de publicación.' },
        { num: 2, emoji: '✨', title: 'Crea el contenido de hoy', text: 'Abre la misión de hoy y genera el reel completo: guion, copy para Instagram e idea visual.' },
        { num: 3, emoji: '🚀', title: 'Publica y márcalo aquí', text: `Sube tu reel a Instagram y pulsa "Marcar como publicado". Solo esto suma ${RETO_POINTS.publishReel} XP y cuenta para tu progreso.` },
      ]
    : [
        { num: 1, emoji: '📅', title: 'Genera tu plan de 30 días', text: 'Crea tu calendario con una misión estratégica para cada día. El plan se distribuye solito según tu frecuencia.' },
        { num: 2, emoji: '✨', title: 'Crea el contenido de cada día', text: 'Cada día, abre la misión de hoy y genera el reel completo: guion, copy e idea visual.' },
        { num: 3, emoji: '🚀', title: 'Publica y márcalo aquí', text: `Sube tu reel a Instagram y pulsa "Marcar como publicado". Solo esto cuenta para tu progreso.` },
      ]

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

      {/* Guía visual (colapsable) */}
      <div className="rounded-[var(--radius-md)] overflow-hidden" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
        <button
          onClick={() => setGuideOpen(o => !o)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <span className="text-sm font-bold text-cherry-dark">Cómo funciona el Reto 10K</span>
          </div>
          <ChevronDown
            size={18}
            className="text-cherry opacity-60 transition-transform"
            style={{ transform: guideOpen ? 'rotate(180deg)' : 'none' }}
          />
        </button>
        <AnimatePresence>
          {guideOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {guideSteps.map((step) => (
                  <div
                    key={step.num}
                    className="flex gap-3 items-start rounded-[var(--radius-sm)] p-3"
                    style={{ background: 'var(--color-warm-light)', border: '1px solid var(--color-buttermilk)' }}
                  >
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ background: 'var(--color-cherry)', color: 'white' }}
                    >
                      {step.num}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-cherry-dark flex items-center gap-1.5">
                        <span>{step.emoji}</span> {step.title}
                      </p>
                      <p className="text-xs text-cherry-dark opacity-70 leading-relaxed mt-0.5">{step.text}</p>
                    </div>
                  </div>
                ))}
                <div
                  className="rounded-[var(--radius-sm)] p-3 flex items-center gap-2"
                  style={{ background: 'rgba(184,216,176,0.15)', border: '1px solid rgba(42,106,58,0.25)' }}
                >
                  <Rocket size={16} className="text-cherry flex-shrink-0" />
                  <p className="text-xs text-cherry-dark">
                    <strong>Solo publicar cuenta para el reto.</strong> Ni grabar, ni editar, ni guardar ideas suman puntos.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Si NO hay plan: solo hero CTA ── */}
      {!hasPlan && (
        <div
          className="rounded-[var(--radius-md)] p-6 text-center"
          style={{ background: 'linear-gradient(135deg, var(--color-buttermilk) 0%, var(--color-warm-light) 100%)', border: '2px solid var(--color-cherry)' }}
        >
          <div className="text-4xl mb-3">📅</div>
          <h2 className="text-lg font-bold text-cherry-dark mb-2">Empieza por tu plan de 30 días</h2>
          <p className="text-sm text-cherry-dark opacity-70 mb-4 max-w-sm mx-auto">
            Bravi creará un calendario con una misión estratégica para cada día. Tú solo sigues el plan y publicas.
          </p>
          <button
            onClick={() => setShowPlan(true)}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all glow-ready"
            style={{ background: 'var(--color-cherry)', minHeight: 48 }}
          >
            <Rocket size={18} /> Generar mi plan de 30 días
          </button>
        </div>
      )}

      {/* ── Si hay plan: stats + progreso + misión de hoy ── */}
      {hasPlan && (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BigStat icon={Flame} value={`${stats.streak} días`} label="Racha creando" emoji="🔥" />
            <BigStat icon={Film} value={stats.creadas} label="Piezas creadas" emoji="🎥" />
            <BigStat icon={TrendingUp} value={stats.publicadas} label="Publicadas" emoji="🚀" />
            <BigStat icon={Sparkles} value={xp} label="Puntos" emoji="⭐" />
          </div>

          {/* Barras de progreso */}
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

          {/* Roadmap compacto */}
          <RetoRoadmap
            phases={phases}
            currentPhase={currentPhase}
            variant="compact"
            onPhaseClick={() => onGoToTab('camino')}
          />

          {/* ── Recomendación de hoy ── */}
          {todayItem && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70">
                  Recomendación de hoy · Día {currentDay}
                </p>
                <button
                  onClick={() => onGoToTab('ideas')}
                  className="text-[10px] font-semibold text-cherry"
                >
                  Ver todas →
                </button>
              </div>
              <RetoContentCard
                item={todayItem}
                userId={profile?.id || 'demo'}
                demoMode={demoMode}
                currentXp={xp}
                onChanged={onChanged}
                onRegenerate={handleRegenerate}
                onGenerateContent={handleGenerateContent}
              />
            </div>
          )}

          {!todayItem && nextMission && (
            <div
              className="rounded-[var(--radius-md)] p-4 flex items-center gap-3"
              style={{ background: 'var(--color-warm-light)', border: '1.5px solid var(--color-buttermilk)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'white' }}>
                <CalendarIcon size={18} className="text-cherry opacity-60" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-cherry-dark">Hoy no toca publicación</p>
                <p className="text-xs text-cherry-dark opacity-70">
                  Próxima: {nextMission.title}
                  {nextMission.scheduled_date && <> · {formatDate(nextMission.scheduled_date)}</>}
                </p>
              </div>
              <button
                onClick={() => onGoToTab('calendario')}
                className="text-xs font-semibold text-cherry whitespace-nowrap"
              >
                Calendario →
              </button>
            </div>
          )}

          {!todayItem && !nextMission && hasPlan && (
            <div
              className="rounded-[var(--radius-md)] p-4 text-center"
              style={{ background: 'var(--color-warm-light)', border: '1.5px solid var(--color-buttermilk)' }}
            >
              <p className="text-sm font-semibold text-cherry-dark">Has completado las 30 misiones del Reto 🎉</p>
            </div>
          )}

          {/* Botón discreto: Regenerar plan */}
          <button
            onClick={() => setShowPlan(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-cherry-dark opacity-50 hover:opacity-80 transition-all"
          >
            <RefreshCw size={12} /> Regenerar plan
          </button>
        </>
      )}

      {showPlan && (
        <RetoPlanGenerator
          profile={profile}
          progress={progress}
          config={config}
          brand={brand}
          demoMode={demoMode}
          onDone={() => { setShowPlan(false); onChanged(); onGoToTab('calendario') }}
          onClose={() => setShowPlan(false)}
        />
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
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