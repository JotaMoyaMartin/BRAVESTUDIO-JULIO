import { describe, expect, it } from 'vitest'
import { buildReelPrompt, getMockReel, hashSeed } from '@/lib/ai/prompts/reels'

// El prompt del guion debe RESPETAR la idea de la estilista (no improvisar
// otro tema), respetar el objetivo elegido (antes todo era "AUTORIDAD") y
// no repetir guion cuando hay una tanda en marcha (antes: mismo guion ×3).

describe('buildReelPrompt — idea de la estilista', () => {
  it('incluye la idea literal y prohíbe cambiar de tema', () => {
    const p = buildReelPrompt({
      service: 'Balayage',
      objective: 'autoridad',
      freeText: 'clienta con rubio quemado que quería volver a morena',
    })
    expect(p).toContain('IDEA DE LA ESTILISTA')
    expect(p).toContain('clienta con rubio quemado que quería volver a morena')
    expect(p).toContain('NO cambies de tema')
  })

  it('sin idea no mete el bloque (pack de servicio puro)', () => {
    const p = buildReelPrompt({ service: 'Balayage', objective: 'autoridad' })
    expect(p).not.toContain('IDEA DE LA ESTILISTA')
  })
})

describe('buildReelPrompt — objetivo elegido', () => {
  it('venta → regla de VENTA, no el texto fijo de AUTORIDAD', () => {
    const p = buildReelPrompt({ service: 'Balayage', objective: 'venta' })
    expect(p).toContain('Guion de VENTA')
    expect(p).not.toContain('Guion de AUTORIDAD')
  })

  it('autoridad → regla de AUTORIDAD', () => {
    const p = buildReelPrompt({ service: 'Balayage', objective: 'autoridad' })
    expect(p).toContain('Guion de AUTORIDAD')
  })
})

describe('buildReelPrompt — anti-repetición en la tanda', () => {
  it('lista los guiones ya escritos y exige diferencia', () => {
    const p = buildReelPrompt({
      service: 'Balayage',
      objective: 'autoridad',
      freeText: 'idea B',
      avoidScripts: [
        { title: 'La verdad sobre el balayage', hook: '¿Sabes por qué tu balayage dura menos?' },
      ],
    })
    expect(p).toContain('CLARAMENTE DISTINTO')
    expect(p).toContain('La verdad sobre el balayage')
    expect(p).toContain('¿Sabes por qué tu balayage dura menos?')
  })

  it('sin tanda previa, no mete el bloque', () => {
    const p = buildReelPrompt({ service: 'Balayage', objective: 'autoridad', freeText: 'idea' })
    expect(p).not.toContain('CLARAMENTE DISTINTO')
  })

  it('el caption pide estructura gancho→solución→CTA desarrollada', () => {
    const p = buildReelPrompt({ service: 'Balayage', objective: 'autoridad' })
    expect(p).toContain('4-6 líneas')
    expect(p).toContain('SOLUCIÓN')
    expect(p).toContain('CTA conversacional')
  })
})

describe('variedad del fallback (mock)', () => {
  const input = { service: 'Balayage', objective: 'autoridad' as const }

  it('hashSeed es estable', () => {
    expect(hashSeed('balayage|gancho')).toBe(hashSeed('balayage|gancho'))
    expect(hashSeed('balayage|otro')).not.toBe(hashSeed('balayage|gancho'))
  })

  it('distintas ideas (seed) caen en variantes DISTINTAS — nunca el mismo guion ×3', () => {
    const a = getMockReel(input, hashSeed('idea-1|g1')).title
    const b = getMockReel(input, hashSeed('idea-1|g1') + 1).title
    expect(b).not.toBe(a)
  })
})