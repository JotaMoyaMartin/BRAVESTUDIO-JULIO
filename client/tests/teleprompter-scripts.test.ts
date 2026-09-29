import { describe, it, expect } from 'vitest'
import { spokenScriptOfItem, selectSpeakableItems, teleprompterInputForItem } from '@/lib/teleprompter/scripts'
import type { SpeakableSourceItem } from '@/lib/teleprompter/scripts'

function item(overrides: Partial<SpeakableSourceItem> & Record<string, unknown> = {}): SpeakableSourceItem {
  return { id: 'it1', type: 'reel', title: 'Mi reel', content_json: {}, ...overrides }
}

describe('spokenScriptOfItem', () => {
  it('reel anidado: une las 4 partes sin etiquetas', () => {
    const card = spokenScriptOfItem(item({
      content_json: { script: { hook: 'Hola', context: 'Mira', solution: 'Esto', cta: 'Comenta' } },
    }))
    expect(card).not.toBeNull()
    expect(card!.text).toBe('Hola\n\nMira\n\nEsto\n\nComenta')
    expect(card!.text).not.toContain('GANCHO')
    expect(card!.kind).toBe('reel')
    expect(card!.sequence).toBeNull()
  })

  it('reel plano (sin objeto script): usa el propio json', () => {
    const card = spokenScriptOfItem(item({ content_json: { hook: 'A', context: 'B', solution: 'C', cta: 'D' } }))
    expect(card).not.toBeNull()
    expect(card!.text).toBe('A\n\nB\n\nC\n\nD')
  })

  it('reel vacío → null', () => {
    expect(spokenScriptOfItem(item({ content_json: { script: { hook: '', context: '', solution: '', cta: '' } } }))).toBeNull()
    expect(spokenScriptOfItem(item({ content_json: {} }))).toBeNull()
  })

  it('story secuencia: texto de la 1ª + items etiquetados', () => {
    const card = spokenScriptOfItem(item({
      type: 'story',
      title: 'Stories:color',
      content_json: {
        stories: [
          { number: 1, role: 'Gancho', text: 'Uno' },
          { number: 2, role: 'Cuerpo', text: 'Dos' },
        ],
      },
    }))
    expect(card).not.toBeNull()
    expect(card!.text).toBe('Uno')
    expect(card!.sequence).toHaveLength(2)
    expect(card!.sequence![1]).toEqual({ label: 'Story 2 de 2', text: 'Dos' })
    expect(card!.preview).toContain('Uno')
  })

  it('story con stories vacías → null', () => {
    expect(spokenScriptOfItem(item({ type: 'story', content_json: { stories: [{ number: 1, role: 'x', text: ' ' }] } }))).toBeNull()
  })

  it('question modo camera: usa la respuesta única', () => {
    const card = spokenScriptOfItem(item({
      type: 'story',
      content_json: { question: '¿P?', answer: 'Guion a cámara', mode: 'camera' },
    }))
    expect(card).not.toBeNull()
    expect(card!.kind).toBe('pregunta')
    expect(card!.text).toBe('Guion a cámara')
    expect(card!.sequence).toBeNull()
  })

  it('question modo escrito → null (no es grabable)', () => {
    expect(spokenScriptOfItem(item({ type: 'story', content_json: { question: '¿P?', answer: 'texto', mode: 'written' } }))).toBeNull()
  })

  it('no hablables: carrusel, placeholder del reto, sin json', () => {
    expect(spokenScriptOfItem(item({ type: 'carrusel', content_json: { slides: [{ number: 1, role: 'r', text: 't' }] } }))).toBeNull()
    expect(spokenScriptOfItem(item({ content_json: { mission_day: 3, is_plan_placeholder: true } }))).toBeNull()
    expect(spokenScriptOfItem(item({ content_json: undefined }))).toBeNull()
  })

  it('title fallback cuando falta', () => {
    const card = spokenScriptOfItem(item({ title: null, content_json: { script: { hook: 'H', context: '', solution: '', cta: '' } } }))
    expect(card!.title).toBe('Reel')
  })
})

describe('selectSpeakableItems', () => {
  it('filtra y conserva orden; mezcla hablables y no hablables', () => {
    const cards = selectSpeakableItems([
      item({ id: '1', content_json: { script: { hook: 'A', context: 'B', solution: 'C', cta: 'D' } } }),
      item({ id: '2', type: 'carrusel', content_json: { slides: [] } }),
      item({ id: '3', type: 'story', content_json: { stories: [{ number: 1, role: 'G', text: 'S1' }] } }),
      item({ id: '4', content_json: { mission_day: 1, is_plan_placeholder: true } }),
    ])
    expect(cards.map(c => c.id)).toEqual(['1', '3'])
  })
})

describe('teleprompterInputForItem', () => {
  it('reel: source reel + returnUrl', () => {
    const input = teleprompterInputForItem(
      item({ content_json: { script: { hook: 'A', context: 'B', solution: 'C', cta: 'D' } } }) as never,
      '/biblioteca',
    )
    expect(input).toMatchObject({ script: 'A\n\nB\n\nC\n\nD', source: 'reel', returnUrl: '/biblioteca', sequence: null })
  })

  it('story: secuencia lista para Continuar con N+1', () => {
    const input = teleprompterInputForItem(
      item({
        type: 'story',
        content_json: { stories: [{ number: 1, role: 'a', text: 'S1' }, { number: 2, role: 'b', text: 'S2' }] },
      }) as never,
      '/biblioteca',
    )
    expect(input!.sequence).toEqual({
      current: 0,
      total: 2,
      items: [
        { label: 'Story 1 de 2', text: 'S1' },
        { label: 'Story 2 de 2', text: 'S2' },
      ],
    })
  })

  it('item no hablable → null', () => {
    expect(teleprompterInputForItem(item({ type: 'carrusel', content_json: { slides: [] } }) as never, '/biblioteca')).toBeNull()
  })
})