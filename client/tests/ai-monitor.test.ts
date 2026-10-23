import { describe, expect, it } from 'vitest'
import { classifyAIError, sectionFromPath, summarizeAIStatus, type AIEventRow } from '@/lib/ai/monitor-core'

class FatalLLMError extends Error {}

describe('Vigilancia de la IA · motivos', () => {
  it('traduce cada error a un motivo claro', () => {
    expect(classifyAIError(new Error('AI not configured')).reason).toBe('sin-configurar')
    expect(classifyAIError(new FatalLLMError('LLM 401: unauthorized')).reason).toBe('clave')
    expect(classifyAIError(new Error('LLM 429')).reason).toBe('limite')
    expect(classifyAIError(new Error('LLM 503')).reason).toBe('proveedor-caido')
    expect(classifyAIError(new FatalLLMError('LLM 404: model "x" not found')).reason).toBe('modelo')
    expect(classifyAIError(new FatalLLMError('LLM 400: bad')).reason).toBe('peticion')
    const t = new Error('The operation was aborted due to timeout'); t.name = 'TimeoutError'
    expect(classifyAIError(t).reason).toBe('lento')
    expect(classifyAIError(new FatalLLMError('LLM returned empty content')).reason).toBe('vacia')
    expect(classifyAIError(new TypeError('fetch failed')).reason).toBe('red')
  })
  it('saca la sección de la página', () => {
    expect(sectionFromPath('https://bravestudio.app/crear-contenido?x=1')).toBe('crear-contenido')
    expect(sectionFromPath('/mi-marca/perfil')).toBe('mi-marca/perfil')
    expect(sectionFromPath(null)).toBeNull()
  })
})

describe('Vigilancia de la IA · luz del panel', () => {
  const now = Date.parse('2026-10-23T12:00:00Z')
  const at = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString()
  const fail = (minAgo: number, section = 'crear-contenido'): AIEventRow => ({ created_at: at(minAgo), ok: false, section, reason: 'proveedor-caido', detail: 'LLM 503' })
  const ok = (minAgo: number): AIEventRow => ({ created_at: at(minAgo), ok: true, section: 'prueba-automatica', reason: null, detail: null })

  it('rojo con 3 fallos en 30 minutos', () => {
    const s = summarizeAIStatus([fail(2), fail(5), fail(9)], now)
    expect(s.light).toBe('rojo')
    expect(s.fallos30min).toBe(3)
    expect(s.ultimoFallo?.titulo).toBe('El proveedor de IA está caído')
    expect(s.porSeccion).toEqual([{ section: 'crear-contenido', count: 3 }])
  })
  it('rojo si la última prueba automática falló', () => {
    expect(summarizeAIStatus([fail(60, 'prueba-automatica')], now).light).toBe('rojo')
  })
  it('vuelve a verde-ámbar cuando una prueba posterior va bien', () => {
    expect(summarizeAIStatus([ok(1), fail(2), fail(5), fail(9)], now).light).toBe('verde')
    expect(summarizeAIStatus([fail(120)], now).light).toBe('ambar')
  })
  it('sin registros pide hacer una prueba', () => {
    expect(summarizeAIStatus([], now).light).toBe('sin-datos')
  })
})
