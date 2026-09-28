import { describe, it, expect } from 'vitest'
import { STRATEGY_PROMPT, ROADMAP_PROMPT, STRATEGY_REFINE_PROMPT, BRAIN_STRATEGY_PROMPT } from '@/lib/ai/prompts/strategy'
import { buildOnboardingFicha } from '@/lib/ai/brain-grammar'

/**
 * Los prompts compartidos en lib/ai/prompts/strategy.ts son la ÚNICA copia
 * (antes duplicados en MiMarcaClient.tsx). Verifican interpolación y reglas clave.
 */
describe('prompts strategy compartidos', () => {
  it('STRATEGY_PROMPT interpola el texto y exige resumen_para_ia', () => {
    const p = STRATEGY_PROMPT('Salón X en Madrid')
    expect(p).toContain('Salón X en Madrid')
    expect(p).toContain('resumen_para_ia')
    expect(p).toContain('sumar 100')
  })

  it('BRAIN_STRATEGY_PROMPT comparte el cuerpo byte-idéntico con STRATEGY_PROMPT', () => {
    const base = STRATEGY_PROMPT('Texto A')
    const brain = BRAIN_STRATEGY_PROMPT('Ficha B')
    expect(brain).toContain('FICHA DEL SALÓN')
    expect(brain).toContain('Ficha B')
    // El cuerpo (JSON + reglas) es idéntico en ambas variantes — QA de la Fase 1
    const bodyBase = base.slice(base.indexOf('Responde SOLO'))
    const bodyBrain = brain.slice(brain.indexOf('Responde SOLO'))
    expect(bodyBrain).toBe(bodyBase)
  })

  it('buildOnboardingFicha compone la ficha con los datos verificados', () => {
    const f = buildOnboardingFicha({
      full_name: 'Marta López', salon_name: 'Studio Marta', team_info: 'propio',
      main_services: ['Balayage', 'Rubios'], service_to_promote: 'Balayage',
      differentiation: 'Los resultados naturales', main_priority: 'citas', shows_face: 'talk',
    })
    expect(f).toContain('- Estilista: Marta López')
    expect(f).toContain('- Servicio estrella: Balayage')
    expect(f).toContain('- Su prioridad ahora: Conseguir más citas')
    expect(f).toContain('- Relación con la cámara: Sale a cámara y habla')
    expect(f).not.toContain('Reto 10K')
  })

  it('buildOnboardingFicha ignora valores crudos no válidos', () => {
    const f = buildOnboardingFicha({ main_priority: 'hacker', shows_face: 'zzz', team_info: 'zzz' })
    expect(f).not.toContain('prioridad')
    expect(f).not.toContain('cámara')
    expect(f).not.toContain('Dónde trabaja')
  })

  it('ROADMAP_PROMPT interpola estrategia y texto original', () => {
    const p = ROADMAP_PROMPT('{"perfil":true}', 'Texto estilista')
    expect(p).toContain('{"perfil":true}')
    expect(p).toContain('Texto estilista')
    expect(p).toContain('5 a 7 fases')
    expect(p).toContain('bravi_message')
  })

  it('STRATEGY_REFINE_PROMPT mantiene estructura con instrucción', () => {
    const p = STRATEGY_REFINE_PROMPT('{"a":1}', 'sube precio percibido')
    expect(p).toContain('{"a":1}')
    expect(p).toContain('sube precio percibido')
    expect(p).toContain('misma estructura JSON')
  })
})