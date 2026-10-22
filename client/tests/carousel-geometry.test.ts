// Tests de la geometría viva del editor de carruseles (lib/carousel/geometry.ts).
// Patrón del proyecto: helpers puros, sin canvas — la geometría es la API.
// El snapshot de números compara la tabla contra los LITERALES de render.ts:
// si alguien cambian la geometría del render sin actualizar la tabla, chilla aquí.

import { describe, expect, it } from 'vitest'
import {
  PickableBox,
  SIZE_FACTOR_RANGE,
  TEXT_GEOMETRY,
  TextEntry,
  applyTextBoxAdjust,
  pickTextBox,
  sizeFactorFor,
  textEntriesFor,
} from '@/lib/carousel/geometry'
import { SLIDE_H, SLIDE_W } from '@/lib/carousel/types'

const families = ['minimal', 'beauty', 'bold', 'editorial'] as const
const layouts = ['cover', 'cover-photo', 'text', 'text-photo', 'list', 'cta'] as const

describe('TEXT_GEOMETRY — snapshot contra literales de render.ts', () => {
  it('cubre todas las familias × layouts (entries no vacíos)', () => {
    for (const f of families) {
      for (const l of layouts) {
        const entries = textEntriesFor(f, l)
        expect(entries.length, `${f}/${l}`).toBeGreaterThan(0)
        for (const e of entries) {
          expect(e.id.length, `${f}/${l}`).toBeGreaterThan(0)
          expect(e.box.w).toBeGreaterThan(0)
        }
      }
    }
  })

  it('minimal: literales originales de render.ts', () => {
    const g = TEXT_GEOMETRY.minimal
    expect(g.cover).toEqual([{ id: 'text', kind: 'fitted', box: { x: 96, y: 420, w: 888, h: 640 } }])
    expect(g['cover-photo']).toEqual([{ id: 'text', kind: 'fitted', box: { x: 96, y: 990, w: 888, h: 260 } }])
    expect(g.text).toEqual([{ id: 'text', kind: 'fitted', box: { x: 96, y: 420, w: 888, h: 660 } }])
    expect(g['text-photo']).toEqual([{ id: 'text', kind: 'fitted', box: { x: 96, y: 260, w: 888, h: 380 } }])
    expect(g.list).toEqual([{ id: 'text', kind: 'list-flow', box: { x: 96, y: 340, w: 888, h: 0 } }])
    expect(g.cta).toEqual([{ id: 'text', kind: 'fitted', box: { x: 96, y: 480, w: 888, h: 560 } }])
  })

  it('beauty: literales originales (m=88, w=904)', () => {
    expect(TEXT_GEOMETRY.beauty.list).toEqual([{ id: 'text', kind: 'list-flow', box: { x: 88, y: 350, w: 904, h: 0 } }])
    expect(TEXT_GEOMETRY.beauty['cover-photo']?.[0]?.box.y).toBe(SLIDE_H - 470)
    expect(TEXT_GEOMETRY.beauty['text-photo']?.[0]?.box).toEqual({ x: 88, y: 940, w: 904, h: 300 })
  })

  it('bold: literales originales (m=90, w=900)', () => {
    expect(TEXT_GEOMETRY.bold.cover).toEqual([{ id: 'text', kind: 'fitted', box: { x: 90, y: 460, w: 900, h: 600 } }])
    expect(TEXT_GEOMETRY.bold['cover-photo']?.[0]?.box.y).toBe(SLIDE_H - 620)
    expect(TEXT_GEOMETRY.bold.list).toEqual([{ id: 'text', kind: 'list-flow', box: { x: 90, y: 360, w: 900, h: 0 } }])
    expect(TEXT_GEOMETRY.bold.text).toEqual([{ id: 'text', kind: 'fitted', box: { x: 90, y: 420, w: 900, h: 680 } }])
  })

  it('editorial: los 4 ids especiales en P3/CTA', () => {
    expect(TEXT_GEOMETRY.editorial.cover?.[0]?.kind).toBe('serif-script')
    expect(TEXT_GEOMETRY.editorial['text-photo']?.map(e => e.id)).toEqual(['headline', 'body'])
    expect(TEXT_GEOMETRY.editorial.cta?.map(e => e.id)).toEqual(['headline', 'body'])
    const eh = TEXT_GEOMETRY.editorial['text-photo']?.[0]
    expect(eh?.kind).toBe('headline-fused')
  })
})

describe('applyTextBoxAdjust', () => {
  const base = { x: 96, y: 420, w: 888, h: 640 }

  it('sin ajuste (ni null ni 0,0) ⇒ caja base intacta (bit-idéntico)', () => {
    expect(applyTextBoxAdjust(base, null)).toEqual(base)
    expect(applyTextBoxAdjust(base, { dx: 0, dy: 0, sizeFactor: 1.4 })).toEqual(base)
  })

  it('dx/dy mueven en fracción del lienzo y redondean', () => {
    const b = applyTextBoxAdjust(base, { dx: 0.05, dy: -0.04, sizeFactor: 1 })
    expect(b).toEqual({ x: base.x + Math.round(0.05 * SLIDE_W), y: base.y + Math.round(-0.04 * SLIDE_H), w: 888, h: 640 })
  })

  it('clampa dentro del lienzo en los 4 bordes (dx/dy absurdos incluidos)', () => {
    const far = applyTextBoxAdjust(base, { dx: 9, dy: 9, sizeFactor: 1 })
    expect(far.x).toBe(SLIDE_W - base.w)
    expect(far.y).toBe(SLIDE_H - base.h)
    const up = applyTextBoxAdjust(base, { dx: -9, dy: -9, sizeFactor: 1 })
    expect(up.x).toBe(0)
    expect(up.y).toBe(0)
  })

  it('NaN ⇒ sin movimiento', () => {
    expect(applyTextBoxAdjust(base, { dx: NaN as number, dy: NaN as number, sizeFactor: 1 })).toEqual(base)
  })
})

describe('sizeFactorFor', () => {
  it('solo fitted escala; clampa al rango duro', () => {
    expect(SIZE_FACTOR_RANGE).toEqual({ min: 0.6, max: 1.8 })
    expect(sizeFactorFor('fitted', { dx: 0, dy: 0, sizeFactor: 1.3 })).toBe(1.3)
    expect(sizeFactorFor('fitted', { dx: 0, dy: 0, sizeFactor: 9 })).toBe(1.8)
    expect(sizeFactorFor('fitted', { dx: 0, dy: 0, sizeFactor: 0.1 })).toBe(0.6)
  })

  it('list-flow / headline-fused / serif-script ignoran sizeFactor (solo se mueven, no escalan)', () => {
    for (const kind of ['list-flow', 'headline-fused', 'serif-script'] as const) {
      expect(sizeFactorFor(kind, { dx: 0, dy: 0, sizeFactor: 1.5 })).toBe(1)
    }
    expect(sizeFactorFor('fitted', null)).toBe(1)
  })
})

describe('pickTextBox (hit-test del editor)', () => {
  const a: PickableBox = { id: 'a', kind: 'fitted', rect: { x: 0, y: 0, w: 200, h: 100 } }
  const b: PickableBox = { id: 'b', kind: 'headline-fused', rect: { x: 120, y: 40, w: 200, h: 100 } }
  const boxes = [a, b] // b dibujado último ⇒ prioridad

  it('punto dentro de ambos ⇒ el último dibujado', () => {
    expect(pickTextBox({ x: 150, y: 60 }, boxes)?.id).toBe('b')
  })

  it('punto dentro de uno solo ⇒ ese', () => {
    expect(pickTextBox({ x: 10, y: 10 }, boxes)?.id).toBe('a')
  })

  it('punto cerca (tolerancia chebyshev) ⇒ caja más cercana', () => {
    expect(pickTextBox({ x: -10, y: 10 }, boxes)?.id).toBe('a')
    expect(pickTextBox({ x: 340, y: 200 }, boxes)).toBeNull()
    expect(pickTextBox({ x: 340, y: 200 }, boxes, 60)?.id).toBe('b')
  })

  it('lista vacía ⇒ null', () => {
    expect(pickTextBox({ x: 0, y: 0 }, [])).toBeNull()
  })
})

describe('cajas del flujo list (emitidas por el render)', () => {
  it('la entrada tiene h=0 (marca de posición; el bbox real lo emite el render)', () => {
    const entries = textEntriesFor('minimal', 'list')
    expect(entries[0].kind).toBe('list-flow')
    expect(entries[0].box.h).toBe(0)
  })

  it('aplicoAdjust a list mueve el y inicial y conserva el tipo', () => {
    const entry: TextEntry = { id: 'text', kind: 'list-flow', box: { x: 90, y: 360, w: 900, h: 0 } }
    const b = applyTextBoxAdjust(entry.box, { dx: 0, dy: 0.1, sizeFactor: 1.7 })
    expect(b.y).toBeLessThan(SLIDE_H)
    expect(sizeFactorFor(entry.kind, { dx: 0, dy: 0, sizeFactor: 1.7 })).toBe(1)
  })
})