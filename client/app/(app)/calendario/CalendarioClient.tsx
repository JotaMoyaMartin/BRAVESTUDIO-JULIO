'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { List as ListIcon, Calendar as CalendarIcon, RefreshCw, BookOpen, Sparkles, Copy, Check, Calendar, Trash2, X, Library } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ContentItem } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { demoGetPlan, demoUpdatePlan, demoDeletePlan } from '@/lib/demo-store'
import CalendarView, { MONTHS } from '@/components/content/CalendarView'
import BraviGuide from '@/components/bravi/BraviGuide'
import { useToast } from '@/components/ui/Toast'
import {
  copyToClipboard,
  formatContentForCopy,
  scheduleItem,
  unscheduleItem,
  deleteItem,
  duplicateToLibrary,
} from '@/lib/content-utils'

interface Props {
  userId: string
  items: ContentItem[]
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  reel: { color: 'var(--color-cherry)', bg: 'rgba(122,24,50,0.12)', label: 'Reel' },
  carrusel: { color: '#2c5a78', bg: 'rgba(193,219,232,0.5)', label: 'Carrusel' },
  story: { color: 'var(--color-cherry-dark)', bg: 'rgba(255,241,181,0.6)', label: 'Stories' },
}

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const WEEKDAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`
}

function shortBadge(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return { day: '--', month: '---' }
  return { day: String(d.getDate()), month: MONTH_ABBR[d.getMonth()] }
}

export default function CalendarioClient({ userId, items: initialItems }: Props) {
  const isDemoMode = userId === 'demo'
  const { show: showToast } = useToast()
  const [view, setView] = useState<'lista' | 'calendario'>('calendario')
  const [items, setItems] = useState<ContentItem[]>(initialItems)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [editDate, setEditDate] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearing, setClearing] = useState(false)

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

  useEffect(() => {
    if (isDemoMode) refresh()
  }, [isDemoMode, refresh])

  const sorted = [...items].sort((a, b) => {
    const da = a.scheduled_date || ''
    const db = b.scheduled_date || ''
    return da < db ? -1 : da > db ? 1 : 0
  })

  // Group by date for list view
  const grouped: { date: string; items: ContentItem[] }[] = []
  for (const item of sorted) {
    const date = item.scheduled_date || 'sin-fecha'
    let group = grouped.find(g => g.date === date)
    if (!group) {
      group = { date, items: [] }
      grouped.push(group)
    }
    group.items.push(item)
  }

  async function handleMove(itemId: string, newDate: string) {
    if (isDemoMode) {
      demoUpdatePlan(itemId, { scheduled_date: newDate, status: 'scheduled' })
    } else {
      const supabase = createClient()
      await supabase.from('content_items')
        .update({ scheduled_date: newDate, status: 'scheduled' })
        .eq('id', itemId)
    }
    await refresh()
    showToast(`Contenido movido al ${dateLabel(newDate)}`)
  }

  async function handleCopy(item: ContentItem) {
    copyToClipboard(formatContentForCopy(item))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showToast('Contenido copiado')
  }

  async function handleChangeDate() {
    if (!selectedItem || !newDate) return
    await scheduleItem(userId, selectedItem.id, newDate, isDemoMode)
    setEditDate(false)
    setNewDate('')
    showToast(`Contenido movido al ${dateLabel(newDate)}`)
    await refresh()
    // Update modal with new data
    const updated = (await getItems()).find(i => i.id === selectedItem.id)
    if (updated) setSelectedItem(updated)
  }

  async function getItems(): Promise<ContentItem[]> {
    if (isDemoMode) {
      return demoGetPlan().filter(i => !!i.scheduled_date) as ContentItem[]
    }
    const supabase = createClient()
    const { data } = await supabase.from('content_items').select('*').eq('user_id', userId).not('scheduled_date', 'is', null)
    return (data as ContentItem[]) || []
  }

  async function handleDuplicateToLibrary() {
    if (!selectedItem) return
    await duplicateToLibrary(userId, selectedItem, isDemoMode)
    showToast('Contenido duplicado a Biblioteca')
  }

  async function handleDelete() {
    if (!selectedItem) return
    await deleteItem(userId, selectedItem.id, isDemoMode)
    setSelectedItem(null)
    showToast('Contenido eliminado', 'info')
    await refresh()
  }

  async function handleUnschedule() {
    if (!selectedItem) return
    await unscheduleItem(userId, selectedItem.id, isDemoMode)
    setSelectedItem(null)
    showToast('Contenido enviado a Biblioteca')
    await refresh()
  }

  async function handleClearCalendar() {
    if (items.length === 0) return
    setClearing(true)
    try {
      if (isDemoMode) {
        for (const it of items) {
          demoUpdatePlan(it.id, { scheduled_date: null, status: 'library' })
        }
      } else {
        const supabase = createClient()
        await supabase.from('content_items')
          .update({ scheduled_date: null, status: 'library' })
          .eq('user_id', userId)
          .not('scheduled_date', 'is', null)
      }
      setConfirmingClear(false)
      await refresh()
      showToast('Calendario limpiado · contenido enviado a Biblioteca')
    } catch (e) {
      console.error('Error al limpiar calendario:', e)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <BraviGuide section="calendario" size={56} />
          <div>
            <h1 className="text-2xl font-bold text-ink">Calendario</h1>
            <p className="text-sm text-cherry-dark opacity-70">
              {sorted.length} {sorted.length === 1 ? 'contenido programado' : 'contenidos programados'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sorted.length > 0 && (
            <button
              onClick={() => setConfirmingClear(true)}
              disabled={isDemoMode}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all bg-[var(--color-warm-gray)] text-cherry"
              style={{ opacity: isDemoMode ? 0.4 : 1 }}
              title={isDemoMode ? 'Disponible en modo completo' : 'Quita todas las fechas y envía el contenido a la Biblioteca'}
            >
              <Trash2 size={14} /> <span className="hidden sm:inline">Limpiar calendario</span>
            </button>
          )}
          <button
            onClick={refresh}
            className="p-2 rounded-[var(--radius-sm)] transition-transform hover:scale-105 bg-[var(--color-warm-gray)] text-cherry"
            aria-label="Actualizar"
            title="Actualizar"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Toggle Lista / Calendario */}
          <div className="flex p-1 rounded-full bg-[var(--color-warm-gray)]">
            <button
              onClick={() => setView('lista')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: view === 'lista' ? 'var(--color-cherry)' : 'transparent',
                color: view === 'lista' ? 'white' : 'var(--color-cherry-dark)',
              }}
            >
              <ListIcon size={14} /> <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setView('calendario')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: view === 'calendario' ? 'var(--color-cherry)' : 'transparent',
                color: view === 'calendario' ? 'white' : 'var(--color-cherry-dark)',
              }}
            >
              <CalendarIcon size={14} /> <span className="hidden sm:inline">Calendario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty state + calendar always visible */}
      {sorted.length === 0 && (
        <div
          className="rounded-[var(--radius-md)] p-5 flex items-start gap-4"
          style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.12)' }}
        >
          <BraviGuide section="calendario" size={72} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-cherry-dark">
              Todavía no tienes contenido programado.
            </p>
            <p className="text-sm mt-1 text-cherry-dark opacity-70">
              Cuando guardes una idea con fecha, aparecerá aquí. Arrastra las tarjetas entre días para organizar tu calendario.
            </p>
            <div className="flex gap-2 mt-3">
              <Link
                href="/planificar"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-transform hover:scale-105 bg-cherry text-white"
              >
                <Sparkles size={14} /> Crear planificación
              </Link>
              <Link
                href="/biblioteca"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-colors bg-white text-cherry-dark hover:bg-[var(--color-warm-gray)]"
                style={{ border: '1.5px solid rgba(122,24,50,0.18)' }}
              >
                <BookOpen size={14} /> Ir a Biblioteca
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Calendar view — ALWAYS show */}
      {view === 'calendario' && (
        <CalendarView items={sorted} onItemClick={setSelectedItem} onItemMove={handleMove} />
      )}

      {/* List view — grouped by date */}
      {view === 'lista' && (
        <div className="space-y-6">
          {sorted.length === 0 && (
            <div className="text-center py-8 text-cherry-dark opacity-50 text-sm">
              Cambia a vista Calendario o programa contenido desde la Biblioteca.
            </div>
          )}
          {grouped.map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex flex-col items-center justify-center px-3 py-1.5 rounded-[var(--radius-sm)] flex-shrink-0"
                  style={{ background: 'var(--color-pastel-blue)' }}
                >
                  {(() => {
                    const b = shortBadge(group.date)
                    return <>
                      <span className="text-base font-bold leading-none" style={{ color: '#2c5a78' }}>{b.day}</span>
                      <span className="text-xs font-semibold" style={{ color: '#2c5a78' }}>{b.month}</span>
                    </>
                  })()}
                </div>
                <h3 className="text-sm font-semibold text-cherry-dark capitalize">
                  {dateLabel(group.date)}
                </h3>
              </div>
              <div className="space-y-2 ml-1">
                {group.items.map(item => {
                  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.story
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-white text-left transition-all hover:shadow-soft"
                      style={{ border: '1.5px solid var(--color-buttermilk)' }}
                    >
                      <span
                        className="text-xs font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: config.color, color: 'white' }}
                      >
                        {config.label}
                      </span>
                      <span className="flex-1 text-sm font-medium text-ink truncate">{item.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmación limpiar calendario */}
      <AnimatePresence>
        {confirmingClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(89,20,39,0.4)' }}
            onClick={() => !clearing && setConfirmingClear(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="rounded-[var(--radius-md)] p-6 max-w-sm w-full text-center"
              style={{ background: 'var(--color-cream)', border: '1.5px solid var(--color-cherry)' }}
            >
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#fde8e8' }}>
                <Trash2 size={22} style={{ color: 'var(--color-cherry)' }} />
              </div>
              <h3 className="font-bold text-base text-cherry-dark mb-1">¿Limpiar el calendario?</h3>
              <p className="text-xs text-cherry-dark opacity-70 mb-5">
                Se quitarán las fechas de <strong>{sorted.length}</strong> contenidos y volverán a tu Biblioteca sin programar. No se borran, solo se desprograman.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setConfirmingClear(false)}
                  disabled={clearing}
                  className="btn-ghost text-sm py-2.5 px-5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearCalendar}
                  disabled={clearing}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white py-2.5 px-5 rounded-[var(--radius-sm)]"
                  style={{ background: 'var(--color-cherry)', opacity: clearing ? 0.65 : 1 }}
                >
                  <Trash2 size={14} /> {clearing ? 'Limpiando...' : 'Sí, limpiar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => { setSelectedItem(null); setEditDate(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[var(--radius-lg)] shadow-strong w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 sticky top-0 bg-white border-b border-soft z-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ background: TYPE_CONFIG[selectedItem.type]?.color || 'var(--color-cherry)', color: 'white' }}
                  >
                    {TYPE_CONFIG[selectedItem.type]?.label || 'Contenido'}
                  </span>
                  {selectedItem.service && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-buttermilk text-cherry-dark">{selectedItem.service}</span>
                  )}
                  {selectedItem.objective && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-warm-gray)] text-cherry-dark">{selectedItem.objective}</span>
                  )}
                </div>
                <button onClick={() => { setSelectedItem(null); setEditDate(false) }} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-warm-gray)]">
                  <X size={18} className="text-cherry" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4">
                <h2 className="text-lg font-bold text-ink">{selectedItem.title}</h2>

                {selectedItem.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm text-cherry-dark">
                    <Calendar size={15} />
                    <span>{dateLabel(selectedItem.scheduled_date)}</span>
                  </div>
                )}

                {/* Full content */}
                <ContentDetail item={selectedItem} />

                {/* Change date inline */}
                {editDate ? (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] text-sm outline-none bg-cream border-[1.5px] border-soft focus:border-cherry"
                    />
                    <button onClick={handleChangeDate} className="btn-primary text-xs" disabled={!newDate}>Confirmar</button>
                    <button onClick={() => setEditDate(false)} className="btn-ghost text-xs">Cancelar</button>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-soft">
                  <button onClick={() => handleCopy(selectedItem)} className="btn-secondary text-xs py-2 px-3">
                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button onClick={() => { setEditDate(true); setNewDate(selectedItem.scheduled_date || '') }} className="btn-ghost text-xs py-2 px-3">
                    <Calendar size={13} /> Cambiar fecha
                  </button>
                  <button onClick={handleDuplicateToLibrary} className="btn-ghost text-xs py-2 px-3">
                    <Library size={13} /> Duplicar a Biblioteca
                  </button>
                  <button onClick={handleUnschedule} className="btn-ghost text-xs py-2 px-3">
                    <BookOpen size={13} /> Enviar a Biblioteca
                  </button>
                  <button onClick={handleDelete} className="p-2 rounded-[var(--radius-sm)] hover:bg-[rgba(192,57,78,0.08)] ml-auto">
                    <Trash2 size={14} className="text-danger" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Content detail renderer for the modal ──

function ContentDetail({ item }: { item: ContentItem }) {
  const json = (item.content_json || {}) as Record<string, unknown>

  if (item.type === 'reel' && json.script) {
    const s = json.script as Record<string, string>
    return (
      <div className="space-y-2">
        {([['GANCHO', s.hook], ['CONTEXTO', s.context], ['SOLUCIÓN', s.solution], ['CTA', s.cta]] as const).map(([label, text]) => (
          <div key={label} className="p-3 rounded-[var(--radius-sm)] bg-cream" style={{ border: '1px solid var(--color-buttermilk)' }}>
            <span className="text-xs font-bold uppercase tracking-wider text-cherry opacity-60">{label}</span>
            <p className="text-sm mt-1 leading-relaxed text-ink">{text}</p>
          </div>
        ))}
        {item.caption_with_hashtags && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-cream" style={{ border: '1px solid var(--color-buttermilk)' }}>
            <span className="text-xs font-bold uppercase tracking-wider text-cherry opacity-60">PUBLICACIÓN</span>
            <p className="text-xs mt-1 leading-relaxed whitespace-pre-line text-ink">{item.caption_with_hashtags}</p>
          </div>
        )}
        {item.visual_idea && (
          <div className="p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-pastel-blue)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#2c5a78' }}>IDEA VISUAL</span>
            <p className="text-sm mt-1" style={{ color: '#1a3a4a' }}>{item.visual_idea}</p>
          </div>
        )}
      </div>
    )
  }

  if (item.type === 'carrusel' && json.slides) {
    const slides = json.slides as Array<{ number: number; role: string; text: string }>
    return (
      <div className="space-y-2">
        {slides.map(sl => (
          <div key={sl.number} className="flex gap-3 p-3 rounded-[var(--radius-sm)] bg-cream" style={{ border: '1px solid var(--color-buttermilk)' }}>
            <div className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-xs font-bold flex-shrink-0 bg-cherry text-white">{sl.number}</div>
            <div>
              <span className="text-xs font-semibold text-cherry">{sl.role}</span>
              <p className="text-sm mt-0.5 leading-relaxed text-ink">{sl.text}</p>
            </div>
          </div>
        ))}
        {item.caption_with_hashtags && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-cream" style={{ border: '1px solid var(--color-buttermilk)' }}>
            <span className="text-xs font-bold uppercase tracking-wider text-cherry opacity-60">PUBLICACIÓN</span>
            <p className="text-xs mt-1 leading-relaxed whitespace-pre-line text-ink">{item.caption_with_hashtags}</p>
          </div>
        )}
        {item.visual_idea && (
          <div className="p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-pastel-blue)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#2c5a78' }}>IDEA VISUAL</span>
            <p className="text-sm mt-1" style={{ color: '#1a3a4a' }}>{item.visual_idea}</p>
          </div>
        )}
      </div>
    )
  }

  if (item.type === 'story') {
    if (json.stories) {
      const stories = json.stories as Array<{ number: number; role: string; text: string }>
      return (
        <div className="space-y-2">
          {stories.map(s => (
            <div key={s.number} className="p-3 rounded-[var(--radius-sm)] bg-cream" style={{ border: '1px solid var(--color-buttermilk)' }}>
              <span className="text-xs font-bold uppercase tracking-wider text-cherry">Story {s.number} — {s.role}</span>
              <p className="text-sm mt-1 leading-relaxed text-ink">{s.text}</p>
            </div>
          ))}
          {item.visual_idea && (
            <div className="p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-pastel-blue)' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#2c5a78' }}>IDEA VISUAL</span>
              <p className="text-sm mt-1" style={{ color: '#1a3a4a' }}>{item.visual_idea}</p>
            </div>
          )}
        </div>
      )
    }
    if (json.question) {
      return (
        <div className="space-y-2">
          <div className="p-3 rounded-[var(--radius-sm)] bg-cream" style={{ border: '1px solid var(--color-buttermilk)' }}>
            <span className="text-xs font-bold uppercase tracking-wider text-cherry opacity-60">PREGUNTA</span>
            <p className="text-sm mt-1 leading-relaxed text-ink">{json.question as string}</p>
          </div>
          {(json.answer as string) && (
            <div className="p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-pastel-blue)' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#2c5a78', opacity: 0.7 }}>RESPUESTA</span>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a3a4a' }}>{json.answer as string}</p>
            </div>
          )}
        </div>
      )
    }
  }

  return <p className="text-sm whitespace-pre-line text-ink">{item.caption_with_hashtags || 'Contenido guardado'}</p>
}