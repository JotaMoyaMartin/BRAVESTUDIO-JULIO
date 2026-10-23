import { describe, expect, it } from 'vitest'
import { COVER_SETS, coverFileName, coverIcon, coverPhotos } from '@/lib/perfil/portadas'

describe('Portadas de destacadas', () => {
  it('hay entre 5 y 10 estilos ya hechos, sin repetir', () => {
    expect(COVER_SETS.length).toBeGreaterThanOrEqual(5)
    expect(COVER_SETS.length).toBeLessThanOrEqual(10)
    expect(new Set(COVER_SETS.map(s => s.id)).size).toBe(COVER_SETS.length)
  })
  it('cada destacada lleva su icono', () => {
    expect(coverIcon('Reseñas')).toBe('resenas')
    expect(coverIcon('Mi historia')).toBe('historia')
    expect(coverIcon('Ubicación')).toBe('ubicacion')
    expect(coverIcon('Novias')).toBe('novias')
    expect(coverIcon('Cualquier cosa')).toBe('otro')
  })
  it('las fotos no se repiten dentro del mismo perfil', () => {
    const p = coverPhotos(['Balayage', 'Mi historia', 'Reseñas', 'Resultados', 'Servicios', 'Ubicación', 'Otra', 'Otra 2'])
    expect(new Set(p).size).toBe(p.length)
    p.forEach(f => expect(f.startsWith('/banco-ia/')).toBe(true))
  })
  it('nombres de archivo limpios y en orden', () => {
    expect(coverFileName('arena', 'Reseñas', 2)).toBe('portada-03-resenas-arena.png')
  })
})
