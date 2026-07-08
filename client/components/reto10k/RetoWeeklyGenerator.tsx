'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Save, Calendar as CalendarIcon, Film, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RetoItem, RetoMission } from '@/types/reto10k'
import { generateRetos } from '@/lib/ai/prompts/reto10k'
import { buildBrandFullContext, hasBrandContext } from '@/lib/ai/brand-context'
import { saveToLibrary, copyToClipboard } from '@/lib/content-utils'
import { useToast } from '@/components/ui/Toast'
import { useSessionState } from '@/lib/session-store'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  generating: boolean
  setGenerating: (v: boolean) => void
  contentItems: ContentItem[]
  demoMode: boolean
  generateTrigger?: number
  containerRef?: React.RefObject<HTMLDivElement | null>
  mission?: RetoMission | null
}

export default function RetoWeeklyGenerator({
  profile, progress, config, brand, generating, setGenerating, demoMode, generateTrigger, containerRef, mission,
}: Props) {
  const toast = useToast()
  const [items, setItems] = useSessionState<RetoItem[]>(`u:${profile?.id || 'demo'}:reto10k:items`, [])
  const [loading, setLoading] = useState(false)
  const [savedIds, setSavedIds] = useSessionState<number[]>(`u:${profile?.id || 'demo'}:reto10k:savedIds`, [])
  const [scheduledIds, setScheduledIds] = useSessionState<number[]>(`u:${profile?.id || 'demo'}:reto10k:scheduledIds`, [])
  const [copiedIds, setCopiedIds] = useState<Set<number>>(new Set())
  const [schedulingId, setSchedulingId] = useState<number | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const generatingRef = useRef(false)

  const userId = profile?.id || 'demo'
  const savedSet = new Set(savedIds)
  const scheduledSet = new Set(scheduledIds)
  const phases = config?.phases || []
  const currentPhase = progress.current_phase || 1
  const currentPhaseData = phases.find(p => p.order === currentPhase) || phases[0]

  async function handleGenerate() {
    setLoading(true)
    try {
      const brandContext = hasBrandContext(brand)
        ? buildBrandFullContext(brand as any)
        : undefined

      const output = await generateRetos({
        objective: progress.objective || 'visibilidad',
        services: progress.services || [],
        level: progress.level || 'principiante',
        currentPhase,
        phaseTitle: currentPhaseData?.title || '',
        currentDay: progress.current_day || 1,
        postsPerWeek: progress.posts_per_week || 4,
        missionTitle: mission?.title,
        missionDescription: mission?.description,
        missionPromptHint: mission?.prompt_hint,
        brandContext,
      })
      setItems(output.items)
      setGenerating(true)
      toast.show(`${output.items.length} ideas generadas para tu Reto`, 'success')
    } catch {
      toast.show('No se pudo generar. Inténtalo de nuevo.', 'info')
    } finally {
      setLoading(false)
      generatingRef.current = false
    }
  }

  // Disparar generación desde fuera (botón "Generar contenido para esta misión")
  useEffect(() => {
    if (!generateTrigger) return
    if (generatingRef.current) return
    generatingRef.current = true
    handleGenerate()
    // Scroll al contenedor del generador
    if (containerRef?.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [generateTrigger])

  async function handleSave(item: RetoItem, idx: number) {
    try {
      const contentJson: Record<string, unknown> = {}
      if (item.script) contentJson.script = item.script

      await saveToLibrary(userId, {
        type: item.type,
        title: item.title,
        service: item.service,
        objective: item.objective,
        format: item.format,
        content_json: contentJson,
        caption_with_hashtags: item.caption || null,
        visual_idea: item.visual_idea || null,
        tag: 'reto-10k',
      }, demoMode)

      // Sumar XP
      if (!demoMode && profile) {
        const supabase = (await import('@/lib/supabase/client')).createClient()
        await supabase
          .from('profiles')
          .update({ xp_total: (profile.xp_total || 0) + 10 })
          .eq('id', userId)
      }

      setSavedIds(prev => prev.includes(idx) ? prev : [...prev, idx])
      toast.show('Guardado en Biblioteca +10 XP', 'success')
    } catch {
      toast.show('Error al guardar', 'info')
    }
  }

  async function handleSchedule(item: RetoItem, idx: number) {
    if (!scheduleDate) return
    // Guardar primero, luego programar
    // Por simplicidad, solo guardamos con scheduled_date
    try {
      const contentJson: Record<string, unknown> = {}
      if (item.script) contentJson.script = item.script

      await saveToLibrary(userId, {
        type: item.type,
        title: item.title,
        service: item.service,
        objective: item.objective,
        format: item.format,
        content_json: contentJson,
        caption_with_hashtags: item.caption || null,
        visual_idea: item.visual_idea || null,
        scheduled_date: scheduleDate,
        status: 'scheduled',
        tag: 'reto-10k',
      }, demoMode)

      setScheduledIds(prev => prev.includes(idx) ? prev : [...prev, idx])
      setSchedulingId(null)
      setScheduleDate('')
      toast.show('Añadido al Calendario', 'success')
    } catch {
      toast.show('Error al programar', 'info')
    }
  }

  function handleCopy(item: RetoItem, idx: number) {
    const text = item.caption || item.title
    copyToClipboard(text)
    setCopiedIds(prev => new Set(prev).add(idx))
    setTimeout(() => {
      setCopiedIds(prev => {
        const next = new Set(prev)
        next.delete(idx)
        return next
      })
    }, 2000)
  }

  // No mostrar nada si no se ha generado
  if (items.length === 0 && !loading) {
    return (
      <div
        className="rounded-[var(--radius-md)] p-5 text-center"
        style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
      >
        <Sparkles size={28} className="mx-auto text-cherry opacity-50 mb-2" />
        <p className="text-sm font-semibold text-cherry-dark mb-1">Genera tu contenido semanal</p>
        <p className="text-xs text-cherry-dark opacity-60 mb-4">
          Bravi creará ideas personalizadas para tu fase actual del Reto 10K
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-white transition-all"
          style={{ background: 'var(--color-cherry)', opacity: loading ? 0.65 : 1 }}
        >
          <Sparkles size={15} /> {loading ? 'Generando...' : 'Generar mi contenido semanal'}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className="rounded-[var(--radius-md)] p-8 text-center"
        style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full mx-auto mb-3"
          style={{ border: '3px solid var(--color-buttermilk)', borderTopColor: 'var(--color-cherry)' }}
        />
        <p className="text-sm text-cherry-dark opacity-70">Bravi está creando tus ideas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-cherry-dark">Tus ideas del Reto 10K</h3>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs font-semibold text-cherry hover:underline"
        >
          Regenerar
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="rounded-[var(--radius-md)] overflow-hidden"
            style={{ background: 'white', border: '1.5px solid var(--color-buttermilk)' }}
          >
            <div className="p-4">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className="text-xs font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--color-cherry)', color: 'white' }}
                >
                  Reel
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
                >
                  {item.category}
                </span>
                {item.service && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}
                  >
                    {item.service}
                  </span>
                )}
              </div>

              <p className="font-semibold text-sm text-cherry-dark mb-1">{item.title}</p>
              {item.hookIdea && (
                <p className="text-xs text-cherry-dark opacity-60 italic mb-2">{item.hookIdea}</p>
              )}

              {/* Script preview */}
              {item.script && (
                <div
                  className="rounded-[var(--radius-sm)] p-3 mb-2"
                  style={{ background: 'var(--color-warm-light)', border: '1px solid var(--color-buttermilk)' }}
                >
                  <p className="text-xs text-cherry-dark mb-1"><strong>GANCHO:</strong> {item.script.hook}</p>
                  <p className="text-xs text-cherry-dark mb-1"><strong>CONTEXTO:</strong> {item.script.context}</p>
                  <p className="text-xs text-cherry-dark mb-1"><strong>SOLUCIÓN:</strong> {item.script.solution}</p>
                  <p className="text-xs text-cherry-dark"><strong>CTA:</strong> {item.script.cta}</p>
                </div>
              )}

              {/* Caption preview (listo para copiar) */}
              {item.caption && (
                <div
                  className="rounded-[var(--radius-sm)] p-3 mb-2"
                  style={{ background: 'white', border: '1px dashed var(--color-cherry)' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-60 mb-1">Copy para Instagram</p>
                  <p className="text-xs text-cherry-dark whitespace-pre-line leading-relaxed">{item.caption}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => handleSave(item, idx)}
                  disabled={savedSet.has(idx)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{
                    background: savedSet.has(idx) ? 'var(--color-pastel-green)' : 'var(--color-cherry)',
                    color: 'white',
                  }}
                >
                  {savedSet.has(idx) ? <><Check size={13} /> Guardado</> : <><Save size={13} /> Guardar</>}
                </button>

                {schedulingId === idx ? (
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="px-2 py-1 rounded-[var(--radius-sm)] text-xs outline-none"
                      style={{ border: '1px solid var(--color-buttermilk)', background: 'var(--color-cream)' }}
                    />
                    <button
                      onClick={() => handleSchedule(item, idx)}
                      className="px-2 py-1 rounded-[var(--radius-sm)] text-xs font-semibold text-white"
                      style={{ background: 'var(--color-cherry)' }}
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSchedulingId(idx)}
                    disabled={scheduledSet.has(idx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                    style={{
                      background: scheduledSet.has(idx) ? 'var(--color-pastel-green)' : 'var(--color-warm-gray)',
                      color: 'var(--color-cherry-dark)',
                    }}
                  >
                    {scheduledSet.has(idx) ? <><Check size={13} /> Programado</> : <><CalendarIcon size={13} /> Calendario</>}
                  </button>
                )}

                <Link
                  href="/crear-contenido"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}
                >
                  <Film size={13} /> Crear
                </Link>

                <button
                  onClick={() => handleCopy(item, idx)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}
                >
                  {copiedIds.has(idx) ? <Check size={13} /> : <Copy size={13} />} Copiar
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bravi */}
      <div
        className="rounded-[var(--radius-md)] p-3 flex items-start gap-2"
        style={{ background: 'var(--color-buttermilk)', border: '1px solid rgba(122,24,50,0.1)' }}
      >
        <img
          src="/bravi2.png"
          alt="Bravi"
          className="flex-shrink-0 bravi-float"
          style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(89,20,39,0.15))' }}
          draggable={false}
        />
        <p className="text-xs text-cherry-dark">
          Guarda las ideas que te gusten en tu Biblioteca. Cada una te da +10 XP.
        </p>
      </div>
    </div>
  )
}