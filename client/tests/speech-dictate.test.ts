import { describe, expect, it } from 'vitest'
import { collectNewFinalChunks } from '@/lib/speech'

// Dictado por voz: cada evento onresult repite los resultados anteriores
// (acumulativo). Con el cursor solo deben entrar los NUEVOS finales,
// exactamente una vez — así el campo acumula sin duplicarse y al parar
// la última frase llega antes del onend.

type Row = { isFinal: boolean; 0: { transcript: string } }
const final = (t: string): Row => ({ isFinal: true, 0: { transcript: t } })
const partial = (t: string): Row => ({ isFinal: false, 0: { transcript: t } })

describe('collectNewFinalChunks', () => {
  it('primera frase → un trozo, cursor avanza', () => {
    const { chunks, nextIndex } = collectNewFinalChunks([final('hola')], 0)
    expect(chunks).toEqual(['hola'])
    expect(nextIndex).toBe(1)
  })

  it('evento siguiente solo aporta los resultados nuevos', () => {
    const results = [final('hola'), final('mundo')]
    const { chunks } = collectNewFinalChunks(results, 1)
    expect(chunks).toEqual(['mundo'])
  })

  it('repetir el mismo evento no duplica (cursor igualado)', () => {
    const results = [final('hola'), final('mundo'), final('tercero')]
    // procesado hasta 3 en la práctica; releer el mismo evento desde 3 → nada
    const { chunks, nextIndex } = collectNewFinalChunks(results, 3)
    expect(chunks).toEqual([])
    expect(nextIndex).toBe(3)
  })

  it('los parciales (interim) se saltan', () => {
    const { chunks } = collectNewFinalChunks([partial('ton'), partial('tono ca')], 0)
    expect(chunks).toEqual([])
  })

  it('filas vacías o sin transcript no rompen', () => {
    const { chunks, nextIndex } = collectNewFinalChunks(
      [final('hola'), final('   '), final('mundo')],
      0,
    )
    expect(chunks).toEqual(['hola', 'mundo'])
    expect(nextIndex).toBe(3)
  })
})