'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { List as ListIcon, Calendar as CalendarIcon, RefreshCw, BookOpen } from 'lucide-react'
import { ContentItem } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { demoGetPlan } from '@/lib/demo-store'
import ContentCard from '@/components/content/ContentCard'
import CalendarView from '@/components/content/CalendarView'
import BraviMascot from '@/components/bravi/BraviMascot'

interface Props {
  userId: string
  items: ContentItem[]
}

const TYPE_COLOR: Record<string, string> = {
  reel: '#7A1832',
  carrusel: '#2a5a6a',
  story: '#7a6000',
}

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function dateBadge(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return { day: '--', month: '---' }
  return { day: String(d.getDate()), month: MONTH_ABBR[d.getMonth()] }
}

export default function CalendarioClient({ userId, items: initialItems }: Props) {
  const isDemoMode = userId === 'demo'
  const [view, setView] = useState<'lista' | 'calendario'>('lista')
  const [items, setItems] = useState<ContentItem[]>(initialItems)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    if (isDemoMode) {
      const plan = demoGetPlan()
      const scheduled = plan
        .filter((i) => !!i.scheduled_date)
        .sort((a, b) => (a.scheduled_date! < b.scheduled_date! ? -1 : 1))
      setItems(scheduled as ContentItem[])
      return
    }
    setRefreshing(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('content_items')
        .select('*')
        .eq('user_id', userId)
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true })
      setItems((data as ContentItem[]) || [])
    } finally {
      setRefreshing(false)
    }
  }, [userId, isDemoMode])

  // On mount, demo mode may have items in localStorage that weren't available SSR.
  useEffect(() => {
    if (isDemoMode) {
      refresh()
    }
  }, [isDemoMode, refresh])

  const sorted = [...items].sort((a, b) => {
    const da = a.scheduled_date || ''
    const db = b.scheduled_date || ''
    return da < db ? -1 : da > db ? 1 : 0
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Calendario</h1>
          <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>
            {sorted.length} {sorted.length === 1 ? 'contenido programado' : 'contenidos programados'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-xl transition-transform hover:scale-105"
            style={{ background: '#F5F0E8', color: '#7A1832' }}
            aria-label="Actualizar"
            title="Actualizar"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Toggle Lista / Calendario */}
          <div
            className="flex p-1 rounded-full"
            style={{ background: '#F5F0E8' }}
          >
            <button
              onClick={() => setView('lista')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: view === 'lista' ? '#7A1832' : 'transparent',
                color: view === 'lista' ? 'white' : '#591427',
              }}
            >
              <ListIcon size={14} /> Lista
            </button>
            <button
              onClick={() => setView('calendario')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: view === 'calendario' ? '#7A1832' : 'transparent',
                color: view === 'calendario' ? 'white' : '#591427',
              }}
            >
              <CalendarIcon size={14} /> Calendario
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="flex flex-col items-center text-center py-12 px-6">
          <BraviMascot size={120} mood="thinking" />
          <p className="mt-4 text-sm font-medium" style={{ color: '#1a1a1a' }}>
            No tienes contenido programado.
          </p>
          <p className="text-sm mt-1" style={{ color: '#591427', opacity: 0.7 }}>
            Ve a Biblioteca y asigna fechas a tu contenido.
          </p>
          <Link
            href="/biblioteca"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-transform hover:scale-105"
            style={{ background: '#7A1832', color: 'white' }}
          >
            <BookOpen size={15} /> Ir a Biblioteca
          </Link>
        </div>
      )}

      {/* List view */}
      {sorted.length > 0 && view === 'lista' && (
        <div className="space-y-3">
          {sorted.map((item) => {
            const badge = item.scheduled_date ? dateBadge(item.scheduled_date) : null
            return (
              <div key={item.id} className="flex items-stretch gap-3">
                {/* Date badge */}
                {badge && (
                  <div
                    className="flex flex-col items-center justify-center px-3 py-2 rounded-2xl flex-shrink-0 min-w-[64px]"
                    style={{ background: '#C1DBE8' }}
                  >
                    <span className="text-lg font-bold leading-none" style={{ color: '#2a5a6a' }}>{badge.day}</span>
                    <span className="text-xs font-semibold mt-0.5" style={{ color: '#2a5a6a' }}>{badge.month}</span>
                  </div>
                )}
                {/* Card */}
                <div className="flex-1 min-w-0">
                  <ContentCard
                    item={item}
                    userId={userId}
                    isDemoMode={isDemoMode}
                    onDateChange={refresh}
                    showSchedule={true}
                    showDelete={true}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar view */}
      {sorted.length > 0 && view === 'calendario' && (
        <CalendarView items={sorted} onItemClick={() => {}} />
      )}
    </div>
  )
}