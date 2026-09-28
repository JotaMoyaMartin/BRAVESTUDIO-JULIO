import { describe, it, expect } from 'vitest'
import {
  buildObjectivesGrammar,
  buildLiveUpdateLine,
} from '@/lib/ai/brain-grammar'
import type { BrandProfile, Reto10kProgressRow } from '@/types/database'

const brand = (over: Partial<BrandProfile> = {}): BrandProfile => ({
  id: 'b1', user_id: 'u1', raw_input: null, salon_name: 'Studio Marta', city: null,
  years_experience: null, team_info: null, services: null, main_services: ['Balayage', 'Rubios'],
  most_profitable_service: null, service_to_promote: 'Balayage', ideal_client: null,
  ideal_client_age: null, client_problems: null, client_desires: null, frequent_questions: null,
  frequent_mistakes: null, main_goal: null, differentiation: 'Los resultados naturales',
  specialty: null, content_topics: null, shows_face: 'talk', main_priority: 'citas',
  optimized_summary: null, strategy_json: null, roadmap_json: null,
  completion_status: 'partial', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-20T00:00:00Z',
  ...over,
})

const reto = (over: Partial<Reto10kProgressRow> = {}): Reto10kProgressRow => ({
  user_id: 'u1', joined_at: '2026-09-01T00:00:00Z', started_at: '2026-09-05T00:00:00Z',
  objective: 'mas_citas', services: ['Balayage'], level: 'principiante',
  current_day: 12, current_phase: 2, status: 'active', posts_per_week: 4,
  completed_at: null, last_generated_week: 2,
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-20T00:00:00Z',
  ...over,
})

describe('buildObjectivesGrammar', () => {
  it('devuelve null sin marca ni reto', () => {
    expect(buildObjectivesGrammar(null, null, null)).toBeNull()
  })

  it('prioridad sin marcar cuando no hay main_priority', () => {
    const g = buildObjectivesGrammar(brand({ main_priority: null }), null, null)!
    expect(g).toContain('PRIORIDAD DE LA USUARIA: Sin prioridad marcada — mix equilibrado')
  })

  it('mapea la prioridad a texto humano', () => {
    const g = buildObjectivesGrammar(brand({ main_priority: 'constancia' }), null, null)!
    expect(g).toContain('PRIORIDAD DE LA USUARIA: Ser más constante publicando')
  })

  it('incluye valoración, estrella y hasta 3 servicios', () => {
    const g = buildObjectivesGrammar(brand(), null, null)!
    expect(g).toContain('LO QUE QUIEREN QUE VALOREN: Los resultados naturales')
    expect(g).toContain('SERVICIOS ESTRELLA: Balayage (estrella) · Rubios')
  })

  it('reto activo añade progreso con fase; reto pausado solo nivel', () => {
    const activo = buildObjectivesGrammar(brand(), reto(), 'Construye tu autoridad')!
    expect(activo).toContain('NIVEL: principiante')
    expect(activo).toContain('PROGRESO: DÍA 12 de 30 · FASE 2 — Construye tu autoridad · 4/semana')

    const pausado = buildObjectivesGrammar(brand(), reto({ status: 'paused' }), 'X')!
    expect(pausado).not.toContain('PROGRESO:')
    expect(pausado).toContain('NIVEL: principiante')
  })

  it('restricción de producción para work_only y no', () => {
    expect(buildObjectivesGrammar(brand({ shows_face: 'work_only' }), null, null)!)
      .toContain('RESTRICCIÓN DE PRODUCCIÓN: la estilista NO sale a cámara')
    expect(buildObjectivesGrammar(brand({ shows_face: 'no' }), null, null)!)
      .toContain('RESTRICCIÓN DE PRODUCCIÓN')
  })

  it('appear añade restricción suave (sin rostro hablando)', () => {
    const g = buildObjectivesGrammar(brand({ shows_face: 'appear' }), null, null)!
    expect(g).toContain('prefiere NO hablar a cámara')
    expect(g).not.toContain('NO sale a cámara')
  })

  it('talk no añade restricción; nota de precedencia siempre', () => {
    const g = buildObjectivesGrammar(brand({ shows_face: 'talk' }), null, null)!
    expect(g).not.toContain('RESTRICCIÓN')
    expect(g).toContain('(Nota: estas prioridades ACTIVAS')
  })
})

describe('buildLiveUpdateLine', () => {
  it('null sin marca o sin chips vivos', () => {
    expect(buildLiveUpdateLine(null)).toBeNull()
    expect(buildLiveUpdateLine(brand({ main_priority: null, differentiation: null, main_services: null, service_to_promote: null, shows_face: null }))).toBeNull()
  })

  it('lista los chips vivos', () => {
    const l = buildLiveUpdateLine(brand())!
    expect(l).toContain('ACTUALIZACIÓN EN CALIENTE')
    expect(l).toContain('prioridad: Conseguir más citas')
    expect(l).toContain('lo que valoran de ti: Los resultados naturales')
    expect(l).toContain('servicios: Balayage, Rubios')
    expect(l).toContain('estrella: Balayage')
    expect(l).toContain('cámara: Sale a cámara y habla')
  })

  it('nota stale cuando la estrategia es anterior a updated_at', () => {
    const b = brand({ strategy_json: { strategy_generated_at: '2026-09-10T00:00:00Z' } })
    expect(buildLiveUpdateLine(b)).toContain('OJO: la estrategia generada es anterior')

    const fresh = brand({
      strategy_json: { strategy_generated_at: '2026-09-21T00:00:00Z' },
      updated_at: '2026-09-20T00:00:00Z',
    })
    expect(buildLiveUpdateLine(fresh)).not.toContain('OJO')
  })

  it('sin strategy_generated_at no hay nota', () => {
    expect(buildLiveUpdateLine(brand({ strategy_json: {} }))).not.toContain('OJO')
  })
})