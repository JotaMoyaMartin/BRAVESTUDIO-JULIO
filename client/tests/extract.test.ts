import { describe, it, expect } from 'vitest'
import { extractJSON } from '@/lib/ai/extract'

describe('extractJSON', () => {
  it('parsea JSON limpio', () => {
    expect(extractJSON<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  it('extrae JSON dentro de fences ```json', () => {
    const raw = '```json\n{"title":"Reel","script":{"hook":"h"}}\n```'
    expect(extractJSON<{ title: string }>(raw)).toEqual({ title: 'Reel', script: { hook: 'h' } })
  })

  it('extrae JSON con prosa alrededor', () => {
    const raw = 'Claro, aquí tienes el resultado:\n{"ok": true} \n¿Algo más?'
    expect(extractJSON<{ ok: boolean }>(raw)).toEqual({ ok: true })
  })

  it('soporta arrays y objetos anidados con llaves dentro de strings', () => {
    const raw = '{"text":"llaves } y [ dentro","arr":[1,2,{"x":"}"}]}'
    expect(extractJSON<{ text: string }>(raw)).toEqual({ text: 'llaves } y [ dentro', arr: [1, 2, { x: '}' }] })
  })

  it('respeta escapes en strings', () => {
    const raw = '{"quote":"dijo \\"hola\\"\\n"}'
    expect(extractJSON<{ quote: string }>(raw)).toEqual({ quote: 'dijo "hola"\n' })
  })

  it('devuelve null sin JSON', () => {
    expect(extractJSON('no hay nada aquí')).toBeNull()
    expect(extractJSON('')).toBeNull()
  })

  it('devuelve null con JSON roto', () => {
    expect(extractJSON('{"a":1,')).toBeNull()
    expect(extractJSON('{a:1}')).toBeNull()
  })

  it('devuelve null si el texto está vacío tras fences', () => {
    expect(extractJSON('```\n```')).toBeNull()
  })
})