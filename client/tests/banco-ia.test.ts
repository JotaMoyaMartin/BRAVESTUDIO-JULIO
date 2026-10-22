import { describe, expect, it } from 'vitest'
import { bancoCategoryFor, pickBancoPhoto, BANCO_PHOTOS } from '@/lib/banco-ia'

describe('banco BRÄVE: categoría por tema', () => {
  it('reconoce el tema aunque lleve tildes o mayúsculas', () => {
    expect(bancoCategoryFor('Balayage natural para este otoño')).toBe('rubios')
    expect(bancoCategoryFor('¿Tu pelo RIZADO se encrespa? Cuida tus rizos')).toBe('rizos')
    expect(bancoCategoryFor('Mascarilla y cuero cabelludo')).toBe('tratamientos')
    expect(bancoCategoryFor('Un buen corte con tijera')).toBe('herramientas')
    expect(bancoCategoryFor('Canas que brillan')).toBe('canas')
    expect(bancoCategoryFor('Cobrizos de temporada')).toBe('castanos')
  })

  it('sin tema concreto devuelve null (se elige al azar)', () => {
    expect(bancoCategoryFor('Hoy te cuento algo importante')).toBeNull()
    expect(bancoCategoryFor(undefined)).toBeNull()
  })

  it('la elección es estable y evita repetir', () => {
    if (BANCO_PHOTOS.length < 2) return
    const a = pickBancoPhoto({ text: 'rubio', seed: 's1' })
    expect(pickBancoPhoto({ text: 'rubio', seed: 's1' })).toBe(a)
    const b = pickBancoPhoto({ text: 'rubio', seed: 's1', avoid: [a!] })
    expect(b).not.toBe(a)
  })
})
