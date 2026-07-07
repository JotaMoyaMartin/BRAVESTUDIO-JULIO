'use client'
import { useState } from 'react'
import { ContentItem } from '@/types/database'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'

export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  reel: { color: 'var(--color-cherry)', bg: 'rgba(122,24,50,0.12)', label: 'Reel' },
  carrusel: { color: '#2c5a78', bg: 'rgba(193,219,232,0.5)', label: 'Carrusel' },
  story: { color: 'var(--color-cherry-dark)', bg: 'rgba(255,241,181,0.6)', label: 'Stories' },
}

interface Props {
  items: ContentItem[]
  onItemClick?: (item: ContentItem) => void
  onItemMove?: (itemId: string, newDate: string) => void
}

interface MiniCardProps {
  item: ContentItem
  onClick?: () => void
  isDragging?: boolean
}

function MiniCard({ item, onClick, isDragging }: MiniCardProps) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.story
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-xs px-2 py-1.5 rounded-[var(--radius-sm)] truncate transition-all hover:opacity-90"
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}22`,
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : 'pointer',
      }}
    >
      <span className="font-semibold">{config.label}:</span> {item.title}
    </button>
  )
}

function DraggableMiniCard({ item, onClick }: { item: ContentItem; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="touch-none">
      <MiniCard item={item} onClick={isDragging ? undefined : onClick} isDragging={isDragging} />
    </div>
  )
}

function DroppableDay({
  dateStr,
  children,
  isToday,
  day,
}: {
  dateStr: string
  children: React.ReactNode
  isToday: boolean
  day: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr })

  return (
    <div
      ref={setNodeRef}
      className="min-h-[72px] sm:min-h-[84px] p-1 sm:p-1.5 rounded-[var(--radius-sm)] transition-colors"
      style={{
        background: isOver ? 'rgba(122,24,50,0.08)' : isToday ? 'rgba(255,241,181,0.15)' : 'transparent',
        border: `1.5px solid ${isOver ? 'var(--color-cherry)' : isToday ? 'rgba(255,241,181,0.5)' : 'rgba(255,241,181,0.2)'}`,
      }}
    >
      <div
        className="text-xs font-semibold mb-1 px-0.5"
        style={{
          color: isToday ? 'var(--color-cherry)' : 'var(--color-cherry-dark)',
          opacity: isToday ? 1 : 0.6,
        }}
      >
        {day}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export default function CalendarView({ items, onItemClick, onItemMove }: Props) {
  const [viewDate, setViewDate] = useState(new Date())
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const totalDays = new Date(year, month + 1, 0).getDate()
  // Monday-first: JS getDay returns 0=Sun..6=Sat, we want 0=Mon..6=Sun
  const rawStartDay = new Date(year, month, 1).getDay()
  const startDay = rawStartDay === 0 ? 6 : rawStartDay - 1

  const fmt = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  // Build cells: leading empties + days
  const cells: ({ day: number; dateStr: string } | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push({ day: d, dateStr: fmt(d) })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveItem(null)
    if (!over) return
    const item = active.data.current?.item as ContentItem | undefined
    if (!item) return
    const newDate = over.id as string
    if (item.scheduled_date === newDate) return
    onItemMove?.(item.id, newDate)
  }

  function handleDragStart(event: { active: { data: { current: unknown } } }) {
    const item = event.active.data.current as ContentItem | null
    setActiveItem(item)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveItem(null)}
    >
      <div className="rounded-[var(--radius-lg)] overflow-hidden bg-white shadow-soft" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
        {/* Month header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.5)' }}>
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors hover:bg-[rgba(122,24,50,0.06)] text-cherry font-bold text-lg"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <h2 className="font-bold text-base text-cherry-dark">{MONTHS[month]} {year}</h2>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors hover:bg-[rgba(122,24,50,0.06)] text-cherry font-bold text-lg"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-3 pt-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold py-1 text-cherry-dark opacity-50">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 px-3 pb-3">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e${i}`} />
            const dayItems = items.filter(it => it.scheduled_date === cell.dateStr)
            const isToday = cell.dateStr === todayStr
            return (
              <DroppableDay key={cell.day} dateStr={cell.dateStr} isToday={isToday} day={cell.day}>
                {dayItems.slice(0, 3).map(it => (
                  <DraggableMiniCard
                    key={it.id}
                    item={it}
                    onClick={() => onItemClick?.(it)}
                  />
                ))}
                {dayItems.length > 3 && (
                  <div className="text-xs px-1 text-cherry opacity-60">+{dayItems.length - 3} más</div>
                )}
              </DroppableDay>
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 rotate-2">
            <MiniCard item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}