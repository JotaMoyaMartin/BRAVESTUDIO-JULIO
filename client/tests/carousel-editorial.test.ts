import { describe, expect, it } from 'vitest'
import { EDITORIAL_GEOMETRY, polaroidHoleRect, splitForWhite } from '@/lib/carousel/assets'
import { CAROUSEL_FAMILIES, getFamily } from '@/lib/carousel/templates'
import { SLIDE_W, SLIDE_H } from '@/lib/carousel/types'

// Familia Editorial: validamos la GEOMETRÍA extraída del PDF (DISEÑO 3) y la
// lógica pura del efecto "blanco sobre foto". Todo dentro del canvas 1080×1350.

function inCanvas(r: { x: number; y: number; w: number; h: number }): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= SLIDE_W && r.y + r.h <= SLIDE_H
}

describe('Editorial — geometría (canvas 1080×1350)', () => {
  it('los rects de portada caben en el canvas', () => {
    const G = EDITORIAL_GEOMETRY.cover
    for (const r of [G.sheet, G.polaroid, G.clip, G.titleBox]) {
      expect(inCanvas(r), JSON.stringify(r)).toBe(true)
    }
  })

  it('los rects de statement caben en el canvas', () => {
    const G = EDITORIAL_GEOMETRY.statement
    for (const r of [G.sheet, G.polaroid, G.clip, G.textBox]) {
      expect(inCanvas(r), JSON.stringify(r)).toBe(true)
    }
  })

  it('los rects de editorial-foto caben en el canvas', () => {
    const G = EDITORIAL_GEOMETRY.photoEditorial
    for (const r of [G.photo, G.headline, G.cta]) {
      expect(inCanvas(r), JSON.stringify(r)).toBe(true)
    }
    for (const y of G.strips) expect(y >= 0 && y <= SLIDE_H).toBe(true)
  })

  it('hueco del polaroid ⊂ rect del polaroid, en ambas escalas (521 natural / 480 portada)', () => {
    const statement = EDITORIAL_GEOMETRY.statement.polaroid // natural 521×574
    const coverW = 480
    const cover = { x: EDITORIAL_GEOMETRY.cover.polaroid.x, y: EDITORIAL_GEOMETRY.cover.polaroid.y, w: coverW, h: (coverW / 521) * 574 }
    for (const p of [statement, cover]) {
      const hole = polaroidHoleRect(p)
      expect(hole.x).toBeGreaterThanOrEqual(p.x)
      expect(hole.y).toBeGreaterThanOrEqual(p.y)
      expect(hole.x + hole.w).toBeLessThanOrEqual(p.x + p.w)
      expect(hole.y + hole.h).toBeLessThanOrEqual(p.y + p.h)
      expect(hole.w).toBeGreaterThan(0)
      expect(hole.h).toBeGreaterThan(0)
    }
  })
})

describe('splitForWhite — split blanco sobre foto', () => {
  const sizes = (text: string, size: number): number[] => Array.from({ length: text.length }, () => size * 0.5)

  it('línea que no llega a la foto → todo negro, sin sufijo', () => {
    const r = splitForWhite('HOY', 100, sizes('HOY', 60), 456)
    expect(r.blackChars).toBe(3)
    expect(r.hasWhite).toBe(false)
  })

  it('la foto empieza antes del texto → todo blanco', () => {
    const r = splitForWhite('HOY', 500, sizes('HOY', 60), 456)
    expect(r.blackChars).toBe(0)
    expect(r.hasWhite).toBe(true)
  })

  it('el sufijo empieza en el primer char cuyo inicio ≥ photoLeft−2', () => {
    // photoLeft=456 → frontera 454. Línea en x=100 con char de 30px: el char i
    // empieza en 100+30i → primero ≥ 454 es i=12 (empieza en 460) → blackChars=12.
    const r = splitForWhite('ABCDEFGHIJKLM', 100, sizes('ABCDEFGHIJKLM', 60), 456)
    expect(r.blackChars).toBe(12)
    expect(r.hasWhite).toBe(true)
  })

  it('un char que empieza JUSTO en photoLeft−2 ya es blanco', () => {
    const r = splitForWhite('AB', 454, sizes('AB', 60), 456)
    expect(r.blackChars).toBe(0)
    expect(r.hasWhite).toBe(true)
  })

  it('un char que empieza 2px antes de la frontera queda negro', () => {
    const r = splitForWhite('AB', 452, sizes('AB', 60), 456)
    expect(r.blackChars).toBe(1)
    expect(r.hasWhite).toBe(true)
  })

  it('línea vacía → sin blanco', () => {
    const r = splitForWhite('', 100, [], 456)
    expect(r.blackChars).toBe(0)
    expect(r.hasWhite).toBe(false)
  })
})

describe('familia Editorial — registro', () => {
  it('está registrada en CAROUSEL_FAMILIES con una única paleta', () => {
    const fam = getFamily('editorial')
    expect(fam.id).toBe('editorial')
    expect(fam.palettes).toHaveLength(1)
    expect(CAROUSEL_FAMILIES.some(f => f.id === 'editorial')).toBe(true)
    expect(fam.palettes[0].bg).toBe('#E2E0D5')
  })
})