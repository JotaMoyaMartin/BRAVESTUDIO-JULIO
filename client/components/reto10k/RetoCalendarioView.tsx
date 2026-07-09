'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, List, Layout, Flame } from 'lucide-react'
import { Profile, ContentItem } from '@/types/database'
import { Reto10kProgress } from '@/types/reto10k'
import { scheduleRetoItem } from '@/lib/content-utils'
import { useToast } from '@/components/ui/Toast'
import CalendarView from '@/components/content/CalendarView'
import RetoContentCard from './RetoContentCard'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  contentItems: ContentItem[]
  demoMode: boolean
  onChanged: () => void
}

type View = 'lista' | 'calendario'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function RetoCalendarioView({ profile, progress, contentItems, demoMode, onChanged }: Props) {
  const toast = useToast()
  const userId = profile?.id || 'demo'
  const [view, setView] = useState<View>('lista')

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
          />
          <p className="text-xs text-cherry-dark opacity-60 text-center">
            Arrastra las tarjetas para cambiar la fecha de publicación
          </p>
        </div>
      )}
    </div>
  )
}