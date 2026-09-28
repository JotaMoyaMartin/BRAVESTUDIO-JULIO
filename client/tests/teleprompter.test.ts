import { describe, it, expect } from 'vitest'
import {
  parseTeleprompterInput,
  buildNextSequenceInput,
  composeReelSpokenScript,
  fileNameFor,
  clampFontSize,
  clampSpeed,
  speedToPxPerSecond,
  FONT_MIN,
  FONT_MAX,
  SPEED_MIN,
  SPEED_MAX,
  type TeleprompterInput,
} from '../lib/teleprompter/input'

const validPayload = (patch: Partial<TeleprompterInput> = {}): string =>
  JSON.stringify({ script: 'Hola guapa', title: null, source: null, returnUrl: null, sequence: null, ...patch })

describe('parseTeleprompterInput', () => {
  it('acepta un payload válido', () => {
    const input = parseTeleprompterInput(validPayload({ script: 'Hola', source: 'reel', returnUrl: '/crear-contenido' }))
    expect(input).not.toBeNull()
    expect(input!.script).toBe('Hola')
    expect(input!.source).toBe('reel')
    expect(input!.returnUrl).toBe('/crear-contenido')
  })

  it('rechaza null, JSON roto, no-objeto y script vacío', () => {
    expect(parseTeleprompterInput(null)).toBeNull()
    expect(parseTeleprompterInput('{roto')).toBeNull()
    expect(parseTeleprompterInput('"hola"')).toBeNull()
    expect(parseTeleprompterInput('{"script":"   "}')).toBeNull()
    expect(parseTeleprompterInput('{"script":123}')).toBeNull()
  })

  it('normaliza campos desconocidos y source inválido', () => {
    const input = parseTeleprompterInput('{"script":"hola","source":"campaña","hack":"x"}')
    expect(input!.source).toBeNull()
    expect(input!.title).toBeNull()
    expect(input!.returnUrl).toBeNull()
  })

  it('acepta secuencia completa y filtra items sin texto', () => {
    const raw = JSON.stringify({
      script: 'story 1',
      sequence: {
        current: 1,
        total: 99,
        items: [{ label: 'Story 1 de 2', text: 'uno' }, { label: 'x', text: '' }, { label: 'Story 2 de 2', text: 'dos' }],
      },
    })
    const input = parseTeleprompterInput(raw)
    expect(input!.sequence).toEqual({
      current: 1,
      total: 2,
      items: [{ label: 'Story 1 de 2', text: 'uno' }, { label: 'Story 2 de 2', text: 'dos' }],
    })
  })

  it('secuencia vacía o no-array se ignora', () => {
    expect(parseTeleprompterInput('{"script":"a","sequence":{"items":[]}}')!.sequence).toBeUndefined()
    expect(parseTeleprompterInput('{"script":"a","sequence":"raro"}')!.sequence).toBeUndefined()
  })

  it('current fuera de rango se acota a la secuencia', () => {
    const input = parseTeleprompterInput('{"script":"a","sequence":{"current":7,"items":[{"label":"S1","text":"a"},{"label":"S2","text":"b"}]}}')
    expect(input!.sequence!.current).toBe(1)
  })
})

describe('buildNextSequenceInput (Stories → siguiente story)', () => {
  const base: TeleprompterInput = {
    script: 'texto 1',
    title: 'Story 1 de 3',
    source: 'stories',
    returnUrl: '/stories',
    sequence: {
      current: 0,
      total: 3,
      items: [
        { label: 'Story 1 de 3', text: 'texto 1' },
        { label: 'Story 2 de 3', text: 'texto 2' },
        { label: 'Story 3 de 3', text: 'texto 3' },
      ],
    },
  }

  it('avanza a la siguiente story conservando origen y secuencia', () => {
    const next = buildNextSequenceInput(base)
    expect(next!.script).toBe('texto 2')
    expect(next!.title).toBe('Story 2 de 3')
    expect(next!.source).toBe('stories')
    expect(next!.returnUrl).toBe('/stories')
    expect(next!.sequence!.current).toBe(1)
  })

  it('en la última story devuelve null (fin de secuencia)', () => {
    const last = { ...base, sequence: { ...base.sequence!, current: 2 } }
    expect(buildNextSequenceInput(last)).toBeNull()
  })

  it('sin secuencia devuelve null', () => {
    expect(buildNextSequenceInput({ script: 'a' })).toBeNull()
  })
})

describe('composeReelSpokenScript', () => {
  it('une hook→context→solution→cta en orden natural y sin etiquetas', () => {
    const out = composeReelSpokenScript({ hook: 'Parece magia', context: 'Y no lo es', solution: 'Este truco', cta: 'Cuéntame' })
    expect(out).toBe('Parece magia\n\nY no lo es\n\nEste truco\n\nCuéntame')
  })

  it('salta partes vacías y recorta espacios', () => {
    const out = composeReelSpokenScript({ hook: ' Hola ', context: '', solution: '  ', cta: 'Adiós' })
    expect(out).toBe('Hola\n\nAdiós')
  })
})

describe('fileNameFor', () => {
  it('mp4 para historias de reel con índice', () => {
    const name = fileNameFor('reel', null, 'video/mp4;codecs=avc1')
    expect(name).toMatch(/^brave-reel-\d{8}\.mp4$/)
  })

  it('stories incluye el número de story (1-based)', () => {
    const name = fileNameFor('stories', 1, 'video/webm;codecs=vp9,opus')
    expect(name).toMatch(/^brave-story-2-\d{8}\.webm$/)
  })

  it('sin mime conocida y sin source, fallback webm/brave-video', () => {
    const name = fileNameFor(null, null, undefined)
    expect(name).toMatch(/^brave-video-\d{8}\.webm$/)
  })
})

describe('clamps de controles V1', () => {
  it('tamaño entre 18 y 44', () => {
    expect(FONT_MIN).toBe(18)
    expect(FONT_MAX).toBe(44)
    expect(clampFontSize(2)).toBe(18)
    expect(clampFontSize(30)).toBe(30)
    expect(clampFontSize(200)).toBe(44)
  })

  it('velocidad entre 0.5 y 2', () => {
    expect(SPEED_MIN).toBe(0.5)
    expect(SPEED_MAX).toBe(2)
    expect(clampSpeed(0.1)).toBe(0.5)
    expect(clampSpeed(3)).toBe(2)
  })

  it('velocidad mayor = más px/segundo', () => {
    expect(speedToPxPerSecond(1, 30)).toBeGreaterThan(speedToPxPerSecond(0.5, 30))
    expect(speedToPxPerSecond(0.5, 30)).toBeGreaterThan(0)
  })
})