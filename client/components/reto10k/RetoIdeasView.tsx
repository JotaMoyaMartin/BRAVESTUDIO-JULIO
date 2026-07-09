'use client'

import { useState, useMemo } from 'react'
import { Lightbulb, Sparkles, Film, Layers, Grid, Trash2 } from 'lucide-react'
import { Profile, ContentItem, BrandProfile } from '@/types/database'
import { Reto10kProgress, Reto10kConfig, RetoCardStatus } from '@/types/reto10k'
import { generateRetos } from '@/lib/ai/prompts/reto10k'
import { buildBrandFullContext, hasBrandContext } from '@/lib/ai/brand-context'
import { saveRetoMissionItem, addXp, deleteItem } from '@/lib/content-utils'
import { useToast } from '@/components/ui/Toast'
import { RETO_POINTS } from '@/types/reto10k'
import RetoContentCard from './RetoContentCard'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  contentItems: ContentItem[]
  demoMode: boolean
  onChanged: () => void
}

type Filter = 'todas' | 'reel' | 'story' | 'carrusel'
type StatusFilter = 'all' | RetoCardStatus

const FILTERS: { id: Filter; label: string; icon: typeof Film }[] = [
  { id: 'todas', label: 'Todas', icon: Grid },
  { id: 'reel', label: 'Reels', icon: Film },
  { id: 'story', label: 'Stories', icon: Layers },
  { id: 'carrusel', label: 'Carruseles', icon: Sparkles },
]

const STATUS_FILTERS: { id: StatusFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'Todos', emoji: '📋' },
  { id: 'idea', label: 'Pendiente', emoji: '⚪' },
  { id: 'grabado', label: 'Grabado', emoji: '🟡' },
  { id: 'editado', label: 'Editado', emoji: '🔵' },
  { id: 'publicado', label: 'Publicado', emoji: '🚀' },
]

export default function RetoIdeasView({ profile, progress, config, brand, contentItems, demoMode, onChanged }: Props) {
  const toast = useToast()
  const userId = profile?.id || 'demo'
  const [filter, setFilter] = useState<Filter>('todas')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [generating, setGenerating] = useState(false)

  const retoItems = useMemo(
    () => contentItems.filter(i => i.tag === 'reto-10k'),
    [contentItems]
  )

  const filtered = useMemo(() => {
    let result = retoItems
    if (filter !== 'todas') result = result.filter(i => i.type === filter)
    if (statusFilter !== 'all') result = result.filter(i => (i.reto_status || 'idea') === statusFilter)
    return result
  }, [retoItems, filter, statusFilter])

  async function handleGenerateMore() {
    setGenerating(true)
    try {
      const output = await runGenerate()
      for (const item of output.items) {
        await saveRetoMissionItem(userId, {
          type: item.type,
          title: item.title,
          service: item.service,
          objective: item.objective,
          category: item.category,
          format: item.format,
          script: item.script || { hook: '', context: '', solution: '', cta: '' },
          caption: item.caption,
          visual_idea: item.visual_idea,
          recording_tip: '',
          day: item.day,
        }, demoMode)
      }
      if (profile && !demoMode) {
        await addXp(userId, RETO_POINTS.saveIdea, profile.xp_total || 0)
      }
      toast.show(`${output.items.length} ideas añadidas a tu banco`, 'success')
      onChanged()
    } catch {
      toast.show('No se pudo generar. Inténtalo de nuevo.', 'info')
    } finally {
      setGenerating(false)
    }
  }

  async function runGenerate() {
    const phases = config?.phases || []
    const currentPhaseData = phases.find(p => p.order === progress.current_phase) || phases[0]
    const brandContext = hasBrandContext(brand) ? buildBrandFullContext(brand as any) : undefined
    return generateRetos({
      objective: progress.objective || 'visibilidad',
      services: progress.services || [],
      level: progress.level || 'principiante',
      currentPhase: progress.current_phase || 1,
      phaseTitle: currentPhaseData?.title || '',
      currentDay: progress.current_day || 1,
      postsPerWeek: progress.posts_per_week || 4,
      brandContext,
    })
  }

  async function handleClearAll() {
    if (retoItems.length === 0) return
    if (!confirm(`¿Borrar las ${retoItems.length} ideas del Reto 10K? Esta acción no se puede deshacer.`)) return
    try {
      await Promise.all(retoItems.map(item => deleteItem(userId, item.id, demoMode)))
      toast.show('Todas las ideas eliminadas', 'info')
      onChanged()
    } catch {
      toast.show('Error al borrar', 'info')
    }
  }

  async function handleRegenerate(oldItem: ContentItem) {
    const output = await runGenerate()
    const fresh = output.items[0]
    if (!fresh) return
    // Conservar el día de misión si la tarjeta original lo tenía
    const json = oldItem.content_json as Record<string, unknown>
    const missionDay = (json?.mission_day as number) || fresh.day
    await deleteItem(userId, oldItem.id, demoMode)
    await saveRetoMissionItem(userId, {
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
    }, demoMode)
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'var(--color-cherry)' }}>
          <Lightbulb size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-cherry-dark">Mis ideas</h1>
          <p className="text-sm text-cherry-dark opacity-70">{retoItems.length} ideas guardadas</p>
        </div>
        <div className="flex items-center gap-2">
          {retoItems.length > 0 && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
              style={{ background: 'rgba(192,57,78,0.08)', color: 'var(--color-cherry)', minHeight: 40 }}
            >
              <Trash2 size={14} /> Borrar todo
            </button>
          )}
          <button
            onClick={handleGenerateMore}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-white"
            style={{ background: 'var(--color-cherry)', opacity: generating ? 0.6 : 1, minHeight: 40 }}
          >
            <Sparkles size={14} /> {generating ? 'Generando...' : 'Generar más'}
          </button>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map(({ id, label, icon: Icon }) => {
          const count = id === 'todas' ? retoItems.length : retoItems.filter(i => i.type === id).length
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: filter === id ? 'var(--color-cherry)' : 'white',
                color: filter === id ? 'white' : 'var(--color-cherry-dark)',
                border: `1.5px solid ${filter === id ? 'var(--color-cherry)' : 'var(--color-buttermilk)'}`,
              }}
            >
              <Icon size={13} /> {label} <span className="opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {STATUS_FILTERS.map(({ id, label, emoji }) => {
          const count = id === 'all' ? retoItems.length : retoItems.filter(i => (i.reto_status || 'idea') === id).length
          const active = statusFilter === id
          return (
            <button
              key={id}
              onClick={() => setStatusFilter(id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: active ? 'var(--color-cherry)' : 'white',
                color: active ? 'white' : 'var(--color-cherry-dark)',
                border: `1.5px solid ${active ? 'var(--color-cherry)' : 'var(--color-buttermilk)'}`,
              }}
            >
              <span className="text-sm leading-none">{emoji}</span> {label} <span className="opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-md)] p-8 text-center" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
          <Lightbulb size={32} className="mx-auto text-cherry opacity-40 mb-2" />
          <p className="text-sm font-semibold text-cherry-dark mb-1">Aún no tienes ideas</p>
          <p className="text-xs text-cherry-dark opacity-60 mb-4">
            Genera tu plan de 30 días o crea contenido desde la misión de hoy.
          </p>
          <button
            onClick={handleGenerateMore}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-white"
            style={{ background: 'var(--color-cherry)', opacity: generating ? 0.6 : 1 }}
          >
            <Sparkles size={15} /> {generating ? 'Generando...' : 'Generar ideas'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <RetoContentCard
              key={item.id}
              item={item}
              userId={userId}
              demoMode={demoMode}
              currentXp={profile?.xp_total || 0}
              onChanged={onChanged}
              onRegenerate={handleRegenerate}
            />
          ))}
        </div>
      )}
    </div>
  )
}