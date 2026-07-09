import { createClient } from '@/lib/supabase/client'
import { demoSavePlan, demoUpdatePlan, demoDeletePlan } from '@/lib/demo-store'
import { ContentItem } from '@/types/database'
import { RETO_POINTS, RetoCardStatus } from '@/types/reto10k'

// ── Clipboard ──────────────────────────────────────────────────────

export function copyToClipboard(text: string): void {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text)
  }
}

// ── XP helper ──────────────────────────────────────────────────────

/**
 * Suma XP al perfil de la usuaria (patrón inline existente, ahora unificado).
 * No-op en demo mode. Devuelve el nuevo total de XP.
 */
export async function addXp(userId: string, amount: number, currentXp: number): Promise<number> {
  if (userId === 'demo') return currentXp
  try {
    const supabase = createClient()
    const newTotal = (currentXp || 0) + amount
    await supabase.from('profiles').update({ xp_total: newTotal }).eq('id', userId)
    return newTotal
  } catch {
    return currentXp
  }
}

// ── Format content for copy ────────────────────────────────────────

export function formatContentForCopy(
  item: ContentItem,
  mode: 'full' | 'visual' = 'full'
): string {
  const json = (item.content_json || {}) as Record<string, unknown>
  const cap = item.caption_with_hashtags || ''
  const visual = mode === 'visual'

  // Reel
  if (item.type === 'reel' && json.script) {
    const s = json.script as Record<string, string>
    if (visual) {
      return `🎬 ${item.title}\n\n✨ GANCHO:\n${s.hook}\n\n👁️ CONTEXTO:\n${s.context}\n\n💡 SOLUCIÓN:\n${s.solution}\n\n💌 CTA:\n${s.cta}${cap ? `\n\n📝 PUBLICACIÓN:\n${cap}` : ''}`
    }
    return `GANCHO:\n${s.hook}\n\nCONTEXTO:\n${s.context}\n\nSOLUCIÓN:\n${s.solution}\n\nCTA:\n${s.cta}${cap ? `\n\nPUBLICACIÓN:\n${cap}` : ''}`
  }

  // Carrusel
  if (item.type === 'carrusel' && json.slides) {
    const slides = json.slides as Array<{ number: number; role: string; text: string }>
    const body = visual
      ? slides.map(s => `Slide ${s.number} — ${s.role}:\n${s.text}`).join('\n\n')
      : slides.map(s => `Slide ${s.number} — ${s.role}:\n${s.text}`).join('\n\n')
    return body + (cap ? `\n\nPUBLICACIÓN:\n${cap}` : '')
  }

  // Story
  if (item.type === 'story') {
    // Stories guardadas como secuencia
    if (json.stories) {
      const stories = json.stories as Array<{ number: number; role: string; text: string }>
      if (visual) {
        return stories.map(s => `📱 Story ${s.number} — ${s.role}\n\n${s.text}`).join('\n\n✨\n\n')
      }
      return stories.map(s => `Story ${s.number} — ${s.role}:\n${s.text}`).join('\n\n---\n\n')
    }
    // Pregunta guardada
    if (json.question) {
      const q = json.question as string
      const a = (json.answer as string) || ''
      if (visual) {
        return `🤔 Pregunta:\n${q}${a ? `\n\n💭 Respuesta:\n${a}` : ''}`
      }
      return `Pregunta: ${q}${a ? `\n\nRespuesta: ${a}` : ''}`
    }
  }

  // Fallback
  return cap || item.title || 'Contenido guardado'
}

export function formatMultipleForCopy(items: ContentItem[]): string {
  return items
    .map((item, i) => `${i + 1}. ${item.title}\n${formatContentForCopy(item)}`)
    .join('\n\n━━━━━━━━━━━━━━━━\n\n')
}

// ── Persistence helpers ────────────────────────────────────────────

export async function saveToLibrary(
  userId: string,
  payload: Record<string, unknown>,
  isDemoMode: boolean
): Promise<void> {
  if (isDemoMode) {
    demoSavePlan({ ...payload, status: 'library' })
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').insert({ user_id: userId, ...payload, status: 'library' })
}

export async function scheduleItem(
  userId: string,
  itemId: string,
  date: string,
  isDemoMode: boolean
): Promise<void> {
  const patch = { scheduled_date: date, status: 'scheduled' }
  if (isDemoMode) {
    demoUpdatePlan(itemId, patch)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').update(patch).eq('id', itemId)
}

export async function unscheduleItem(
  userId: string,
  itemId: string,
  isDemoMode: boolean
): Promise<void> {
  const patch = { scheduled_date: null, status: 'library' }
  if (isDemoMode) {
    demoUpdatePlan(itemId, patch)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').update(patch).eq('id', itemId)
}

export async function deleteItem(
  userId: string,
  itemId: string,
  isDemoMode: boolean
): Promise<void> {
  if (isDemoMode) {
    demoDeletePlan(itemId)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').delete().eq('id', itemId)
}

// ── Duplicate to Library ────────────────────────────────────────────
// Duplicates a scheduled item into the library (status='library',
// scheduled_date=null) so the user keeps the original in calendar AND
// has a copy in the library. Per spec: "mejor duplicar, no mover".

export async function duplicateToLibrary(
  userId: string,
  item: ContentItem,
  isDemoMode: boolean
): Promise<void> {
  const { id, created_at, updated_at, scheduled_date, status, ...rest } = item
  const payload = {
    ...rest,
    user_id: userId,
    scheduled_date: null,
    status: 'library' as const,
  }
  if (isDemoMode) {
    demoSavePlan(payload as Record<string, unknown>)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').insert(payload)
}

// ── Reto 10K helpers ────────────────────────────────────────────────

/**
 * Guarda una idea generada dentro del Reto 10K con tag='reto-10k' y
 * reto_status='idea'. Reutiliza saveToLibrary.
 */
export async function saveRetoIdea(
  userId: string,
  payload: Record<string, unknown>,
  isDemoMode: boolean
): Promise<void> {
  await saveToLibrary(userId, { ...payload, tag: 'reto-10k', reto_status: 'idea' }, isDemoMode)
}

/**
 * Actualiza el semáforo del reto (idea / grabado / publicado).
 * Si 'publicado', suma +10 XP al perfil.
 */
export async function setRetoStatus(
  userId: string,
  itemId: string,
  retoStatus: RetoCardStatus,
  isDemoMode: boolean,
  currentXp: number
): Promise<number> {
  const patch: Record<string, unknown> = { reto_status: retoStatus }
  if (retoStatus === 'publicado') {
    patch.status = 'done'
    patch.done_at = new Date().toISOString()
  } else if (retoStatus === 'grabado' || retoStatus === 'editado') {
    // grabado/editado = está siendo trabajado; si no tenía status, lo dejamos en library
    patch.status = 'library'
  }
  if (isDemoMode) {
    demoUpdatePlan(itemId, patch)
    return retoStatus === 'publicado' ? currentXp + RETO_POINTS.publishReel : currentXp
  }
  const supabase = createClient()
  await supabase.from('content_items').update(patch).eq('id', itemId)
  if (retoStatus === 'publicado') {
    return addXp(userId, RETO_POINTS.publishReel, currentXp)
  }
  return currentXp
}

/**
 * Programar una idea del reto para una fecha concreta.
 * Reutiliza scheduleItem pero mantiene reto_status.
 */
export async function scheduleRetoItem(
  userId: string,
  itemId: string,
  date: string,
  isDemoMode: boolean
): Promise<void> {
  const patch = { scheduled_date: date, status: 'scheduled' as const }
  if (isDemoMode) {
    demoUpdatePlan(itemId, patch)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').update(patch).eq('id', itemId)
}

/**
 * Guarda un día del plan de 30 días como content_item del reto.
 * Crea un item "esqueleto" con la misión referenciada, sin guion todavía.
 */
export async function saveRetoPlanDay(
  userId: string,
  day: {
    date: string
    day: number
    mission: { title: string; description: string; prompt_hint: string; phase: number }
    category: string
  },
  isDemoMode: boolean
): Promise<string> {
  const payload = {
    type: 'reel' as const,
    title: day.mission.title,
    service: null,
    objective: null,
    format: 'Reel 35-45s',
    content_json: {
      mission_day: day.day,
      mission_title: day.mission.title,
      mission_description: day.mission.description,
      mission_hint: day.mission.prompt_hint,
      phase: day.mission.phase,
      category: day.category,
      is_plan_placeholder: true,
    },
    caption_with_hashtags: null,
    visual_idea: null,
    scheduled_date: day.date,
    status: 'library' as const,
    tag: 'reto-10k',
    reto_status: 'idea' as const,
  }
  if (isDemoMode) {
    const saved = demoSavePlan(payload as Record<string, unknown>)
    return saved.id
  }
  const supabase = createClient()
  const { data } = await supabase.from('content_items').insert({ user_id: userId, ...payload }).select().single()
  return data?.id || ''
}

/**
 * Guarda el item generado para una misión concreta (item único con guion completo).
 */
export async function saveRetoMissionItem(
  userId: string,
  item: {
    type: 'reel'
    title: string
    service: string
    objective: string
    category: string
    format: string
    script: { hook: string; context: string; solution: string; cta: string }
    caption: string
    visual_idea: string
    recording_tip: string
    day: number
  },
  isDemoMode: boolean,
  scheduledDate?: string
): Promise<string> {
  const payload = {
    type: item.type,
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
    scheduled_date: scheduledDate || null,
    status: (scheduledDate ? 'scheduled' : 'library') as 'scheduled' | 'library',
    tag: 'reto-10k',
    reto_status: 'idea' as const,
  }
  if (isDemoMode) {
    const saved = demoSavePlan(payload as Record<string, unknown>)
    return saved.id
  }
  const supabase = createClient()
  const { data } = await supabase.from('content_items').insert({ user_id: userId, ...payload }).select().single()
  return data?.id || ''
}

/**
 * Actualiza el placeholder de un día del plan con el contenido generado para esa misión.
 * Reemplaza el esqueleto (is_plan_placeholder) por el guion completo, conservando
 * scheduled_date y tag, así el item se queda en Mi calendario + Mis ideas (no en Biblioteca).
 */
export async function updateRetoMissionItem(
  userId: string,
  itemId: string,
  item: {
    type: 'reel'
    title: string
    service: string
    objective: string
    category: string
    format: string
    script: { hook: string; context: string; solution: string; cta: string }
    caption: string
    visual_idea: string
    recording_tip: string
    day: number
  },
  isDemoMode: boolean
): Promise<void> {
  const contentJson = {
    script: item.script,
    recording_tip: item.recording_tip,
    category: item.category,
    mission_day: item.day,
    is_plan_placeholder: false,
  }
  if (isDemoMode) {
    demoUpdatePlan(itemId, {
      title: item.title,
      service: item.service,
      objective: item.objective,
      format: item.format,
      content_json: contentJson,
      caption_with_hashtags: item.caption || null,
      visual_idea: item.visual_idea || null,
      reto_status: 'idea',
    })
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').update({
    title: item.title,
    service: item.service,
    objective: item.objective,
    format: item.format,
    content_json: contentJson,
    caption_with_hashtags: item.caption || null,
    visual_idea: item.visual_idea || null,
    reto_status: 'idea',
  }).eq('id', itemId)
}