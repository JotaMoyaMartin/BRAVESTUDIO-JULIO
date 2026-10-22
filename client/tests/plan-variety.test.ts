import { describe, expect, it } from 'vitest'
import { generateMockPlan } from '@/lib/ai/prompts/planner'
import { addWeeklyStories } from '@/lib/plan/stories-in-plan'
import { READY_SEQUENCES } from '@/lib/stories/sequences'

const base = { duration: '1month' as const, postsPerWeek: 3 as const, format: 'mixed' as const, startDate: '2026-10-22T10:00:00' }

describe('plan variado (Mi plan fase B)', () => {
  it('«mezcla» reparte los tres objetivos y rota los servicios', () => {
    const plan = generateMockPlan({ ...base, objective: 'mezcla', services: ['Rubios', 'Balayage', 'Color'] })
    const objs = new Set(plan.items.map(i => i.objective))
    expect(objs).toEqual(new Set(['autoridad', 'reservas', 'visibilidad']))
    expect(new Set(plan.items.map(i => i.service)).size).toBe(3)
    expect(new Set(plan.items.map(i => i.title)).size).toBe(plan.items.length)
  })

  it('añade una secuencia de stories cada viernes, sin repetir', () => {
    const plan = generateMockPlan({ ...base, objective: 'mezcla', services: ['Rubios', 'Balayage'] })
    const all = addWeeklyStories(plan.items, ['Rubios', 'Balayage'], base.startDate)
    const stories = all.filter(i => i.type === 'story')
    expect(stories).toHaveLength(4)
    for (const st of stories) {
      const [y, m, d] = st.suggestedDate!.split('-').map(Number)
      expect(new Date(y, m - 1, d).getDay()).toBe(5)
      expect(READY_SEQUENCES.some(s => s.id === st.sequenceId)).toBe(true)
    }
    expect(new Set(stories.map(s => s.sequenceId)).size).toBe(4)
    // Ordenado por fecha
    const dates = all.map(i => i.suggestedDate!)
    expect([...dates].sort()).toEqual(dates)
  })
})
