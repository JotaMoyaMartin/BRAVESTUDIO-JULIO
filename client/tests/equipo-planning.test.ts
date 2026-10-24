import { describe, expect, it } from 'vitest'
import { pendingApprovals, planningToPubs, type TeamPlanningLite } from '@/lib/equipo/from-planning'

const base: TeamPlanningLite = {
  id: 'p1', clientId: 'cl-mayte', week: 2, month: 'Octubre 2026', status: 'enviada', shareToken: 'abc123def456', weekStartDate: '2026-10-19',
  publications: [
    { id: 'a', type: 'reel', title: 'Antes y después', day: 'Martes', markedReadyAt: null },
    { id: 'b', type: 'carrusel', title: '5 errores', day: 'Jueves', markedReadyAt: '2026-10-18T10:00:00Z' },
    { id: 'c', type: 'reel', title: 'Programado', day: 'Domingo', scheduledDate: '2026-10-20T12:00:00Z' },
    { id: 'd', type: 'reel', title: 'Sin día', day: null },
  ],
}

describe('Lo que publicamos · desde la planificación del equipo', () => {
  it('calcula la fecha con el día de la semana y el estado', () => {
    const pubs = planningToPubs(base, new Date(2026, 9, 24))
    expect(pubs.map(p => [p.id, p.fecha, p.estado])).toEqual([
      ['a', '2026-10-20', 'preparando'],
      ['b', '2026-10-22', 'listo'],
      ['c', '2026-10-20', 'publicado'],
    ])
  })
  it('los borradores internos no se enseñan a la clienta', () => {
    expect(planningToPubs({ ...base, status: 'borrador' })).toEqual([])
    expect(planningToPubs({ ...base, status: 'lista_revision' })).toEqual([])
  })
  it('avisa de lo que espera su aprobación', () => {
    expect(pendingApprovals([base, { ...base, id: 'p2', status: 'aprobada' }])).toEqual([{ token: 'abc123def456', week: 2, month: 'Octubre 2026' }])
  })
  it('si falta material, se lo dice', () => {
    const p = planningToPubs({ ...base, publications: [{ id: 'x', type: 'reel', title: 'R', day: 'Lunes', blockedNoMaterial: true, blockedReason: 'el vídeo del balayage' }] })
    expect(p[0].nota).toBe('Tu equipo necesita tu material: el vídeo del balayage')
  })
})
