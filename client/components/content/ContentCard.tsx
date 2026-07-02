'use client'
import { useState } from 'react'
import { Film, LayoutGrid, MessageSquare, ChevronDown, ChevronUp, Copy, Check, Calendar, BookOpen, Trash2, RefreshCw } from 'lucide-react'
import { ContentItem } from '@/types/database'
import { copyToClipboard, formatContentForCopy, scheduleItem, unscheduleItem, deleteItem } from '@/lib/content-utils'

const TYPE_CONFIG: Record<string, { icon: typeof Film; color: string; label: string }> = {
  reel: { icon: Film, color: '#7A1832', label: 'Reel' },
  carrusel: { icon: LayoutGrid, color: '#2a5a6a', label: 'Carrusel' },
  story: { icon: MessageSquare, color: '#7a6000', label: 'Story' },
}

interface Props {
  item: ContentItem
  userId: string
  isDemoMode: boolean
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
  onRegenerate?: (item: ContentItem) => void
  onDateChange?: () => void
  expandedContent?: React.ReactNode
  showSchedule?: boolean
  showDelete?: boolean
  showRegenerate?: boolean
}

export default function ContentCard({
  item, userId, isDemoMode, selectable, selected, onSelect,
  onRegenerate, onDateChange, expandedContent,
  showSchedule = true, showDelete = true, showRegenerate = false,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [date, setDate] = useState(item.scheduled_date || '')

  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.story
  const Icon = config.icon

  async function handleCopy() {
    copyToClipboard(formatContentForCopy(item))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSchedule() {
    if (!date) return
    await scheduleItem(userId, item.id, date, isDemoMode)
    setEditingDate(false)
    onDateChange?.()
  }

  async function handleUnschedule() {
    await unscheduleItem(userId, item.id, isDemoMode)
    onDateChange?.()
  }

  async function handleDelete() {
    await deleteItem(userId, item.id, isDemoMode)
    onDateChange?.()
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)', boxShadow: '0 2px 8px rgba(90,20,39,0.05)' }}
    >
      <div className="flex items-stretch">
        {/* Checkbox (multi-select mode) */}
        {selectable && (
          <button
            onClick={() => onSelect?.(item.id)}
            className="flex items-center justify-center px-3"
            style={{ borderRight: '1px solid rgba(255,241,181,0.4)' }}
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
              style={{
                background: selected ? '#7A1832' : 'transparent',
                border: selected ? 'none' : '2px solid rgba(122,24,50,0.3)',
              }}
            >
              {selected && <Check size={12} style={{ color: 'white' }} />}
            </div>
          </button>
        )}

        {/* Main content */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 p-4 text-left flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Icon size={18} style={{ color: config.color, marginTop: 2, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-xs font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{ background: config.color, color: 'white' }}
                >
                  {config.label}
                </span>
                {item.service && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF1B5', color: '#591427' }}>
                    {item.service}
                  </span>
                )}
                {item.objective && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#591427' }}>
                    {item.objective}
                  </span>
                )}
                {item.scheduled_date && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#C1DBE8', color: '#2a5a6a' }}>
                    📅 {item.scheduled_date}
                  </span>
                )}
              </div>
              <p className="font-semibold text-sm truncate" style={{ color: '#1a1a1a' }}>{item.title}</p>
            </div>
          </div>
          {expanded ? <ChevronUp size={16} style={{ color: '#7A1832', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#7A1832', flexShrink: 0 }} />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          {expandedContent || <DefaultExpandedContent item={item} />}

          {editingDate && showSchedule && (
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
              />
              <button onClick={handleSchedule} className="btn-primary text-xs">Confirmar</button>
              <button onClick={() => setEditingDate(false)} className="btn-ghost text-xs">Cancelar</button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy} className="btn-secondary text-xs py-1.5 px-3">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? '¡Copiado!' : 'Copiar'}
            </button>
            {showSchedule && !item.scheduled_date && (
              <button onClick={() => setEditingDate(true)} className="btn-ghost text-xs py-1.5 px-3">
                <Calendar size={13} /> Programar
              </button>
            )}
            {showSchedule && item.scheduled_date && (
              <button onClick={handleUnschedule} className="btn-ghost text-xs py-1.5 px-3">
                <BookOpen size={13} /> Quitar fecha
              </button>
            )}
            {showRegenerate && onRegenerate && (
              <button onClick={() => onRegenerate(item)} className="btn-ghost text-xs py-1.5 px-3">
                <RefreshCw size={13} /> Regenerar
              </button>
            )}
            {showDelete && (
              <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto">
                <Trash2 size={14} style={{ color: '#c0394e' }} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DefaultExpandedContent({ item }: { item: ContentItem }) {
  const json = (item.content_json || {}) as Record<string, unknown>

  if (item.type === 'reel' && json.script) {
    const s = json.script as Record<string, string>
    return (
      <div className="space-y-2">
        {([['GANCHO', s.hook], ['CONTEXTO', s.context], ['SOLUCIÓN', s.solution], ['CTA', s.cta]] as const).map(([label, text]) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832' }}>{label}</span>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a1a1a' }}>{text}</p>
          </div>
        ))}
        {item.caption_with_hashtags && (
          <div className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>PUBLICACIÓN</span>
            <p className="text-xs mt-1 leading-relaxed whitespace-pre-line" style={{ color: '#1a1a1a' }}>{item.caption_with_hashtags}</p>
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
          <div key={sl.number} className="flex gap-3 p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#7A1832', color: 'white' }}>{sl.number}</div>
            <div>
              <span className="text-xs font-semibold" style={{ color: '#7A1832' }}>{sl.role}</span>
              <p className="text-sm mt-0.5 leading-relaxed" style={{ color: '#1a1a1a' }}>{sl.text}</p>
            </div>
          </div>
        ))}
        {item.caption_with_hashtags && (
          <div className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>PUBLICACIÓN</span>
            <p className="text-xs mt-1 leading-relaxed whitespace-pre-line" style={{ color: '#1a1a1a' }}>{item.caption_with_hashtags}</p>
          </div>
        )}
      </div>
    )
  }

  // Story / question
  if (item.type === 'story') {
    if (json.stories) {
      const stories = json.stories as Array<{ number: number; role: string; text: string }>
      return (
        <div className="space-y-2">
          {stories.map(s => (
            <div key={s.number} className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832' }}>Story {s.number} — {s.role}</span>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a1a1a' }}>{s.text}</p>
            </div>
          ))}
        </div>
      )
    }
    if (json.question) {
      return (
        <div className="space-y-2">
          <div className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>PREGUNTA</span>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a1a1a' }}>{json.question as string}</p>
          </div>
          {(json.answer as string) && (
            <div className="p-3 rounded-xl" style={{ background: '#C1DBE8' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#2a5a6a', opacity: 0.7 }}>RESPUESTA</span>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: '#1a3a4a' }}>{json.answer as string}</p>
            </div>
          )}
        </div>
      )
    }
  }

  return <p className="text-sm whitespace-pre-line" style={{ color: '#1a1a1a' }}>{item.caption_with_hashtags || 'Contenido guardado'}</p>
}