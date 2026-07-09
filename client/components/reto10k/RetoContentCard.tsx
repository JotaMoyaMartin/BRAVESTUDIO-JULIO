'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Calendar as CalendarIcon, Trash2, RefreshCw, Check, Film, Copy, Video, ChevronDown, BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { ContentItem } from '@/types/database'
import { RetoCardStatus } from '@/types/reto10k'
import { setRetoStatus, scheduleRetoItem, deleteItem } from '@/lib/content-utils'
import { useToast } from '@/components/ui/Toast'
import { RETO_POINTS } from '@/types/reto10k'

interface Props {
  item: ContentItem
  userId: string
  demoMode: boolean
  currentXp: number
  onChanged?: () => void
  onRegenerate?: (item: ContentItem) => Promise<void>
}

const STATUS_META: Record<RetoCardStatus, { label: string; emoji: string; color: string; bg: string }> = {
  idea: { label: 'Pendiente', emoji: '⚪', color: 'var(--color-cherry-dark)', bg: 'var(--color-warm-gray)' },
  grabado: { label: 'Grabado', emoji: '🟡', color: '#8a6d00', bg: 'rgba(255,241,181,0.6)' },
  editado: { label: 'Editado', emoji: '🔵', color: '#2c5a78', bg: 'rgba(44,90,120,0.12)' },
  publicado: { label: 'Publicado', emoji: '🚀', color: '#2a6a3a', bg: 'rgba(184,216,176,0.3)' },
}

// Mapeo legible de pilares (y fallback para categorías antiguas)
const PILLAR_LABELS: Record<string, string> = {
  autoridad: 'Autoridad',
  viralidad: 'Viralidad',
  educacion: 'Educación',
  deseo: 'Deseo',
  dolor: 'Dolor',
  objecion: 'Objeción',
  // fallback de categorías antiguas
  resultados: 'Resultados',
  conexion: 'Conexión',
}

function isPlanPlaceholder(item: ContentItem): boolean {
  const json = item.content_json as Record<string, unknown>
  return Boolean(json?.is_plan_placeholder)
}

function getRecordingTip(item: ContentItem): string | null {
  const json = item.content_json as Record<string, unknown>
  return (json?.recording_tip as string) || null
}

function getScript(item: ContentItem): { hook: string; context: string; solution: string; cta: string } | null {
  const json = item.content_json as Record<string, unknown>
  const s = json?.script as Record<string, string> | undefined
  if (!s) return null
  return { hook: s.hook, context: s.context, solution: s.solution, cta: s.cta }
}

export default function RetoContentCard({ item, userId, demoMode, currentXp, onChanged, onRegenerate }: Props) {
  const toast = useToast()
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(item.scheduled_date || '')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showFullCopy, setShowFullCopy] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const retoStatus = (item.reto_status as RetoCardStatus) || 'idea'
  const statusMeta = STATUS_META[retoStatus]
  const script = getScript(item)
  const recordingTip = getRecordingTip(item)
  const placeholder = isPlanPlaceholder(item)
  const json = item.content_json as Record<string, unknown>
  const category = (json?.category as string) || ''
  const missionDay = (json?.mission_day as number) || null
  const pilarLabel = PILLAR_LABELS[category] || category

  function flashCopied(key: string) {
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1800)
  }

  async function handleStatusChange(newStatus: RetoCardStatus) {
    setShowStatusMenu(false)
    if (newStatus === retoStatus) return
    try {
      await setRetoStatus(userId, item.id, newStatus, demoMode, currentXp)
      if (newStatus === 'publicado' && !demoMode) {
        toast.show(`¡Publicado! +${RETO_POINTS.publishReel} XP`, 'success')
      } else {
        toast.show(`Estado: ${STATUS_META[newStatus].label}`, 'success')
      }
      onChanged?.()
    } catch {
      toast.show('Error al actualizar', 'info')
    }
  }

  async function handleSchedule() {
    if (!scheduleDate) return
    try {
      await scheduleRetoItem(userId, item.id, scheduleDate, demoMode)
      toast.show('Programado en tu calendario', 'success')
      setShowSchedule(false)
      onChanged?.()
    } catch {
      toast.show('Error al programar', 'info')
    }
  }

  async function handleSaveToLibrary() {
    try {
      // Mover a biblioteca general manteniendo tag del reto
      const { createClient } = await import('@/lib/supabase/client')
      if (demoMode) {
        const { demoUpdatePlan } = await import('@/lib/demo-store')
        demoUpdatePlan(item.id, { status: 'library' })
      } else {
        await createClient().from('content_items').update({ status: 'library' }).eq('id', item.id)
      }
      toast.show('Guardado en tu biblioteca', 'success')
      onChanged?.()
    } catch {
      toast.show('Error al guardar', 'info')
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este contenido del Reto?')) return
    try {
      await deleteItem(userId, item.id, demoMode)
      toast.show('Eliminado', 'info')
      onChanged?.()
    } catch {
      toast.show('Error al eliminar', 'info')
    }
  }

  async function handleRegenerate() {
    if (!onRegenerate) return
    setRegenerating(true)
    try {
      await onRegenerate(item)
      toast.show('Nueva idea generada', 'success')
      onChanged?.()
    } catch {
      toast.show('No se pudo regenerar. Inténtalo de nuevo.', 'info')
    } finally {
      setRegenerating(false)
    }
  }

  function copyText(text: string, key: string) {
    if (!text) return
    navigator.clipboard?.writeText(text)
    flashCopied(key)
    toast.show('Copiado', 'success')
  }

  function copyFullScript() {
    if (!script) return
    const text = `GANCHO\n${script.hook}\n\nCONTEXTO\n${script.context}\n\nSOLUCIÓN\n${script.solution}\n\nCTA\n${script.cta}`
    copyText(text, 'script-full')
  }

  const typeLabel = item.type === 'reel' ? 'Reel' : item.type === 'carrusel' ? 'Carrusel' : 'Story'
  const captionText = item.caption_with_hashtags || ''
  const copyFirstParagraph = captionText.split('\n\n')[0] || captionText

  // ── Vista reducida (colapsada) ───────────────────────────────────
  function CollapsedHeader() {
    return (
      <button
        type="button"
        onClick={() => !placeholder && setExpanded(true)}
        disabled={placeholder}
        className="w-full text-left disabled:cursor-default"
      >
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'var(--color-cherry)', color: 'white' }}>
            {typeLabel}
          </span>
          {pilarLabel && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
              {pilarLabel}
            </span>
          )}
          {missionDay && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}>
              Día {missionDay}
            </span>
          )}
          {item.scheduled_date && (
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto inline-flex items-center gap-1" style={{ background: 'rgba(184,216,176,0.2)', color: '#2a6a3a' }}>
              <CalendarIcon size={9} />{item.scheduled_date}
            </span>
          )}
        </div>
        <p className="font-semibold text-sm text-cherry-dark mb-2 leading-snug">{item.title}</p>
        {!placeholder ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-cherry" style={{ minHeight: 32 }}>
            <BookOpen size={13} /> Ver guion
          </span>
        ) : (
          <p className="text-xs text-cherry-dark opacity-60 italic">Plan pendiente · usa "Crear contenido" para desarrollarlo</p>
        )}
      </button>
    )
  }

  // ── Selector de estado (4 estados) ───────────────────────────────
  function StatusSelector() {
    return (
      <div className="relative">
        <button
          onClick={() => setShowStatusMenu(s => !s)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{ background: statusMeta.bg, color: statusMeta.color, minHeight: 32 }}
        >
          <span>{statusMeta.emoji}</span> {statusMeta.label}
          <ChevronDown size={11} />
        </button>
        {showStatusMenu && (
          <div className="absolute top-full left-0 mt-1 z-20 rounded-[var(--radius-sm)] py-1 min-w-[140px]" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)', boxShadow: '0 4px 12px rgba(89,20,39,0.12)' }}>
            {(Object.keys(STATUS_META) as RetoCardStatus[]).map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[rgba(122,24,50,0.05)] flex items-center gap-2"
              >
                <span>{STATUS_META[s].emoji}</span> {STATUS_META[s].label}
                {s === retoStatus && <Check size={12} className="ml-auto text-cherry" />}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Bloque de guion con copia individual ─────────────────────────
  function ScriptBlock({ label, text, copyKey }: { label: string; text: string; copyKey: string }) {
    return (
      <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--color-warm-light)', border: '1px solid var(--color-buttermilk)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cherry">{label}</span>
          <button
            onClick={() => copyText(text, copyKey)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-xs)] text-[10px] font-semibold transition-all"
            style={{ background: 'white', color: 'var(--color-cherry-dark)', border: '1px solid var(--color-buttermilk)', minHeight: 26 }}
          >
            {copiedKey === copyKey ? <Check size={10} /> : <Copy size={10} />} Copiar
          </button>
        </div>
        <p className="text-sm text-cherry-dark whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-md)] overflow-hidden"
      style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
    >
      {/* Cabecera siempre visible */}
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'var(--color-cherry)', color: 'white' }}>
                {typeLabel}
              </span>
              {pilarLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
                  {pilarLabel}
                </span>
              )}
              {missionDay && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}>
                  Día {missionDay}
                </span>
              )}
              {item.scheduled_date && (
                <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(184,216,176,0.2)', color: '#2a6a3a' }}>
                  <CalendarIcon size={9} />{item.scheduled_date}
                </span>
              )}
            </div>
            {/* Título + estado */}
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-cherry-dark leading-snug flex-1">{item.title}</p>
              <StatusSelector />
            </div>
          </div>
        </div>

        {!expanded ? (
          placeholder ? (
            <p className="text-xs text-cherry-dark opacity-60 italic">
              Plan pendiente de generar. Usa "Crear contenido" para desarrollar esta misión.
            </p>
          ) : (
            <CollapsedHeader />
          )
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-1">
            {/* ── GUION DEL REEL (protagonista) ── */}
            {script && (
              <div className="rounded-[var(--radius-sm)] p-4 space-y-3" style={{ background: 'var(--color-cream)', border: '2px solid var(--color-cherry)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-cherry flex items-center gap-1.5">
                    <Film size={13} /> Guion del Reel
                  </p>
                  <button
                    onClick={copyFullScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold text-white transition-all"
                    style={{ background: 'var(--color-cherry)', minHeight: 34 }}
                  >
                    {copiedKey === 'script-full' ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar guion completo</>}
                  </button>
                </div>
                <ScriptBlock label="Gancho" text={script.hook} copyKey="hook" />
                <ScriptBlock label="Contexto" text={script.context} copyKey="context" />
                <ScriptBlock label="Solución" text={script.solution} copyKey="solution" />
                <ScriptBlock label="CTA" text={script.cta} copyKey="cta" />
              </div>
            )}

            {/* ── COPY PARA INSTAGRAM (compacto) ── */}
            {captionText && (
              <div className="rounded-[var(--radius-sm)] p-3.5" style={{ background: 'white', border: '1px solid var(--color-buttermilk)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 flex items-center gap-1.5">
                    ✍️ Copy para Instagram
                  </p>
                  <button
                    onClick={() => copyText(captionText, 'copy-full')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                    style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 32 }}
                  >
                    {copiedKey === 'copy-full' ? <Check size={12} /> : <Copy size={12} />} Copiar copy
                  </button>
                </div>
                <p className="text-xs text-cherry-dark whitespace-pre-wrap leading-relaxed">
                  {showFullCopy ? captionText : copyFirstParagraph}
                </p>
                {captionText.includes('\n\n') && (
                  <button
                    onClick={() => setShowFullCopy(s => !s)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cherry"
                  >
                    {showFullCopy ? 'Ver menos' : 'Ver copy completo'}
                    <ChevronDown size={12} style={{ transform: showFullCopy ? 'rotate(180deg)' : 'none' }} />
                  </button>
                )}
              </div>
            )}

            {/* ── IDEA VISUAL (secundaria) ── */}
            {item.visual_idea && (
              <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'rgba(122,24,50,0.05)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-1 flex items-center gap-1.5">
                  <Video size={12} /> Idea visual
                </p>
                <p className="text-xs text-cherry-dark leading-relaxed">{item.visual_idea}</p>
              </div>
            )}

            {/* Tip de grabación */}
            {recordingTip && (
              <div className="rounded-[var(--radius-sm)] p-3 flex items-start gap-2" style={{ background: 'rgba(255,241,181,0.35)' }}>
                <Video size={13} className="text-cherry mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-1">Tip de grabación</p>
                  <p className="text-xs text-cherry-dark leading-relaxed">{recordingTip}</p>
                </div>
              </div>
            )}

            {/* ── Acciones rápidas ── */}
            <div className="flex flex-wrap gap-2 pt-1">
              {/* Transiciones de estado rápidas */}
              {retoStatus !== 'grabado' && (
                <button
                  onClick={() => handleStatusChange('grabado')}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'rgba(255,241,181,0.5)', color: '#8a6d00', minHeight: 40 }}
                >✅ Grabado</button>
              )}
              {retoStatus !== 'editado' && (
                <button
                  onClick={() => handleStatusChange('editado')}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'rgba(44,90,120,0.12)', color: '#2c5a78', minHeight: 40 }}
                >🔵 Editado</button>
              )}
              {retoStatus !== 'publicado' && (
                <button
                  onClick={() => handleStatusChange('publicado')}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #2a6a3a 0%, #3a8a4a 100%)', minHeight: 40 }}
                >🚀 Publicar</button>
              )}

              {showSchedule ? (
                <div className="flex gap-1 items-center">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="px-2.5 py-2 rounded-[var(--radius-sm)] text-xs outline-none"
                    style={{ border: '1px solid var(--color-buttermilk)', background: 'var(--color-cream)', minHeight: 40 }}
                  />
                  <button onClick={handleSchedule} className="px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-white" style={{ background: 'var(--color-cherry)', minHeight: 40 }}>OK</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSchedule(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 40 }}
                >
                  <CalendarIcon size={14} /> Programar
                </button>
              )}

              <button
                onClick={handleSaveToLibrary}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 40 }}
              >
                <Save size={14} /> Biblioteca
              </button>

              {onRegenerate && !placeholder && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 40, opacity: regenerating ? 0.5 : 1 }}
                >
                  <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} /> {regenerating ? '...' : 'Regenerar'}
                </button>
              )}

              <Link
                href="/crear-contenido"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 40 }}
              >
                <Sparkles size={14} /> Crear
              </Link>

              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ml-auto"
                style={{ background: 'rgba(192,57,78,0.08)', color: 'var(--color-cherry)', minHeight: 40 }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Cerrar ficha */}
            <button
              onClick={() => setExpanded(false)}
              className="w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-cherry-dark opacity-70 hover:opacity-100 pt-1"
            >
              <ChevronDown size={13} style={{ transform: 'rotate(180deg)' }} /> Ver menos
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}