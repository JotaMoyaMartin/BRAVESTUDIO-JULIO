import { describe, expect, it } from 'vitest'
import { detectIntent } from '@/lib/assistant/route-intent'

describe('Asistente: a dónde lleva cada petición', () => {
  it('reconoce cada herramienta', () => {
    expect(detectIntent('Dame una idea de reel sobre canas')).toBe('guion')
    expect(detectIntent('Quiero un guion para vender balayage')).toBe('guion')
    expect(detectIntent('Una story para vender mechas')).toBe('story')
    expect(detectIntent('Hazme un carrusel de cuidados en casa')).toBe('carrusel')
    expect(detectIntent('Quiero mejorar una foto de mi clienta')).toBe('foto')
    expect(detectIntent('Planifícame el mes')).toBe('plan')
    expect(detectIntent('¿Cómo mejoro mi bio de Instagram?')).toBe('instagram')
    expect(detectIntent('Necesito ganchos para captar clientas')).toBe('ganchos')
    expect(detectIntent('¿Qué reels virales hay?')).toBe('virales')
  })

  it('lo que no encaja va al asistente', () => {
    expect(detectIntent('¿Cómo subo mis precios sin perder clientas?')).toBe('asistente')
    expect(detectIntent('Hola')).toBe('asistente')
  })
})
