import { describe, expect, it } from 'vitest'
import { buildIdeasPrompt, generateMockIdeas, normaliseIdeasOutput } from '@/lib/ai/prompts/idea-specs'

// Módulo puro de ideas (sección Guiones). El prompt pide SOLO reels y evita
// los títulos ya creados; el normalizador invalida salidas mal formadas.

describe('buildIdeasPrompt', () => {
  it('pide el número exacto de ideas y solo reels', () => {
    const p = buildIdeasPrompt({ brandContext: 'Salón Ana', count: 5 })
    expect(p).toContain('5 ideas')
    expect(p).toContain('Salón Ana')
    expect(p).toContain('type": "reel')
  })

  it('incluye títulos ya completados para no repetirlos', () => {
    const p = buildIdeasPrompt({ brandContext: '', count: 5, completedTitles: ['El error con el balayage'] })
    expect(p).toContain('El error con el balayage')
    expect(p).toContain('NO los repitas')
  })
})

describe('normaliseIdeasOutput', () => {
  const input = { brandContext: '', count: 2 }

  it('acepta ideas válidas y normaliza el type a reel', () => {
    const ideas = normaliseIdeasOutput(
      {
        ideas: [
          { title: 'A', type: 'reel' as const, pillar: 'Autoridad', objective: 'educacion', service: 'Balayage', hook_idea: 'x' },
        ],
      },
      input,
    )
    expect(ideas).toHaveLength(1)
    expect(ideas![0].type).toBe('reel')
  })

  it('objectives desconocidos caen a autoridad (no rompe)', () => {
    const ideas = normaliseIdeasOutput(
      {
        ideas: [
          { title: 'A', type: 'reel' as const, pillar: 'P', objective: 'raro', service: 'S', hook_idea: 'x' },
        ],
      },
      input,
    )
    expect(ideas![0].objective).toBe('autoridad')
  })

  it('devuelve null con salida malformada (carrusel / campos raros / vacío)', () => {
    expect(normaliseIdeasOutput(null, input)).toBeNull()
    expect(normaliseIdeasOutput({ ideas: [] }, input)).toBeNull()
    expect(
      normaliseIdeasOutput({ ideas: [{ title: 'A', type: 'carrusel', pillar: 'P', objective: 'x', service: 'S', hook_idea: 'h' } as never] }, input),
    ).toBeNull()
    expect(
      normaliseIdeasOutput({ ideas: [{ title: 'A', type: 'reel', pillar: 'P', objective: 'x', service: 'S' } as never] }, input),
    ).toBeNull() // falta hook_idea
  })
})

describe('generateMockIdeas', () => {
  it('da count ideas únicas y evita los títulos ya completados', () => {
    const all = generateMockIdeas({ brandContext: '', count: 4 })
    expect(all).toHaveLength(4)
    expect(new Set(all.map(i => i.title)).size).toBe(4)
    const skip = generateMockIdeas({ brandContext: '', count: 4, completedTitles: [all[0].title] })
    expect(skip.some(i => i.title === all[0].title)).toBe(false)
  })
})