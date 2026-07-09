'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, List, Layout, Flame, X } from 'lucide-react'
import { Profile, ContentItem, BrandProfile } from '@/types/database'
import { Reto10kProgress, Reto10kConfig } from '@/types/reto10k'
import { scheduleRetoItem, saveRetoMissionItem, deleteItem } from '@/lib/content-utils'
import { generateRetos } from '@/lib/ai/prompts/reto10k'
import { buildBrandFullContext, hasBrandContext } from '@/lib/ai/brand-context'
import { useToast } from '@/components/ui/Toast'
import CalendarView from '@/components/content/CalendarView'
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

type View = 'lista' | 'calendario'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function RetoCalendarioView({ profile, progress, config, brand, contentItems, demoMode, onChanged }: Props) {
  const toast = useToast()
  const userId = profile?.id || 'demo'
  const [view, setView] = useState<View>('lista')
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)

  const retoItems = useMemo(
    () => contentItems.filter(i => i.tag === 'reto-10k'),
    [contentItems]
  )

  const sortedByDate = useMemo(() => {
    return [...retoItems].sort((a, b) => {
      const da = a.scheduled_date || '9999'
      const db = b.scheduled_date || '9999'
      return da.localeCompare(db)
    })
  }, [retoItems])

  async function handleItemMove(itemId: string, newDate: string) {
    try {
      await scheduleRetoItem(userId, itemId, newDate, demoMode)
      toast.show('Fecha actualizada', 'success')
      onChanged()
    } catch {
      toast.show('Error al mover', 'info')
    }
  }

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
    }, demoMode, oldScheduledDate || undefined)
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'var(--color-cherry)' }}>
          <CalendarIcon size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-cherry-dark">Mi calendario</h1>
          <p className="text-sm text-cherry-dark opacity-70">{retoItems.length} contenidos del Reto</p>
        </div>
        {/* Toggle vista */}
        <div className="flex rounded-[var(--radius-sm)] p-1" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
          <button
            onClick={() => setView('lista')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
            style={{ background: view === 'lista' ? 'var(--color-cherry)' : 'transparent', color: view === 'lista' ? 'white' : 'var(--color-cherry-dark)' }}
          >
            <List size={13} /> Lista
          </button>
          <button
            onClick={() => setView('calendario')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
            style={{ background: view === 'calendario' ? 'var(--color-cherry)' : 'transparent', color: view === 'calendario' ? 'white' : 'var(--color-cherry-dark)' }}
          >
            <Layout size={13} /> Calendario
          </button>
        </div>
      </div>

      {/* Vista lista */}
      {view === 'lista' && (
        <div className="space-y-3">
          {sortedByDate.length === 0 ? (
            <div className="rounded-[var(--radius-md)] p-8 text-center" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}>
              <CalendarIcon size={32} className="mx-auto text-cherry opacity-40 mb-2" />
              <p className="text-sm font-semibold text-cherry-dark mb-1">Tu calendario está vacío</p>
              <p className="text-xs text-cherry-dark opacity-60">Genera tu plan de 30 días desde el Dashboard.</p>
            </div>
          ) : (
            sortedByDate.map(item => (
              <div key={item.id} className="flex gap-3">
                {/* Fecha lateral */}
                <div className="flex-shrink-0 w-16 text-center pt-2">
                  {item.scheduled_date ? (
                    <>
                      <p className="text-[10px] font-bold uppercase text-cherry opacity-60">
                        {MONTHS[new Date(item.scheduled_date + 'T00:00:00').getMonth()].slice(0, 3)}
                      </p>
                      <p className="text-2xl font-bold text-cherry-dark leading-none">
                        {new Date(item.scheduled_date + 'T00:00:00').getDate()}
                      </p>
                      <p className="text-[9px] text-cherry-dark opacity-50 mt-0.5">
                        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(item.scheduled_date + 'T00:00:00').getDay()]}
                      </p>
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--color-warm-gray)' }}>
                      <Flame size={16} className="text-cherry opacity-40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <RetoContentCard
                    item={item}
                    userId={userId}
                    demoMode={demoMode}
                    currentXp={profile?.xp_total || 0}
                    onChanged={onChanged}
                    onRegenerate={handleRegenerate}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Vista calendario */}
      {view === 'calendario' && (
        <div className="space-y-3">
          <CalendarView
            items={retoItems}
            onItemMove={handleItemMove}
            onItemClick={(item) => setSelectedItem(item)}
          />
          <p className="text-xs text-cherry-dark opacity-60 text-center">
            Arrastra las tarjetas para cambiar la fecha de publicación
          </p>
        </div>
      )}
      {/* Modal de ficha al pulsar un item del calendario */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedItem(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)]"
              style={{ background: 'var(--color-cream)' }}
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
              >
                <X size={16} className="text-cherry" />
              </button>
              <div className="p-4">
                <RetoContentCard
                  item={selectedItem}
                  userId={userId}
                  demoMode={demoMode}
                  currentXp={profile?.xp_total || 0}
                  onChanged={onChanged}
                  onRegenerate={handleRegenerate}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}