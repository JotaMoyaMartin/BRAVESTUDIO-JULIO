'use client'
import { useState } from 'react'
import { ContentItem } from '@/types/database'

export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const TYPE_COLOR: Record<string, string> = {
  reel: '#7A1832',
  carrusel: '#2a5a6a',
  story: '#7a6000',
}

interface Props {
  items: ContentItem[]
  onItemClick?: (item: ContentItem) => void
}

export default function CalendarView({ items, onItemClick }: Props) {
  const [viewDate, setViewDate] = useState(new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const startDay = new Date(year, month, 1).getDay()
  const fmt = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const unscheduled = items.filter(i => !i.scheduled_date)

  return (
    <div className="space-y-4">
      <div className="rounded-3xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        {/* Month header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.5)' }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="px-3 py-1 rounded-lg" style={{ color: '#7A1832' }}>‹</button>
          <h2 className="font-bold" style={{ color: '#1a1a1a' }}>{MONTHS[month]} {year}</h2>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="px-3 py-1 rounded-lg" style={{ color: '#7A1832' }}>›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-4 pt-3">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: '#591427', opacity: 0.6 }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 px-4 pb-4">
          {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1
            const dayItems = items.filter(it => it.scheduled_date === fmt(day))
            return (
              <div key={day} className="min-h-[60px] p-1 rounded-xl" style={{ border: '1.5px solid transparent' }}>
                <div className="text-xs font-semibold mb-1 px-1" style={{ color: '#1a1a1a' }}>{day}</div>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 2).map(it => (
                    <button
                      key={it.id}
                      onClick={() => onItemClick?.(it)}
                      className="w-full text-left text-xs px-1.5 py-0.5 rounded-lg truncate transition-all hover:opacity-80"
                      style={{ background: TYPE_COLOR[it.type] || '#7a6000', color: 'white' }}
                    >
                      {it.title}
                    </button>
                  ))}
                  {dayItems.length > 2 && <div className="text-xs px-1" style={{ color: '#7A1832' }}>+{dayItems.length - 2}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unscheduled items */}
      {unscheduled.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2" style={{ color: '#1a1a1a' }}>Sin fecha ({unscheduled.length})</h3>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map(it => (
              <span key={it.id} className="text-xs px-3 py-1.5 rounded-xl" style={{ background: '#F5F0E8', color: '#591427' }}>{it.title}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}