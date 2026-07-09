'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Save, Calendar as CalendarIcon, RefreshCw, Check, Film, Copy, Video } from 'lucide-react'
import { Profile, BrandProfile } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RetoMission, RetoMissionItem } from '@/types/reto10k'
import { generateMissionContent } from '@/lib/ai/prompts/reto10k'
import { buildBrandFullContext, hasBrandContext } from '@/lib/ai/brand-context'
import { saveRetoMissionItem, addXp } from '@/lib/content-utils'
import { useToast } from '@/components/ui/Toast'
import { RETO_POINTS } from '@/types/reto10k'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  mission: RetoMission
  phaseTitle: string
  demoMode: boolean
  onClose: () => void
}

export default function RetoMissionGenerator({
  profile, progress, config, brand, mission, phaseTitle, demoMode, onClose,
}: Props) {
  const toast = useToast()
  const userId = profile?.id || 'demo'
  const [loading, setLoading] = useState(false)
  const [item, setItem] = useState<RetoMissionItem | null>(null)
  const [saved, setSaved] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')

  const phases = config?.phases || []
  const currentPhaseData = phases.find(p => p.order === progress.current_phase) || phases[0]

  async function handleGenerate() {
    setLoading(true)
    setSaved(false)
    setScheduled(false)
    try {
      const brandContext = hasBrandContext(brand)
        ? buildBrandFullContext(brand as any)
        : undefined
      const output = await generateMissionContent({
        objective: progress.objective || 'visibilidad',
        services: progress.services || [],
        level: progress.level || 'principiante',
        currentPhase: progress.current_phase || 1,
        phaseTitle: phaseTitle || currentPhaseData?.title || '',
        currentDay: progress.current_day || 1,
        missionTitle: mission.title,
        missionDescription: mission.description,
        missionPromptHint: mission.prompt_hint,
        brandContext,
      })
      setItem(output.item)
    } catch {
      toast.show('No se pudo generar. Inténtalo de nuevo.', 'info')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!item) return
    try {
      await saveRetoMissionItem(userId, item, demoMode)
      if (profile && !demoMode) {
        await addXp(userId, RETO_POINTS.saveIdea, profile.xp_total || 0)
      }
      setSaved(true)
      toast.show(`Idea guardada +${RETO_POINTS.saveIdea} XP`, 'success')
    } catch {
      toast.show('Error al guardar', 'info')
    }
  }

  async function handleSchedule() {
    if (!item || !scheduleDate) return
    try {
      await saveRetoMissionItem(userId, item, demoMode, scheduleDate)
      if (profile && !demoMode) {
        await addXp(userId, RETO_POINTS.saveIdea, profile.xp_total || 0)
      }
      setScheduled(true)
      setSaved(true)
      setShowSchedule(false)
      setScheduleDate('')
      toast.show('Añadido a tu calendario del Reto', 'success')
    } catch {
      toast.show('Error al programar', 'info')
    }
  }

  function handleCopy() {
    if (!item) return
    const text = `${item.caption}\n\n— GANCHO —\n${item.script.hook}\n\nCONTEXTO\n${item.script.context}\n\nSOLUCIÓN\n${item.script.solution}\n\nCTA\n${item.script.cta}\n\nIDEA VISUAL\n${item.visual_idea}\n\nGRABACIÓN\n${item.recording_tip}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.show('Contenido copiado', 'success')
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div
        className="rounded-[var(--radius-md)] p-4 sm:p-5 space-y-3"
        style={{ background: 'white', border: '2px solid var(--color-cherry)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70">
            Crear contenido para esta misión
          </p>
          <button onClick={onClose} className="text-xs text-cherry-dark opacity-60 hover:opacity-100">✕</button>
        </div>

        <AnimatePresence mode="wait">
          {!item && !loading && (
            <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-3">
              <p className="text-sm text-cherry-dark opacity-70 mb-3">
                Bravi creará un reel completo dedicado a <strong>{mission.title}</strong>: gancho, guion, idea visual, CTA y recomendación de grabación.
              </p>
              <button
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all glow-ready"
                style={{ background: 'var(--color-cherry)', minHeight: 44 }}
              >
                <Sparkles size={16} /> ✨ Crear mi contenido de esta misión
              </button>
            </motion.div>
          )}

          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 rounded-full mx-auto mb-3"
                style={{ border: '3px solid var(--color-buttermilk)', borderTopColor: 'var(--color-cherry)' }}
              />
              <p className="text-sm text-cherry-dark opacity-70">Bravi está creando tu contenido...</p>
            </motion.div>
          )}

          {item && !loading && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Tipo + título */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'var(--color-cherry)', color: 'white' }}>Reel</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>{item.category}</span>
              </div>
              <p className="font-bold text-base text-cherry-dark">{item.title}</p>
              {item.hookIdea && <p className="text-xs text-cherry-dark opacity-60 italic">{item.hookIdea}</p>}

              {/* Script */}
              <div className="rounded-[var(--radius-sm)] p-3 space-y-1.5" style={{ background: 'var(--color-warm-light)', border: '1px solid var(--color-buttermilk)' }}>
                <p className="text-xs text-cherry-dark"><strong className="text-cherry">GANCHO:</strong> {item.script.hook}</p>
                <p className="text-xs text-cherry-dark"><strong className="text-cherry">CONTEXTO:</strong> {item.script.context}</p>
                <p className="text-xs text-cherry-dark"><strong className="text-cherry">SOLUCIÓN:</strong> {item.script.solution}</p>
                <p className="text-xs text-cherry-dark"><strong className="text-cherry">CTA:</strong> {item.script.cta}</p>
              </div>

              {/* Caption */}
              {item.caption && (
                <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'white', border: '1px dashed var(--color-cherry)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-60 mb-1">Copy para Instagram</p>
                  <p className="text-xs text-cherry-dark whitespace-pre-line leading-relaxed">{item.caption}</p>
                </div>
              )}

              {/* Idea visual */}
              {item.visual_idea && (
                <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'rgba(184,216,176,0.15)', border: '1px solid rgba(184,216,176,0.4)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-0.5">💡 Idea visual</p>
                  <p className="text-xs text-cherry-dark">{item.visual_idea}</p>
                </div>
              )}

              {/* Recording tip */}
              {item.recording_tip && (
                <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'rgba(122,24,50,0.06)', border: '1px solid rgba(122,24,50,0.15)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-0.5 flex items-center gap-1"><Video size={11} /> Recomendación de grabación</p>
                  <p className="text-xs text-cherry-dark leading-relaxed">{item.recording_tip}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold text-white transition-all"
                  style={{ background: saved ? 'var(--color-pastel-green)' : 'var(--color-cherry)', minHeight: 40 }}
                >
                  {saved ? <><Check size={14} /> Guardado</> : <><Save size={14} /> ✅ Guardar idea</>}
                </button>

                {showSchedule ? (
                  <div className="flex gap-1 items-center">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="px-2 py-2 rounded-[var(--radius-sm)] text-xs outline-none"
                      style={{ border: '1px solid var(--color-buttermilk)', background: 'var(--color-cream)', minHeight: 40 }}
                    />
                    <button
                      onClick={handleSchedule}
                      disabled={!scheduleDate}
                      className="px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-white"
                      style={{ background: 'var(--color-cherry)', minHeight: 40, opacity: scheduleDate ? 1 : 0.5 }}
                    >OK</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSchedule(true)}
                    disabled={scheduled}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                    style={{ background: scheduled ? 'var(--color-pastel-green)' : 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 40 }}
                  >
                    {scheduled ? <><Check size={14} /> Programado</> : <><CalendarIcon size={14} /> 📅 Programar</>}
                  </button>
                )}

                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 40 }}
                >
                  <RefreshCw size={14} /> 🔄 Regenerar
                </button>

                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 40 }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} Copiar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}