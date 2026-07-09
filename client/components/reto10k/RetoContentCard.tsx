'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Calendar as CalendarIcon, Trash2, RefreshCw, Check, Film, Copy, Video, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { ContentItem } from '@/types/database'
import { RetoCardStatus } from '@/types/reto10k'
import { setRetoStatus, scheduleRetoItem, deleteItem, addXp } from '@/lib/content-utils'
import { useToast } from '@/components/ui/Toast'
import { RETO_POINTS } from '@/types/reto10k'

interface Props {
  item: ContentItem
  userId: string
  demoMode: boolean
  currentXp: number
  onChanged?: () => void
}

const STATUS_META: Record<RetoCardStatus, { label: string; emoji: string; color: string; bg: string }> = {
  idea: { label: 'Idea', emoji: '⚪', color: 'var(--color-cherry-dark)', bg: 'var(--color-warm-gray)' },
  grabado: { label: 'Grabado', emoji: '🟡', color: '#8a6d00', bg: 'rgba(255,241,181,0.6)' },
  publicado: { label: 'Publicado', emoji: '🟢', color: '#2a6a3a', bg: 'rgba(184,216,176,0.3)' },
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

export default function RetoContentCard({ item, userId, demoMode, currentXp, onChanged }: Props) {
  const toast = useToast()
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(item.scheduled_date || '')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const retoStatus = (item.reto_status as RetoCardStatus) || 'idea'
  const statusMeta = STATUS_META[retoStatus]
  const script = getScript(item)
  const recordingTip = getRecordingTip(item)
  const placeholder = isPlanPlaceholder(item)
  const json = item.content_json as Record<string, unknown>
  const category = (json?.category as string) || ''
  const missionDay = (json?.mission_day as number) || null

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
      toast.show('Fecha actualizada', 'success')
      setShowSchedule(false)
      onChanged?.()
    } catch {
      toast.show('Error al programar', 'info')
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

  function handleCopy() {
    const parts = [item.caption_with_hashtags, script ? `GANCHO: ${script.hook}\nCONTEXTO: ${script.context}\nSOLUCIÓN: ${script.solution}\nCTA: ${script.cta}` : '', recordingTip ? `GRABACIÓN: ${recordingTip}` : ''].filter(Boolean)
    navigator.clipboard?.writeText(parts.join('\n\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.show('Copiado', 'success')
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-md)] overflow-hidden"
      style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
    >
      <div className="p-4">
        {/* Cabecera clicable: abre/cierra la tarjeta */}
        <button
          type="button"
          onClick={() => !placeholder && setExpanded(e => !e)}
          className="w-full text-left disabled:cursor-default"
          aria-expanded={expanded}
          disabled={placeholder}
        >
          {/* Header: tipo + estado */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'var(--color-cherry)', color: 'white' }}>
              {item.type === 'reel' ? 'Reel' : item.type === 'carrusel' ? 'Carrusel' : 'Story'}
            </span>
            {category && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
                {category}
              </span>
            )}
            {missionDay && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}>
                Día {missionDay}
              </span>
            )}
            {item.scheduled_date && (
              <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(184,216,176,0.2)', color: '#2a6a3a' }}>
                <CalendarIcon size={10} className="inline mr-1" />{item.scheduled_date}
              </span>
            )}
          </div>

          {/* Título + chevron */}
          <div className="flex items-start gap-2 mb-1">
            <p className="font-semibold text-sm text-cherry-dark flex-1">{item.title}</p>
            {!placeholder && (
              <ChevronDown
                size={16}
                className="text-cherry flex-shrink-0 mt-0.5 transition-transform"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            )}
          </div>

          {/* Placeholder: plan pendiente */}
          {placeholder ? (
            <p className="text-xs text-cherry-dark opacity-60 italic mb-2">
              Plan pendiente de generar. Usa "Crear contenido" para desarrollar esta misión.
            </p>
          ) : !expanded ? (
            /* Resumen colapsado: gancho + CTA recortados */
            script ? (
              <div className="rounded-[var(--radius-sm)] p-2.5 space-y-0.5" style={{ background: 'var(--color-warm-light)', border: '1px solid var(--color-buttermilk)' }}>
                <p className="text-xs text-cherry-dark line-clamp-2"><strong className="text-cherry">Gancho:</strong> {script.hook}</p>
                <p className="text-xs text-cherry-dark line-clamp-2"><strong className="text-cherry">CTA:</strong> {script.cta}</p>
              </div>
            ) : null
          ) : (
            /* Contenido expandido: guion completo + copy + idea visual + grabación */
            <div className="space-y-2.5">
              {script && (
                <div className="rounded-[var(--radius-sm)] p-3 space-y-2" style={{ background: 'var(--color-warm-light)', border: '1px solid var(--color-buttermilk)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70">Guion</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-cherry-dark"><strong className="text-cherry">Gancho:</strong> {script.hook}</p>
                    <p className="text-xs text-cherry-dark"><strong className="text-cherry">Contexto:</strong> {script.context}</p>
                    <p className="text-xs text-cherry-dark"><strong className="text-cherry">Solución:</strong> {script.solution}</p>
                    <p className="text-xs text-cherry-dark"><strong className="text-cherry">CTA:</strong> {script.cta}</p>
                  </div>
                </div>
              )}

              {item.caption_with_hashtags && (
                <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'white', border: '1px solid var(--color-buttermilk)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-1.5">Copy para el caption</p>
                  <p className="text-xs text-cherry-dark whitespace-pre-wrap leading-relaxed">{item.caption_with_hashtags}</p>
                </div>
              )}

              {item.visual_idea && (
                <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'rgba(122,24,50,0.06)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-1.5">Idea visual</p>
                  <p className="text-xs text-cherry-dark leading-relaxed">{item.visual_idea}</p>
                </div>
              )}

              {recordingTip && (
                <div className="rounded-[var(--radius-sm)] p-3 flex items-start gap-2" style={{ background: 'rgba(255,241,181,0.4)' }}>
                  <Video size={13} className="text-cherry mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-1">Tip de grabación</p>
                    <p className="text-xs text-cherry-dark leading-relaxed">{recordingTip}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </button>

        {/* Resumen de grabación cuando está colapsado */}
        {recordingTip && !expanded && !placeholder && (
          <div className="rounded-[var(--radius-sm)] p-2 mt-2 mb-2 flex items-start gap-1.5" style={{ background: 'rgba(122,24,50,0.06)' }}>
            <Video size={12} className="text-cherry mt-0.5 flex-shrink-0" />
            <p className="text-xs text-cherry-dark line-clamp-2">{recordingTip}</p>
          </div>
        )}

        {/* Estado semáforo */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-60">Estado</span>
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(s => !s)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
              style={{ background: statusMeta.bg, color: statusMeta.color }}
            >
              <span>{statusMeta.emoji}</span> {statusMeta.label}
              <ChevronDown size={11} />
            </button>
            {showStatusMenu && (
              <div className="absolute top-full left-0 mt-1 z-10 rounded-[var(--radius-sm)] py-1 min-w-[120px]" style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)', boxShadow: '0 4px 12px rgba(89,20,39,0.1)' }}>
                {(['idea', 'grabado', 'publicado'] as RetoCardStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(122,24,50,0.05)] flex items-center gap-2"
                  >
                    <span>{STATUS_META[s].emoji}</span> {STATUS_META[s].label}
                    {s === retoStatus && <Check size={11} className="ml-auto text-cherry" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5">
          {showSchedule ? (
            <div className="flex gap-1 items-center">
              <input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="px-2 py-1.5 rounded-[var(--radius-sm)] text-xs outline-none"
                style={{ border: '1px solid var(--color-buttermilk)', background: 'var(--color-cream)', minHeight: 36 }}
              />
              <button onClick={handleSchedule} className="px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold text-white" style={{ background: 'var(--color-cherry)', minHeight: 36 }}>OK</button>
            </div>
          ) : (
            <button
              onClick={() => setShowSchedule(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
              style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 32 }}
            >
              <CalendarIcon size={12} /> Cambiar fecha
            </button>
          )}

          <Link
            href="/crear-contenido"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
            style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 32 }}
          >
            <Film size={12} /> Crear
          </Link>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
            style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 32 }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />} Copiar
          </button>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ml-auto"
            style={{ background: 'rgba(192,57,78,0.08)', color: 'var(--color-cherry)', minHeight: 32 }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}