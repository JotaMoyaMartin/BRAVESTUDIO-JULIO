import { describe, expect, it } from 'vitest'
import { monthProgress, nextFreeDay, nextStatus, planStatus } from '@/lib/plan/progress'

describe('Mi plan · estados', () => {
  it('sin estado guardado es «idea» y el ciclo es idea → preparado → publicado → idea', () => {
    expect(planStatus({ content_json: {} })).toBe('idea')
    expect(planStatus({ content_json: { plan_status: 'publicado' } })).toBe('publicado')
    expect(planStatus({ content_json: { plan_status: 'raro' } })).toBe('idea')
    expect(nextStatus('idea')).toBe('preparado')
    expect(nextStatus('preparado')).toBe('publicado')
    expect(nextStatus('publicado')).toBe('idea')
  })

  it('el contador solo cuenta el mes en curso', () => {
    const items = [
      { scheduled_date: '2026-10-05', content_json: { plan_status: 'publicado' } },
      { scheduled_date: '2026-10-12', content_json: { plan_status: 'preparado' } },
      { scheduled_date: '2026-10-19', content_json: {} },
      { scheduled_date: '2026-11-02', content_json: { plan_status: 'publicado' } },
    ]
    expect(monthProgress(items, new Date(2026, 9, 22))).toEqual({ total: 3, done: 1, ready: 1 })
  })

  it('propone el primer día libre a partir de mañana', () => {
    const from = new Date(2026, 9, 22)
    expect(nextFreeDay([], from)).toBe('2026-10-23')
    expect(nextFreeDay(['2026-10-23', '2026-10-24'], from)).toBe('2026-10-25')
  })
})
