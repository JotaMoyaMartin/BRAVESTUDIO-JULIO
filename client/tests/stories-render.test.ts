// Tests del motor de render de stories (lib/stories/render.ts).
// Patrón carousel.test.ts: helpers puros con Measure sintética inyectada;
// sin canvas — la geometría es la API (el render la consume).

import { describe, expect, it } from 'vitest'
import {
  STORY_H,
  STORY_PALETTES,
  STORY_W,
  clampOverlayTestable,
  defaultStoryVisual,
  layoutStoryText,
  resolveStoryTextBox,
  storyExportFileName,
  storyPalette,
} from '@/lib/stories/render'
import type { Measure } from '@/lib/carousel/text'
import type { StoryVisual } from '@/lib/editor/types'

const measure: Measure = (text, size) => text.length * size * 0.5

const visual = (over: Partial<StoryVisual> = {}): StoryVisual => ({ ...defaultStoryVisual(), ...over })

describe('resolveStoryTextBox', () => {
  it('sin ajuste: banda centrada con ancho 84%', () => {
    const b = resolveStoryTextBox(visual())
    expect(b.w).toBe(Math.round(STORY_W * 0.84))
    expect(b.h).toBe(Math.round(STORY_H * 0.42))
    expect(b.x).toBe(Math.round((STORY_W - b.w) / 2))
    expect(b.y).toBe(Math.round((STORY_H - b.h) / 2))
  })

  it('dx/dy mueven la banda en fracción del lienzo', () => {
    const b = resolveStoryTextBox(visual({ text: { dx: 0.05, dy: 0.05, sizeFactor: 1 } }))
    expect(b.x).toBe(Math.round((STORY_W - Math.round(STORY_W * 0.84)) / 2) + Math.round(0.05 * STORY_W))
    expect(b.y).toBe(Math.round((STORY_H - Math.round(STORY_H * 0.42)) / 2) + Math.round(0.05 * STORY_H))
  })

  it('clampa dentro del lienzo en los 4 bordes', () => {
    const far = resolveStoryTextBox(visual({ text: { dx: 5, dy: 5, sizeFactor: 1 } }))
    expect(far.x).toBeGreaterThanOrEqual(20)
    expect(far.x + far.w).toBeLessThanOrEqual(STORY_W - 20)
    expect(far.y + far.h).toBeLessThanOrEqual(STORY_H - Math.round(STORY_H * 0.08))
    const up = resolveStoryTextBox(visual({ text: { dx: 0, dy: -5, sizeFactor: 1 } }))
    expect(up.y).toBeGreaterThanOrEqual(Math.round(STORY_H * 0.08))
  })
})

describe('layoutStoryText', () => {
  it('centra verticalmente la caja final dentro de la banda', () => {
    const l = layoutStoryText('Hola bonita', visual(), measure)
    const inner = l.rect.y - l.band.y
    const slack = l.band.h - l.rect.h
    expect(Math.round(inner)).toBe(Math.round(slack / 2))
    expect(l.rect.h).toBeGreaterThan(0)
  })

  it('el fit respeta el minSize configurado por sizeFactor (palabras separadas, sí envuelve)', () => {
    const sf = 0.7
    const monster = Array.from({ length: 400 }, () => 'palabra').join(' ')
    const l = layoutStoryText(monster, visual({ text: { dx: 0, dy: 0, sizeFactor: sf } }), measure)
    expect(l.size).toBe(Math.max(24, Math.round(34 * sf)))
  })

  it('sizeFactor mayor sube el tamaño con texto corto', () => {
    const a = layoutStoryText('Hola', visual(), measure)
    const b = layoutStoryText('Hola', visual({ text: { dx: 0, dy: 0, sizeFactor: 1.6 } }), measure)
    expect(b.size).toBeGreaterThan(a.size)
  })

  it('respeta saltos de línea del autor', () => {
    const l = layoutStoryText('Primera línea\nsegunda', visual(), measure)
    expect(l.lines.length).toBe(2)
    expect(l.lines[0]).toBe('Primera línea')
  })
})

describe('paletas y export', () => {
  it('storyPalette cae a granate con id desconocido', () => {
    expect(storyPalette('desconocida').id).toBe('granate')
    expect(STORY_PALETTES.length).toBeGreaterThanOrEqual(3)
  })

  it('defaultStoryVisual: degradado + centro + overlay 0.3', () => {
    const d = defaultStoryVisual()
    expect(d.background).toBe('gradient')
    expect(d.text).toEqual({ dx: 0, dy: 0, sizeFactor: 1 })
    expect(d.overlay).toBe(0.3)
    expect(d.photo).toBeNull()
  })

  it('storyExportFileName numera y totaliza', () => {
    expect(storyExportFileName(1, 3)).toBe('story-01de3.jpg')
    expect(storyExportFileName(2, 1)).toBe('story-02.jpg')
    expect(storyExportFileName(0, 3)).toBe('story-01de3.jpg')
  })
})

describe('clampOverlayTestable', () => {
  it('clampa 0..0.55', () => {
    expect(clampOverlayTestable(-1)).toBe(0)
    expect(clampOverlayTestable(3)).toBe(0.55)
    expect(clampOverlayTestable(0.4)).toBe(0.4)
    expect(clampOverlayTestable(NaN)).toBe(0)
  })
})