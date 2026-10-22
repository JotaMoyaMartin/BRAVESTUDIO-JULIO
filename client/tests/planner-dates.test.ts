import { describe, expect, it } from 'vitest'
import { generateMockPlan, localISODate, planStartMonday } from '@/lib/ai/prompts/planner'

const DAY_INDEX: Record<string, number> = { Domingo: 0, Lunes: 1, Martes: 2, 'Miércoles': 3, Jueves: 4, Viernes: 5, 'Sábado': 6 }

describe('fechas del plan', () => {
  it('empieza en lunes (hoy si es lunes, si no el siguiente)', () => {
    expect(planStartMonday('2026-10-22T10:00:00').getDay()).toBe(1) // jueves → lunes 26
    expect(localISODate(planStartMonday('2026-10-22T10:00:00'))).toBe('2026-10-26')
    expect(localISODate(planStartMonday('2026-10-26T10:00:00'))).toBe('2026-10-26')
  })

  it('el día que se muestra coincide con la fecha real', () => {
    const plan = generateMockPlan({ duration: '1month', postsPerWeek: 3, format: 'mixed', objective: 'autoridad', services: ['Balayage'], startDate: '2026-10-22T10:00:00' })
    for (const it of plan.items) {
      const [y, m, d] = it.suggestedDate!.split('-').map(Number)
      expect(new Date(y, m - 1, d).getDay(), `${it.suggestedDay} ${it.suggestedDate}`).toBe(DAY_INDEX[it.suggestedDay])
    }
  })
})
