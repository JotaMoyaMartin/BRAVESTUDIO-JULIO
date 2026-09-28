import { describe, it, expect } from 'vitest'
import {
  decideToday,
  pickLastPendingItem,
  pickRetoTodayStatus,
  localISODate,
  getWeekKey,
  priorityDisplay,
  buildBraviLine,
  TodayInput,
} from '@/lib/home-today'

const over: TodayInput = {
  brandState: 'complete',
  isPremium: false,
  retoActive: false,
  retoDay: 1,
  retoMissionTitle: null,
  retoTodayItemStatus: null,
  scheduledToday: [],
  lastPendingItem: null,
  mainPriority: null,
  starService: null,
  todayISO: '2026-09-28',
  weekCreated: 0,
  weekPublished: 0,
  weeklyTarget: null,
}

function input(patch: Partial<TodayInput>): TodayInput {
  return { ...over, ...patch }
}

describe('decideToday — acción principal', () => {
  it('sin marca → cuenta sobre tu negocio · 2 min · Completar mi perfil', () => {
    const { primary } = decideToday(input({ brandState: null }))
    expect(primary.kind).toBe('marca')
    expect(primary.title).toBe('Cuéntame sobre tu negocio')
    expect(primary.timeLabel).toBe('2 MIN')
    expect(primary.ctaHref).toBe('/mi-marca')
    expect(primary.ctaLabel).toBe('Completar mi perfil')
  })

  it('marca partial → generar estrategia (deep-link)', () => {
    const { primary } = decideToday(input({ brandState: 'partial' }))
    expect(primary.kind).toBe('marca')
    expect(primary.ctaHref).toBe('/mi-marca#estrategia-generada')
    expect(primary.ctaLabel).toBe('Generar mi estrategia')
  })

  it('premium nunca cae en marca aunque brandState sea null', () => {
    const { primary } = decideToday(input({ brandState: null, isPremium: true, mainPriority: 'constancia' }))
    expect(primary.kind).not.toBe('marca')
    expect(primary.kind).toBe('sugerencia')
  })

  it('continuar algo empezado gana a la misión del reto (precedencia v2)', () => {
    const { primary } = decideToday(
      input({ retoActive: true, retoDay: 7, lastPendingItem: { title: 'Rutina rubios', section: null } }),
    )
    expect(primary.kind).toBe('continuar')
    expect(primary.title).toContain('Rutina rubios')
  })

  it('reto activo sin item de hoy → misión de hoy', () => {
    const { primary } = decideToday(input({ retoActive: true, retoDay: 7, retoMissionTitle: 'Preséntate a cámara' }))
    expect(primary.kind).toBe('reto-mision')
    expect(primary.reason).toContain('Día 7 de 30 · Preséntate a cámara')
    expect(primary.ctaHref).toBe('/reto-10k')
  })

  it('reto activo grabado → termina tu reel del día', () => {
    const { primary } = decideToday(input({ retoActive: true, retoDay: 5, retoTodayItemStatus: 'grabado' }))
    expect(primary.kind).toBe('reto-continuar')
    expect(primary.title).toContain('día 5')
  })

  it('reto activo ya publicado → la misión no captura', () => {
    const { primary } = decideToday(input({ retoActive: true, retoDay: 5, retoTodayItemStatus: 'publicado' }))
    expect(primary.kind).toBe('sugerencia')
  })

  it('contenidos programados hoy → publicar hoy', () => {
    const { primary } = decideToday(input({ scheduledToday: [{ id: '1', title: 'Balayage', type: 'reel' }] }))
    expect(primary.kind).toBe('publicar-hoy')
    expect(primary.reason).toContain('Balayage')
    expect(primary.ctaHref).toBe('/calendario')
  })

  it('varios programados hoy → cuenta en el reason', () => {
    const { primary } = decideToday(
      input({
        scheduledToday: [
          { id: '1', title: 'A', type: 'reel' },
          { id: '2', title: 'B', type: 'carrusel' },
        ],
      }),
    )
    expect(primary.kind).toBe('publicar-hoy')
    expect(primary.reason).toContain('2 contenidos')
  })

  it('sugerencia por prioridad citas usa el servicio estrella', () => {
    const { primary } = decideToday(input({ mainPriority: 'citas', starService: 'Balayage' }))
    expect(primary.kind).toBe('sugerencia')
    expect(primary.title).toContain('Balayage')
    expect(primary.ctaHref).toBe('/crear-contenido?service=Balayage&type=reel')
  })

  it('sugerencia constancia → planificar · 5 min', () => {
    const { primary } = decideToday(input({ mainPriority: 'constancia' }))
    expect(primary.ctaHref).toBe('/planificar')
    expect(primary.timeLabel).toBe('5 MIN')
  })

  it('sin prioridad → sugerencia genérica', () => {
    const { primary } = decideToday(input({}))
    expect(primary.kind).toBe('sugerencia')
    expect(primary.ctaHref).toBe('/crear-contenido')
  })

  it('precedencia total: marca > continuar > reto > publicar > sugerencia', () => {
    const full = {
      retoActive: true,
      retoDay: 4,
      scheduledToday: [{ id: '1', title: 'X', type: 'reel' }],
      lastPendingItem: { title: 'Y', section: null as string | null },
    }
    expect(decideToday(input({ brandState: 'partial', ...full })).primary.kind).toBe('marca')
    expect(decideToday(input({ ...full })).primary.kind).toBe('continuar')
    expect(
      decideToday(input({ ...full, lastPendingItem: null })).primary.kind,
    ).toBe('reto-mision')
    expect(
      decideToday(input({ ...full, lastPendingItem: null, retoTodayItemStatus: 'publicado' })).primary.kind,
    ).toBe('publicar-hoy')
    expect(decideToday(input({})).primary.kind).toBe('sugerencia')
  })
})

describe('decideToday — DESPUÉS (máx 2, solo real)', () => {
  it('sin señales reales → lista vacía (no inventa)', () => {
    const { after } = decideToday(input({}))
    expect(after).toEqual([])
  })

  it('reto activo publicado + nada más → after vacío', () => {
    const { after } = decideToday(input({ retoActive: true, retoDay: 5, retoTodayItemStatus: 'publicado' }))
    expect(after).toEqual([])
  })

  it('primary continuar deja la misión del reto en after', () => {
    const { after } = decideToday(
      input({ retoActive: true, retoDay: 7, lastPendingItem: { title: 'Rutina', section: null } }),
    )
    expect(after[0]).toEqual({ label: 'Misión del Reto · Día 7', href: '/reto-10k' })
  })

  it('programado hoy con primary continuar → publica en after', () => {
    const { after } = decideToday(
      input({ scheduledToday: [{ id: '1', title: 'Look rubio', type: 'reel' }], lastPendingItem: { title: 'Rutina', section: null } }),
    )
    expect(after[0]).toEqual({ label: 'Publica "Look rubio"', href: '/calendario' })
  })

  it('marca primary deja el pendiente en after', () => {
    const { after } = decideToday(
      input({ brandState: 'partial', lastPendingItem: { title: 'Rutina', section: 'biblioteca' } }),
    )
    expect(after[0]).toEqual({ label: 'Continúa "Rutina"', href: '/biblioteca' })
  })

  it('máximo 2 acciones', () => {
    const { after } = decideToday(
      input({
        retoActive: true,
        retoDay: 7,
        scheduledToday: [{ id: '1', title: 'A', type: 'reel' }],
        lastPendingItem: { title: 'B', section: null },
      }),
    )
    expect(after.length).toBe(2)
  })

  it('primary continuar + reto grabado no duplica el mismo reel', () => {
    const { after } = decideToday(
      input({ retoActive: true, retoDay: 7, retoTodayItemStatus: 'grabado', lastPendingItem: { title: 'Reel día 7', section: null } }),
    )
    expect(after.some(a => a.href === '/reto-10k')).toBe(false)
  })

  it('retoNote: reto activo con primary sugerencia/publicar → true; primary reto → false', () => {
    expect(
      decideToday(input({ retoActive: true, retoDay: 5, retoTodayItemStatus: 'publicado', mainPriority: 'citas', starService: 'Rubios' })).retoNote,
    ).toBe(true)
    expect(decideToday(input({ retoActive: true, retoDay: 7, retoTodayItemStatus: 'idea' })).retoNote).toBe(false)
  })
})

describe('priorityDisplay — solo datos reales', () => {
  it('citas + estrella → "Conseguir más citas de balayage"', () => {
    expect(priorityDisplay('citas', 'Balayage')).toBe('Conseguir más citas de balayage')
  })
  it('citas sin estrella → genérica', () => {
    expect(priorityDisplay('citas', null)).toBe('Conseguir más citas')
  })
  it('reconocimiento / constancia', () => {
    expect(priorityDisplay('reconocimiento', null)).toBe('Que te reconozcan como especialista')
    expect(priorityDisplay('constancia', 'Balayage')).toBe('Publicar con constancia')
  })
  it('sin prioridad → null (no fake)', () => {
    expect(priorityDisplay(null, 'Balayage')).toBeNull()
    expect(priorityDisplay('otra', 'Balayage')).toBeNull()
  })
})

describe('buildBraviLine — contexto o desaparece', () => {
  it('con prioridad → frase con contexto real', () => {
    const line = buildBraviLine('citas', 'Balayage', 'sugerencia')
    expect(line).toContain('conseguir más citas de balayage')
    expect(line).toContain('Hoy vamos a trabajar un Reel')
  })
  it('sin prioridad → null (desaparece)', () => {
    expect(buildBraviLine(null, null, 'sugerencia')).toBeNull()
  })
  it('kind reto adapta la acción', () => {
    expect(buildBraviLine('citas', null, 'reto-mision')).toContain('hacer tu misión del Reto')
  })
})

describe('pickLastPendingItem', () => {
  it('toma el primero pendiente (lista ya ordenada por updated_at desc)', () => {
    const r = pickLastPendingItem(
      [
        { title: 'Reciente', reto_status: 'editado', status: 'library' },
        { title: 'Viejo', reto_status: 'idea', status: 'library' },
      ],
      'biblioteca',
    )
    expect(r).toEqual({ title: 'Reciente', section: 'biblioteca' })
  })

  it('ignora done y scheduled', () => {
    const r = pickLastPendingItem(
      [
        { title: 'Programado', reto_status: 'idea', status: 'scheduled' },
        { title: 'Hecho', reto_status: 'publicado', status: 'done' },
      ],
      null,
    )
    expect(r).toBeNull()
  })

  it('sin titulo usa Sin título', () => {
    const r = pickLastPendingItem([{ title: null, reto_status: 'grabado', status: 'library' }], null)
    expect(r?.title).toBe('Sin título')
  })
})

describe('pickRetoTodayStatus', () => {
  it('encuentra la misión del día y devuelve su reto_status', () => {
    const r = pickRetoTodayStatus(
      [
        { tag: 'reto-10k', reto_status: 'grabado', content_json: { mission_day: 5 } },
        { tag: 'reto-10k', reto_status: 'idea', content_json: { mission_day: 6 } },
      ],
      5,
    )
    expect(r).toBe('grabado')
  })

  it('placeholder cuenta como idea', () => {
    const r = pickRetoTodayStatus(
      [{ tag: 'reto-10k', reto_status: 'editado', content_json: { mission_day: 2, is_plan_placeholder: true } }],
      2,
    )
    expect(r).toBe('idea')
  })

  it('sin item de hoy → null', () => {
    expect(pickRetoTodayStatus([{ tag: 'reto-10k', content_json: { mission_day: 1 } }], 9)).toBeNull()
    expect(pickRetoTodayStatus([], 1)).toBeNull()
  })
})

describe('fechas', () => {
  it('localISODate formato YYYY-MM-DD con ceros', () => {
    expect(localISODate(new Date(2026, 8, 7))).toBe('2026-09-07')
    expect(localISODate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
  it('getWeekKey agrupa por semana (domingo)', () => {
    // 28 sep 2026 es lunes → misma semana que el domingo 27 y el sábado 3 oct
    expect(getWeekKey(new Date(2026, 8, 27))).toBe(getWeekKey(new Date(2026, 9, 3)))
    expect(getWeekKey(new Date(2026, 8, 28))).toBe(getWeekKey(new Date(2026, 9, 3)))
  })
})