// Tests del editor de diseño de stories (producto) — helpers puros de
// lib/stories/design.ts. Patrón del proyecto: sin canvas, sin React.

import { describe, expect, it } from 'vitest'
import { emptySlide, hydrateSlide, LAB_FONT_STEPS, type LabSlide } from '@/lib/lab/carousel'
import {
  defaultBgIdForRole,
  ensureDesignSlides,
  fontScaleIndexForText,
  seedStorySlide,
  storyBgCss,
  storyDesignFileName,
} from '@/lib/stories/design'
import type { SingleStory } from '@/lib/ai/prompts/stories'

const story = (n: number, text: string): SingleStory => ({
  number: n,
  role: n === 1 ? 'Problema' : n === 2 ? 'Autoridad' : 'Resultado + Acción',
  text,
  stickerSuggestion: '',
  visualIdea: '',
})

describe('defaultBgIdForRole (espeja ROLE_GRADIENTS de StoryMockup)', () => {
  it('1 granate · 2 petróleo · 3 dorado · fuera de rango → granate', () => {
    expect(defaultBgIdForRole(1)).toBe('granate')
    expect(defaultBgIdForRole(2)).toBe('petroleo')
    expect(defaultBgIdForRole(3)).toBe('dorado')
    expect(defaultBgIdForRole(4)).toBe('granate')
    expect(defaultBgIdForRole(0)).toBe('granate')
  })
})

describe('fontScaleIndexForText (más texto = letra más pequeña)', () => {
  it('matriz por umbrales', () => {
    // 21-oct-2026: un paso más pequeño por defecto (petición de Jota)
    expect(fontScaleIndexForText(1)).toBe(3) // XL
    expect(fontScaleIndexForText(60)).toBe(3)
    expect(fontScaleIndexForText(61)).toBe(2) // L
    expect(fontScaleIndexForText(110)).toBe(2)
    expect(fontScaleIndexForText(111)).toBe(1) // M
    expect(fontScaleIndexForText(180)).toBe(1)
    expect(fontScaleIndexForText(181)).toBe(0) // S
    expect(fontScaleIndexForText(280)).toBe(0)
    expect(fontScaleIndexForText(400)).toBe(0)
  })
})

describe('seedStorySlide: propuesta montada igual que los mockups', () => {
  it('texto IA + degradado de rol + fontScale auto y centrado sin foto', () => {
    const s = seedStorySlide(story(2, 'x'.repeat(150)))
    expect(s.text).toBe('x'.repeat(150))
    expect(s.bgId).toBe('petroleo')
    expect(s.font).toBe('poppins')
    expect(s.color).toBe('white')
    expect(s.overlay).toBe(0) // degradado LIMPIO (nada de velo)
    expect(s.fontScale).toBe(LAB_FONT_STEPS[1]) // 150 chars → paso M
    expect(s.x).toBe(0.5)
    expect(s.y).toBe(0.5)
    expect(s.photoSrc).toBeNull()
    expect(s.photoId).toBeNull()
    expect(s.zoom).toBe(1)
    expect(s.bw).toBe(false)
  })

  it('textos muy largos caen al paso S y muy cortos al XL (multiplicadores)', () => {
    expect(seedStorySlide(story(1, 'corta')).fontScale).toBe(LAB_FONT_STEPS[3]) // XL
    expect(seedStorySlide(story(3, 'y'.repeat(320))).fontScale).toBe(LAB_FONT_STEPS[0]) // S
  })
})

describe('ensureDesignSlides: hidrata + siembra + poda (idempotente)', () => {
  const stories3 = [story(3, 'cierre'), story(1, 'hola'), story(2, 'medio')]

  it('siembra TODAS las stories aunque vengan desordenadas', () => {
    const out = ensureDesignSlides(stories3, {})
    expect(Object.keys(out).sort()).toEqual(['1', '2', '3'])
    expect(out[1].text).toBe('hola')
    expect(out[2].bgId).toBe('petroleo')
  })

  it('conserva las ediciones existentes, muertos blobs a null con fotoId limpio', () => {
    const edited = (s: Partial<LabSlide>): LabSlide => hydrateSlide({ ...emptySlide(), bgId: null, ...s })
    const prev: Record<number, LabSlide> = {
      1: edited({ text: 'EDITADO', photoSrc: 'blob:https://x/y', photoId: 'stock-1' }),
      2: edited({ text: 'ok', photoSrc: '/stock/a.jpg' }),
    }
    const out = ensureDesignSlides(stories3, prev)
    expect(out[1].text).toBe('EDITADO') // sin re-siembra
    expect(out[1].photoSrc).toBeNull() // blob muerto
    expect(out[1].photoId).toBeNull() // el id ya no apunta a nada vivo
    expect(out[2].photoSrc).toBe('/stock/a.jpg') // estable se conserva
    expect(Object.keys(out).sort()).toEqual(['1', '2', '3']) // 3 sembrada
  })

  it('poda huérfanos (números que ya no existen) y re-siembra faltantes', () => {
    const prev: Record<number, LabSlide> = {
      9: hydrateSlide({ text: 'fuera' }),
      2: hydrateSlide({ text: 'queda' }),
    }
    const out = ensureDesignSlides([story(1, 'nueva'), story(2, 'queda')], prev)
    expect(out[9]).toBeUndefined()
    expect(out[2].text).toBe('queda')
    expect(out[1].text).toBe('nueva')
  })

  it('idempotente: segunda pasada con el resultado no cambia nada', () => {
    const once = ensureDesignSlides(stories3, {})
    const twice = ensureDesignSlides(stories3, once)
    expect(twice).toEqual(once)
  })
})

describe('storyDesignFileName + storyBgCss', () => {
  it('nombre PNG con de-NN cuando hay secuencia y sobrio cuando es única', () => {
    expect(storyDesignFileName(1, 3)).toBe('story-01de03.png')
    expect(storyDesignFileName(3, 3)).toBe('story-03de03.png')
    expect(storyDesignFileName(1, 1)).toBe('story-01.png')
  })

  it('CSS del degradado: 160° y par de la paleta (idéntico a los mockups)', () => {
    expect(storyBgCss('granate')).toBe('linear-gradient(160deg, #8A1E3B 0%, #591427 100%)')
    expect(storyBgCss('petroleo')).toBe('linear-gradient(160deg, #B05B70 0%, #86384F 100%)')
    expect(storyBgCss('dorado')).toBe('linear-gradient(160deg, #A8742E 0%, #7A5020 100%)')
  })
})