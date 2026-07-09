'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kConfig, Reto10kProgress, RetoMission, RetoMissionItem } from '@/types/reto10k'
import { generateMissionContent } from '@/lib/ai/prompts/reto10k'
import { buildBrandFullContext, hasBrandContext } from '@/lib/ai/brand-context'
import { saveRetoMissionItem, updateRetoMissionItem, addXp, deleteItem } from '@/lib/content-utils'
import { useToast } from '@/components/ui/Toast'
import { RETO_POINTS } from '@/types/reto10k'
import RetoContentCard from './RetoContentCard'

interface Props {
  profile: Profile | null
  progress: Reto10kProgress
  config: Reto10kConfig | null
  brand: Partial<BrandProfile> | null
  mission: RetoMission
  phaseTitle: string
  demoMode: boolean
  placeholderId?: string | null
  placeholderScheduledDate?: string | null
  onChanged?: () => void
  onClose: () => void
}

function buildContentItem(
  id: string,
  userId: string,
  item: RetoMissionItem,
  scheduledDate: string | null
): ContentItem {
  return {
    id,
    user_id: userId,
    type: 'reel',
    title: item.title,
    service: item.service,
    objective: item.objective,
    format: item.format,
    content_json: {
      script: item.script,
      recording_tip: item.recording_tip,
      category: item.category,
      mission_day: item.day,
      is_plan_placeholder: false,
    },
    caption_with_hashtags: item.caption || null,
    visual_idea: item.visual_idea || null,
    scheduled_date: scheduledDate,
    status: 'library',
    tag: 'reto-10k',
    reto_status: 'idea',
    done_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export default function RetoMissionGenerator({
  profile, progress, config, brand, mission, phaseTitle, demoMode,
  placeholderId, placeholderScheduledDate, onChanged, onClose,
}: Props) {
  const toast = useToast()
  const userId = profile?.id || 'demo'
  const [loading, setLoading] = useState(false)
  const [savedItem, setSavedItem] = useState<ContentItem | null>(null)

  const phases = config?.phases || []
  const currentPhaseData = phases.find(p => p.order === progress.current_phase) || phases[0]

  async function generateAndSave() {
    setLoading(true)
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

      const missionItem = output.item

      // Auto-save immediately
      let savedId: string
      if (placeholderId) {
        await updateRetoMissionItem(userId, placeholderId, missionItem, demoMode)
        savedId = placeholderId
      } else {
        savedId = await saveRetoMissionItem(userId, missionItem, demoMode)
      }

      if (profile && !demoMode) {
        await addXp(userId, RETO_POINTS.saveIdea, profile.xp_total || 0)
      }

      const contentItem = buildContentItem(
        savedId,
        userId,
        missionItem,
        placeholderId ? (placeholderScheduledDate || null) : null
      )
      setSavedItem(contentItem)
      onChanged?.()
      toast.show(`Contenido creado y guardado +${RETO_POINTS.saveIdea} XP`, 'success')
    } catch {
      toast.show('No se pudo generar. Inténtalo de nuevo.', 'info')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate(oldItem: ContentItem) {
    if (!savedItem) return
    setLoading(true)
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

      const missionItem = output.item

      // Update the existing saved item with new content
      if (placeholderId) {
        await updateRetoMissionItem(userId, placeholderId, missionItem, demoMode)
      } else {
        await deleteItem(userId, oldItem.id, demoMode)
        const newId = await saveRetoMissionItem(userId, missionItem, demoMode)
        const contentItem = buildContentItem(newId, userId, missionItem, null)
        setSavedItem(contentItem)
      }

      // Update local state with new content (keep same id for placeholder case)
      const updatedItem = buildContentItem(
        placeholderId || savedItem.id,
        userId,
        missionItem,
        placeholderId ? (placeholderScheduledDate || null) : null
      )
      setSavedItem(updatedItem)
      onChanged?.()
      toast.show('Nueva idea generada', 'success')
    } catch {
      toast.show('No se pudo regenerar. Inténtalo de nuevo.', 'info')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {!savedItem && !loading && (
            <motion.div
              key="cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[var(--radius-md)] p-5 text-center"
              style={{ background: 'white', border: '2px solid var(--color-cherry)' }}
            >
              <p className="text-sm text-cherry-dark opacity-70 mb-3">
                Bravi creará un reel completo dedicado a <strong>{mission.title}</strong>: gancho, guion, idea visual, CTA y recomendación de grabación.
              </p>
              <button
                onClick={generateAndSave}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all glow-ready"
                style={{ background: 'var(--color-cherry)', minHeight: 44 }}
              >
                <Sparkles size={16} /> Crear mi contenido de esta misión
              </button>
            </motion.div>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[var(--radius-md)] p-8 text-center"
              style={{ background: 'white', border: '2px solid var(--color-cherry)' }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 rounded-full mx-auto mb-3"
                style={{ border: '3px solid var(--color-buttermilk)', borderTopColor: 'var(--color-cherry)' }}
              />
              <p className="text-sm text-cherry-dark opacity-70">Bravi está creando tu contenido...</p>
            </motion.div>
          )}

          {savedItem && !loading && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70">
                  Contenido creado para: {mission.title}
                </p>
                <button
                  onClick={generateAndSave}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', minHeight: 32 }}
                >
                  <RefreshCw size={12} /> Regenerar
                </button>
              </div>
              <RetoContentCard
                item={savedItem}
                userId={userId}
                demoMode={demoMode}
                currentXp={profile?.xp_total || 0}
                onChanged={onChanged}
                onRegenerate={handleRegenerate}
                defaultExpanded
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}