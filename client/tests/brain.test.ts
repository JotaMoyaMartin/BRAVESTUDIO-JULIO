import { describe, it, expect } from 'vitest'
import { composeBrainContext, BRAIN_SECTIONS_BY_PURPOSE } from '@/lib/ai/brain'

describe('composeBrainContext (seam Business Brain — Fase 0)', () => {
  const parts = {
    brand: 'Salón Lumière, Madrid. Especialista en rubios.',
    metrics: '3 reels publicados, alcance medio 2.1k',
    objectives: 'Reto 10K día 12, objetivo +8 clientas/mes',
    history: 'Semana pasada: reel canas OK (3.4k views), carrusel flojo (400 views)',
  }

  it('compone solo las secciones del plan por propósito', () => {
    // Fase 1: content/stories ahora piden métricas (ajuste QA, prepara Fase 2)
    const ctx = composeBrainContext('content', parts)!
    expect(ctx).toContain('== MARCA DEL SALÓN ==')
    expect(ctx).toContain('== MÉTRICAS RECIENTES ==')
    expect(ctx).toContain('== OBJETIVOS ACTIVOS ==')
    expect(ctx).toContain('== HISTORIAL DE CONTENIDO ==')
    // Orden: brand → metrics → objectives → history
    expect(ctx.indexOf('MARCA')).toBeLessThan(ctx.indexOf('OBJETIVOS'))
    expect(ctx.indexOf('OBJETIVOS')).toBeLessThan(ctx.indexOf('HISTORIAL'))
  })

  it('strategy incluye métricas pero no historial', () => {
    const ctx = composeBrainContext('strategy', parts)!
    expect(ctx).toContain('MÉTRICAS RECIENTES')
    expect(ctx).not.toContain('HISTORIAL')
  })

  it('campaign y recommendation incluyen todo', () => {
    for (const purpose of ['campaign', 'recommendation'] as const) {
      const ctx = composeBrainContext(purpose, parts)!
      expect(ctx).toContain('MARCA')
      expect(ctx).toContain('MÉTRICAS')
      expect(ctx).toContain('OBJETIVOS')
      expect(ctx).toContain('HISTORIAL')
    }
  })

  it('devuelve null si no hay ninguna sección disponible', () => {
    expect(composeBrainContext('content', {})).toBeNull()
    expect(composeBrainContext('content', { brand: null, metrics: '', objectives: null, history: '' })).toBeNull()
  })

  it('respeta el plan incluso con secciones ausentes', () => {
    const ctx = composeBrainContext('carousel', { brand: 'solo marca', metrics: 'métricas' })!
    expect(ctx).toContain('MARCA')
    expect(ctx).not.toContain('MÉTRICAS') // carousel no usa métricas
  })

  it('BRAIN_SECTIONS_BY_PURPOSE cubre los 7 propósitos con brand siempre true', () => {
    const purposes = Object.keys(BRAIN_SECTIONS_BY_PURPOSE)
    expect(purposes).toHaveLength(7)
    for (const p of purposes) expect(BRAIN_SECTIONS_BY_PURPOSE[p as keyof typeof BRAIN_SECTIONS_BY_PURPOSE].brand).toBe(true)
  })

  it('content y stories piden métricas (ajuste Fase 1)', () => {
    expect(BRAIN_SECTIONS_BY_PURPOSE.content.metrics).toBe(true)
    expect(BRAIN_SECTIONS_BY_PURPOSE.stories.metrics).toBe(true)
  })
})