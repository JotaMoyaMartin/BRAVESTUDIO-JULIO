/**
 * MI PLAN · un día de stories por semana (22-oct-2026).
 * Usa las secuencias listas (lib/stories/sequences.ts): rotan tipo y servicio
 * para que las stories no repitan lo mismo que el feed.
 */
import type { PlannerItem } from '@/lib/ai/prompts/planner'
import { localISODate, planStartMonday } from '@/lib/ai/prompts/planner'
import { READY_SEQUENCES, sequenceType } from '@/lib/stories/sequences'

/** Añade una secuencia de stories cada viernes de las semanas del plan. */
export function addWeeklyStories(items: PlannerItem[], services: string[], startDate?: string): PlannerItem[] {
  const dated = items.filter(i => i.suggestedDate)
  if (!dated.length) return items
  const start = planStartMonday(startDate)
  const last = dated.reduce((m, i) => (i.suggestedDate! > m ? i.suggestedDate! : m), dated[0].suggestedDate!)
  const weeks = Math.max(1, Math.floor(daysBetween(start, last) / 7) + 1)
  const used = new Set<string>()
  const usedTypes: string[] = []
  const stories: PlannerItem[] = []
  for (let w = 0; w < weeks; w++) {
    const wanted = (services[w % Math.max(1, services.length)] || '').toLowerCase()
    const pool = READY_SEQUENCES.filter(s => !used.has(s.id))
    const freshType = (t: string) => !usedTypes.includes(t)
    const seq = pool.find(s => s.service.toLowerCase() === wanted && freshType(s.type))
      ?? pool.find(s => freshType(s.type))
      ?? pool[0]
    if (!seq) break
    used.add(seq.id)
    usedTypes.push(seq.type)
    if (usedTypes.length >= 5) usedTypes.length = 0
    const d = new Date(start)
    d.setDate(start.getDate() + w * 7 + 4) // viernes
    stories.push({
      id: `story-${w}`,
      type: 'story',
      title: seq.title,
      service: seq.service,
      objective: sequenceType(seq.type).name,
      suggestedDay: 'Viernes',
      suggestedDate: localISODate(d),
      hookIdea: seq.stories[0]?.text ?? '',
      format: `Secuencia de ${seq.stories.length} stories`,
      sequenceId: seq.id,
    })
  }
  return [...items, ...stories].sort((a, b) => ((a.suggestedDate ?? '') < (b.suggestedDate ?? '') ? -1 : 1))
}

function daysBetween(start: Date, iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d, 12).getTime() - start.getTime()) / 86400000)
}
