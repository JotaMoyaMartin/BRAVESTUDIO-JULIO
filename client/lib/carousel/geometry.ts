// Geometría viva del motor de carruseles — tabla de cajas de texto BASE por
// familia×layout (patrón EDITORIAL_GEOMETRY). Los números son los literales de
// render.ts extraídos tal cual (test de snapshot: si el render cambia su
// geometría sin actualizar la tabla, la no-regresión chilla).
//
// Flujo: el render CONSULTA esta tabla (caja base), aplica el TextAdjust del
// editor y EMITE la caja final usada (emitTextBox). El hit-test del editor
// usa las cajas emitidas: una sola fuente de verdad, cero divergencia.
// Sin textAdjust ⇒ caja base sin transformar ⇒ render bit-idéntico al de prod.

import { CarouselFamily, SlideLayout, SLIDE_H, SLIDE_W, TextAdjust, TextEntry } from './types'

export type { TextEntry } from './types'
import { EDITORIAL_GEOMETRY } from './assets'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Los h=0 en list-flow son la marca de posición (y) del flujo; la caja REAL
// (bbox acumulado post-fit) la emite el render tras dibujar.
export const TEXT_GEOMETRY: Record<CarouselFamily, Partial<Record<SlideLayout, TextEntry[]>>> = {
  minimal: {
    cover: [{ id: 'text', kind: 'fitted', box: { x: 96, y: 420, w: 888, h: 640 } }],
    'cover-photo': [{ id: 'text', kind: 'fitted', box: { x: 96, y: 990, w: 888, h: 260 } }],
    text: [{ id: 'text', kind: 'fitted', box: { x: 96, y: 420, w: 888, h: 660 } }],
    'text-photo': [{ id: 'text', kind: 'fitted', box: { x: 96, y: 260, w: 888, h: 380 } }],
    list: [{ id: 'text', kind: 'list-flow', box: { x: 96, y: 340, w: 888, h: 0 } }],
    cta: [{ id: 'text', kind: 'fitted', box: { x: 96, y: 480, w: 888, h: 560 } }],
  },
  beauty: {
    cover: [{ id: 'text', kind: 'fitted', box: { x: 88, y: 440, w: 904, h: 620 } }],
    'cover-photo': [{ id: 'text', kind: 'fitted', box: { x: 88, y: SLIDE_H - 470, w: 904, h: 330 } }],
    text: [{ id: 'text', kind: 'fitted', box: { x: 88, y: 420, w: 904, h: 700 } }],
    'text-photo': [{ id: 'text', kind: 'fitted', box: { x: 88, y: 940, w: 904, h: 300 } }],
    list: [{ id: 'text', kind: 'list-flow', box: { x: 88, y: 350, w: 904, h: 0 } }],
    cta: [{ id: 'text', kind: 'fitted', box: { x: 88, y: 500, w: 904, h: 560 } }],
  },
  bold: {
    cover: [{ id: 'text', kind: 'fitted', box: { x: 90, y: 460, w: 900, h: 600 } }],
    'cover-photo': [{ id: 'text', kind: 'fitted', box: { x: 90, y: SLIDE_H - 620, w: 900, h: 420 } }],
    text: [{ id: 'text', kind: 'fitted', box: { x: 90, y: 420, w: 900, h: 680 } }],
    'text-photo': [{ id: 'text', kind: 'fitted', box: { x: 90, y: 300, w: 900, h: 420 } }],
    list: [{ id: 'text', kind: 'list-flow', box: { x: 90, y: 360, w: 900, h: 0 } }],
    cta: [{ id: 'text', kind: 'fitted', box: { x: 90, y: 520, w: 900, h: 520 } }],
  },
  editorial: {
    cover: [{ id: 'text', kind: 'serif-script', box: { ...EDITORIAL_GEOMETRY.cover.titleBox } }],
    'cover-photo': [{ id: 'text', kind: 'serif-script', box: { ...EDITORIAL_GEOMETRY.cover.titleBox } }],
    text: [{ id: 'text', kind: 'fitted', box: { ...EDITORIAL_GEOMETRY.statement.textBox } }],
    list: [{ id: 'text', kind: 'fitted', box: { ...EDITORIAL_GEOMETRY.statement.textBox } }],
    'text-photo': [
      { id: 'headline', kind: 'headline-fused', box: { ...EDITORIAL_GEOMETRY.photoEditorial.headline } },
      { id: 'body', kind: 'fitted', box: { ...EDITORIAL_GEOMETRY.photoEditorial.cta } },
    ],
    cta: [
      { id: 'headline', kind: 'fitted', box: { x: 118, y: 380, w: SLIDE_W - 236, h: 420 } },
      { id: 'body', kind: 'fitted', box: { x: 122, y: 980, w: SLIDE_W - 244, h: 180 } },
    ],
  },
}

export function textEntriesFor(family: CarouselFamily, layout: SlideLayout): TextEntry[] {
  return TEXT_GEOMETRY[family]?.[layout] ?? []
}

// ── Ajuste + clamp ───────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Rango de tamaño permitido — la UI usa 0.1 de paso; los extremos son duros. */
export const SIZE_FACTOR_RANGE = { min: 0.6, max: 1.8 } as const

/** El clamp del dx/dy depende del ancho de la caja (no dejar huecos al borde). */
export function applyTextBoxAdjust(base: Rect, adjust?: TextAdjust | null): Rect {
  if (!adjust || (adjust.dx === 0 && adjust.dy === 0)) return { x: base.x, y: base.y, w: base.w, h: base.h }
  const dx = clamp(Number.isFinite(adjust.dx) ? adjust.dx : 0, -1, 1) * SLIDE_W
  const dy = clamp(Number.isFinite(adjust.dy) ? adjust.dy : 0, -1, 1) * SLIDE_H
  const x = Math.round(clamp(base.x + dx, 0, SLIDE_W - base.w))
  const y = Math.round(clamp(base.y + dy, 0, SLIDE_H - base.h))
  return { x, y, w: base.w, h: base.h }
}

/** El resize SOLO aplica a bloques 'fitted' (lists y titulares compuestos se mueven, no escalan). */
export function sizeFactorFor(kind: TextEntry['kind'], adjust?: TextAdjust | null): number {
  if (kind !== 'fitted' || !adjust || !Number.isFinite(adjust.sizeFactor)) return 1
  return clamp(adjust.sizeFactor, SIZE_FACTOR_RANGE.min, SIZE_FACTOR_RANGE.max)
}

// ── Hit-test (emitted boxes, coords de canvas) ───────────────────────────────

export interface PickableBox {
  id: string
  kind: TextEntry['kind']
  rect: Rect
}

/**
 * Devuelve la caja pinada dentro del rect (prioridad al último dibujado) o,
 * fuera, la más cercana dentro de `tolerance` px de canvas (chebyshev).
 */
export function pickTextBox(point: { x: number; y: number }, boxes: PickableBox[], tolerance = 24): PickableBox | null {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i]
    if (point.x >= b.rect.x && point.x <= b.rect.x + b.rect.w && point.y >= b.rect.y && point.y <= b.rect.y + b.rect.h) {
      return b
    }
  }
  let best: PickableBox | null = null
  let bestD = Infinity
  for (const b of boxes) {
    const dx = Math.max(b.rect.x - point.x, 0, point.x - (b.rect.x + b.rect.w))
    const dy = Math.max(b.rect.y - point.y, 0, point.y - (b.rect.y + b.rect.h))
    const d = Math.max(dx, dy)
    if (d <= tolerance && d < bestD) {
      best = b
      bestD = d
    }
  }
  return best
}