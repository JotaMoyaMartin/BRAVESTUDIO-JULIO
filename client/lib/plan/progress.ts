/**
 * MI PLAN · fase C (22-oct-2026): estado de cada publicación y «Añadir a mi plan».
 *
 * El estado (Idea → Preparado → Publicado) se guarda en content_json.plan_status:
 * la columna `status` tiene un CHECK (library/scheduled/draft) y no hace falta
 * tocar la base de datos para esto.
 */
import type { ContentItem } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { demoSavePlan, demoUpdatePlan } from '@/lib/demo-store'

export type PlanStatus = 'idea' | 'preparado' | 'publicado'

export const PLAN_STATUSES: Array<{ id: PlanStatus; label: string; hint: string }> = [
  { id: 'idea', label: 'Idea', hint: 'Aún por crear' },
  { id: 'preparado', label: 'Preparado', hint: 'Grabado o diseñado, listo para subir' },
  { id: 'publicado', label: 'Publicado', hint: 'Ya está en Instagram' },
]

export function planStatus(item: Pick<ContentItem, 'content_json'>): PlanStatus {
  const s = (item.content_json as Record<string, unknown> | null)?.plan_status
  return s === 'preparado' || s === 'publicado' ? s : 'idea'
}

export function nextStatus(s: PlanStatus): PlanStatus {
  return s === 'idea' ? 'preparado' : s === 'preparado' ? 'publicado' : 'idea'
}

/** Cambia el estado; devuelve el item actualizado (o null si falla). */
export async function setPlanStatus(item: ContentItem, status: PlanStatus, isDemoMode: boolean): Promise<ContentItem | null> {
  const content_json = { ...((item.content_json as Record<string, unknown>) || {}), plan_status: status }
  if (isDemoMode) {
    demoUpdatePlan(item.id, { content_json })
    return { ...item, content_json } as ContentItem
  }
  const supabase = createClient()
  const { error } = await supabase.from('content_items').update({ content_json }).eq('id', item.id)
  return error ? null : ({ ...item, content_json } as ContentItem)
}

/** Progreso de un mes: cuántas publicaciones de ese mes están publicadas. */
export function monthProgress(items: Pick<ContentItem, 'scheduled_date' | 'content_json'>[], ref = new Date()) {
  const prefix = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
  const inMonth = items.filter(i => i.scheduled_date?.startsWith(prefix))
  const done = inMonth.filter(i => planStatus(i) === 'publicado').length
  const ready = inMonth.filter(i => planStatus(i) === 'preparado').length
  return { total: inMonth.length, done, ready }
}

export interface AddToPlanPayload {
  type: 'reel' | 'carrusel' | 'story'
  title: string
  service?: string | null
  content_json: Record<string, unknown>
  caption_with_hashtags?: string | null
  visual_idea?: string | null
  format?: string | null
}

/** «Añadir a mi plan»: guarda la pieza con fecha (ya preparada: viene de una herramienta). */
export async function addToPlan(userId: string, payload: AddToPlanPayload, date: string, isDemoMode: boolean, status: PlanStatus = 'preparado'): Promise<boolean> {
  const row = {
    ...payload,
    content_json: { ...payload.content_json, plan_status: status },
    scheduled_date: date,
    status: 'scheduled',
  }
  if (isDemoMode) {
    demoSavePlan(row)
    return true
  }
  const supabase = createClient()
  const { error } = await supabase.from('content_items').insert({ user_id: userId, ...row })
  return !error
}

/** Próximo día (desde mañana) sin nada programado, para proponerlo por defecto. */
export function nextFreeDay(taken: string[], from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 12)
  for (let i = 0; i < 60; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!taken.includes(iso)) return iso
    d.setDate(d.getDate() + 1)
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
