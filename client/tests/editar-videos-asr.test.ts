import { describe, it, expect } from 'vitest'
import { wordsFromChunks } from '@/lib/editar-videos/local-asr'

describe('wordsFromChunks', () => {
  it('mapea chunks whisper a palabras con tiempos', () => {
    const out = wordsFromChunks([
      { text: ' Bien,', timestamp: [2.08, 2.64] },
      { text: 'este', timestamp: [2.64, 2.88] },
    ])
    expect(out).toEqual([
      { text: 'Bien,', start: 2.08, end: 2.64 },
      { text: 'este', start: 2.64, end: 2.88 },
    ])
  })

  it('filtra tokens sin timestamp o vacíos (residuos de stride)', () => {
    const out = wordsFromChunks([
      { text: 'hola', timestamp: [0, 0.4] },
      // @ts-expect-error resido sin tiempo del borde de chunk
      { text: '??', timestamp: [undefined, undefined] },
      { text: '   ', timestamp: [0.4, 0.5] },
      { text: 'fin.', timestamp: [0.5, 0.8] },
    ])
    expect(out.map(w => w.text)).toEqual(['hola', 'fin.'])
  })

  it('chunks null/undefined → lista vacía', () => {
    expect(wordsFromChunks(null)).toEqual([])
    expect(wordsFromChunks(undefined)).toEqual([])
  })
})