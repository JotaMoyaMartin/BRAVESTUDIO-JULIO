'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Calendar as CalendarIcon, Trash2, RefreshCw, Check, Film, Copy, Video, ChevronDown, BookOpen, Sparkles, Rocket } from 'lucide-react'
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
  defaultExpanded?: boolean
}

const STATUS_META: Record<RetoCardStatus, { label: string; emoji: string; color: string; bg: string }> = {
  idea: { label: 'Pendiente', emoji: '⚪', color: 'var(--color-cherry-dark)', bg: 'var(--color-warm-gray)' },
  grabado: { label: 'Grabado', emoji: '🟡', color: '#8a6d00', bg: 'rgba(255,241,181,0.6)' },
  editado: { label: 'Editado', emoji: '🔵', color: '#2c5a78', bg: 'rgba(44,90,120,0.12)' },
  publicado: { label: 'Publicado', emoji: '🚀', color: '#2a6a3a', bg: 'rgba(184,216,176,0.3)' },
}

const PILLAR_LABELS: Record<string, string> = {
  autoridad: 'Autoridad',
  viralidad: 'Viralidad',
  educacion: 'Educación',
  deseo: 'Deseo',
  dolor: 'Dolor',
  objecion: 'Objeción',
  resultados: 'Resultados',
  conexion: 'Conexión',
}

const CARD_TINT: Record<RetoCardStatus, { border: string; bg: string; bar: string }> = {
  idea: { border: 'var(--color-buttermilk)', bg: 'white', bar: 'var(--color-buttermilk)' },
  grabado: { border: 'rgba(255,193,7,0.55)', bg: 'rgba(255,247,224,0.35)', bar: '#e6b800' },
  editado: { border: 'rgba(44,90,120,0.45)', bg: 'rgba(44,90,120,0.04)', bar: '#2c5a78' },
  publicado: { border: 'rgba(42,106,58,0.5)', bg: 'rgba(184,216,176,0.12)', bar: '#2a6a3a' },
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

export default function RetoContentCard({ item, userId, demoMode, currentXp, onChanged, onRegenerate, defaultExpanded }: Props) {
  const toast = useToast()
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(item.scheduled_date || '')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(defaultExpanded || false)
  const [showFullCopy, setShowFullCopy] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  const retoStatus = (item.reto_status as RetoCardStatus) || 'idea'
  const tint = CARD_TINT[retoStatus]
  const script = getScript(item)
  const recordingTip = getRecordingTip(item)
  const placeholder = isPlanPlaceholder(item)
  const json = item.content_json as Record<string, unknown>
  const category = (json?.category as string) || ''
  const missionDay = (json?.mission_day as number) || null
  const pilarLabel = PILLAR_LABELS[category] || category
  const statusMeta = STATUS_META[retoStatus]

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false)
      }
    }
    if (showStatusMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStatusMenu])

  function flashCopied(key: string) {
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1800)
  }

  async function handleStatusChange(newStatus: RetoCardStatus) {
    if (newStatus === retoStatus) return
    setShowStatusMenu(false)
    try {
      await setRetoStatus(userId, item.id, newStatus, demoMode, currentXp)
      if (newStatus === 'publicado') {
        toast.show(`¡Publicado! +${RETO_POINTS.publishReel} XP`, 'success')
      } else {
        toast.show(`Estado: ${STATUS_META[newStatus].label}`, 'info')
      }
      onChanged?.()
    } catch {
      toast.show('Error al actualizar', 'info')
    }
  }

  async function handlePublish() {
    if (retoStatus === 'publicado') return
    try {
      await setRetoStatus(userId, item.id, 'publicado', demoMode, currentXp)
      toast.show(`¡Publicado! +${RETO_POINTS.publishReel} XP`, 'success')
      onChanged?.()
    } catch {
      toast.show('Error al publicar', 'info')
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
  const isPublished = retoStatus === 'publicado'

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
      className="rounded-[var(--radius-md)] overflow-hidden relative"
      style={{ background: tint.bg, border: `1.5px solid ${tint.border}` }}
    >
      {/* Barra de color superior según el estado */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: tint.bar }} />

      {/* Cabecera siempre visible */}
      <div className="p-4">
        {/* Badges + dropdown de estado */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
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
            <p className="font-semibold text-sm text-cherry-dark leading-snug">{item.title}</p>
          </div>

          {/* Dropdown de estado compacto */}
          <div ref={statusRef} className="relative flex-shrink-0">
            <button
              onClick={() => setShowStatusMenu(s => !s)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all"
              style={{
                background: statusMeta.bg,
                color: statusMeta.color,
                border: `1px solid ${tint.border}`,
                minHeight: 28,
              }}
            >
              <span className="text-xs leading-none">{statusMeta.emoji}</span>
              {statusMeta.label}
              <ChevronDown size={10} style={{ transform: showStatusMenu ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showStatusMenu && (
              <div
                className="absolute right-0 top-full mt-1 rounded-[var(--radius-sm)] py-1 z-20 min-w-[140px]"
                style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)', boxShadow: '0 4px 12px rgba(89,20,39,0.15)' }}
              >
                {(['idea', 'grabado', 'editado', 'publicado'] as RetoCardStatus[]).map(s => {
                  const meta = STATUS_META[s]
                  const active = s === retoStatus
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="w-full inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all text-left"
                      style={{ background: active ? 'var(--color-warm-gray)' : 'transparent', color: active ? meta.color : 'var(--color-cherry-dark)' }}
                    >
                      <span className="text-sm leading-none">{meta.emoji}</span>
                      {meta.label}
                      {active && <Check size={12} className="ml-auto" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Botón Publicar destacado (si no está publicado) */}
        {!isPublished && !placeholder && (
          <button
            onClick={handlePublish}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all mt-2"
            style={{ background: 'linear-gradient(135deg, #2a6a3a 0%, #3a8a4a 100%)', minHeight: 42 }}
          >
            <Rocket size={16} /> Marcar como publicado
          </button>
        )}
        {isPublished && (
          <div
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-bold mt-2"
            style={{ background: 'rgba(184,216,176,0.2)', color: '#2a6a3a', minHeight: 38 }}
          >
            <Check size={16} /> Publicado · +{RETO_POINTS.publishReel} XP
          </div>
        )}

        {!expanded ? (
          placeholder ? (
            <p className="text-xs text-cherry-dark opacity-60 italic mt-3">
              Plan pendiente de generar. Usa "Crear contenido" para desarrollar esta misión.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold text-cherry transition-all mt-3"
              style={{ background: 'var(--color-warm-gray)', minHeight: 40 }}
            >
              <BookOpen size={14} /> Ver guion
            </button>
          )
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-3">
            {/* GUION DEL REEL */}
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

            {/* COPY PARA INSTAGRAM */}
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

            {/* IDEA VISUAL */}
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

            {/* Acciones rápidas */}
            <div className="flex flex-wrap gap-2 pt-1">
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