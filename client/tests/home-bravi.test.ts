import { describe, it, expect } from 'vitest'
import {
  buildBraviChecklist,
  BRAVI_FAQ,
  ChecklistInput,
  BraviStep,
} from '@/lib/home-bravi'
import { getMockBraviReply, buildBraviChatPrompt, BraviChatInput } from '@/lib/ai/prompts/bravi-chat'

const base: ChecklistInput = {
  brandState: null,
  isPremium: false,
  totalItems: 0,
  storiesCount: 0,
  weekCreated: 0,
  weekPublished: 0,
}

function chatInput(patch: Partial<BraviChatInput>): BraviChatInput {
  return {
    messages: [],
    question: '¿Por dónde empiezo?',
    steps: buildBraviChecklist(base),
    ...patch,
  }
}

describe('buildBraviChecklist — nueva usuaria', () => {
  it('todo en cero y sin marca → 5 pasos, todos pendientes, orden fijo', () => {
    const steps = buildBraviChecklist(base)
    expect(steps.map(s => s.href)).toEqual([
      '/mi-marca',
      '/crear-contenido',
      '/stories',
      '/planificar',
      '/calendario',
    ])
    expect(steps.every(s => !s.done)).toBe(true)
    expect(steps[0].label).toBe('Introduce la información de tu marca')
  })

  it('marca completa → el primer paso done conserva su sitio (no se reordena)', () => {
    const steps = buildBraviChecklist({ ...base, brandState: 'complete' })
    expect(steps[0].done).toBe(true)
    expect(steps.slice(1).every(s => !s.done)).toBe(true)
    expect(steps[0].href).toBe('/mi-marca')
  })

  it('marca partial NO cuenta como completa', () => {
    const steps = buildBraviChecklist({ ...base, brandState: 'partial' })
    expect(steps[0].done).toBe(false)
  })
})

describe('buildBraviChecklist — premium', () => {
  it('ordena distinto: métricas en lugar de stories y calendario', () => {
    const steps = buildBraviChecklist({ ...base, isPremium: true })
    expect(steps).toHaveLength(4)
    expect(steps.map(s => s.href)).toEqual([
      '/mi-marca',
      '/crear-contenido',
      '/planificar',
      '/metricas',
    ])
  })

  it('planificar depende de weekCreated y métricas de weekPublished', () => {
    const steps = buildBraviChecklist({ ...base, isPremium: true, weekCreated: 3 })
    const planificar = steps.find(s => s.href === '/planificar')
    const metricas = steps.find(s => s.href === '/metricas')
    expect(planificar?.done).toBe(true)
    expect(metricas?.done).toBe(false)
    const done = buildBraviChecklist({ ...base, isPremium: true, weekPublished: 2 })
    expect(done.find(s => s.href === '/metricas')?.done).toBe(true)
  })
})

describe('buildBraviChecklist — semana con contenido', () => {
  it('con items y stories → guion y stories done; planificar con weekCreated', () => {
    const steps = buildBraviChecklist({ ...base, totalItems: 4, storiesCount: 2 })
    expect(steps.map(s => (s.id === 'guion' ? s.done : null))).toContain(true)
    expect(steps.find(s => s.href === '/stories')?.done).toBe(true)

    const semana = buildBraviChecklist({ ...base, totalItems: 4, storiesCount: 2, weekCreated: 3 })
    expect(semana.find(s => s.href === '/planificar')?.done).toBe(true)
    expect(semana.find(s => s.href === '/calendario')?.done).toBe(false)

    const publicada = buildBraviChecklist({ ...base, totalItems: 4, storiesCount: 2, weekCreated: 3, weekPublished: 1 })
    expect(publicada.find(s => s.href === '/calendario')?.done).toBe(true)
  })
})

describe('BRAVI_FAQ', () => {
  it('4 preguntas frecuentes, ninguna vacía y con hint', () => {
    expect(BRAVI_FAQ).toHaveLength(4)
    expect(
      BRAVI_FAQ.every(f => f.q.trim().length > 0 && f.hint.trim().length > 0),
    ).toBe(true)
    expect(BRAVI_FAQ.map(f => f.q)).toContain('¿Por dónde empiezo?')
    expect(BRAVI_FAQ.map(f => f.q)).toEqual(
      expect.not.arrayContaining(['', null]),
    )
  })
})

describe('bravi-chat — prompt y mock', () => {
  it('el prompt incluye persona BRÄVE, pasos y pregunta', () => {
    const prompt = buildBraviChatPrompt(
      chatInput({
        steps: buildBraviChecklist({ ...base, brandState: 'complete' }),
        suggestionLabel: 'Crea un reel sobre balayage',
        brandContext: 'Salón en Madrid, 12 años de experiencia',
      }),
    )
    expect(prompt).toContain('Eres BRÄVE')
    expect(prompt).toContain('directora de marketing')
    expect(prompt).toContain('Crea un reel sobre balayage')
    expect(prompt).toContain('Salón en Madrid')
    expect(prompt).toContain('¿Por dónde empiezo?')
  })

  it('prompt marca pasos con estado hecho/pendiente', () => {
    const prompt = buildBraviChatPrompt(
      chatInput({ steps: buildBraviChecklist({ ...base, brandState: 'complete' }) }),
    )
    expect(prompt).toContain('Introduce la información de tu marca')
    expect(prompt).toContain('hecho')
    expect(prompt).toContain('pendiente')
  })

  it('historial: solo últimos 6 mensajes entran al prompt', () => {
    const msgs = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'bravi') as 'user' | 'bravi',
      content: `msg-${i}`,
    }))
    const prompt = buildBraviChatPrompt(chatInput({ messages: msgs }))
    expect(prompt).toContain('msg-19')
    expect(prompt).toContain('msg-14')
    expect(prompt).not.toContain('msg-13')
  })

  it('mock empezar → primer paso pendiente, label exacto, sin citar la pregunta', () => {
    const res = getMockBraviReply(chatInput({ question: 'No sé por dónde empezar con todo esto' }))
    expect(res.reply).toContain('Introduce la información de tu marca')
    expect(res.cta?.href).toBe('/mi-marca')
    expect(res.reply).not.toContain('No sé por dónde empezar')
    expect(res.reply.split('.').length - 1).toBeLessThanOrEqual(5)
  })

  it('mock clientas → guion; guardar → Biblioteca; estrategia → sugerencia de hoy', () => {
    const clientas = getMockBraviReply(chatInput({ question: '¿Cómo consigo más clientas nuevas?' }))
    expect(clientas.cta?.href).toBe('/crear-contenido')
    const guardar = getMockBraviReply(chatInput({ question: '¿Dónde se guarda lo que creo?' }))
    expect(guardar.cta?.href).toBe('/biblioteca')
    const estrategia = getMockBraviReply(
      chatInput({ question: '¿Para qué me sirve una estrategia?' }),
    )
    expect(estrategia.reply.length).toBeGreaterThan(0)

    const conSugerencia = getMockBraviReply(
      chatInput({
        question: '¿Para qué me sirve una estrategia?',
        suggestionLabel: 'Crea un reel de tu servicio estrella',
        suggestionHref: '/crear-contenido?type=reel',
      }),
    )
    expect(conSugerencia.reply).toContain('Crea un reel de tu servicio estrella')
    expect(conSugerencia.cta?.href.split('?')[0]).toBe('/crear-contenido')
  })

  it('mock default: responde sin pegar la pregunta y sin CTA inventado', () => {
    const res = getMockBraviReply(chatInput({ question: 'Mi casera me sube el alquiler cada mes' }))
    expect(res.reply).not.toContain('casera me sube')
    expect(res.reply.length).toBeGreaterThan(0)
    if (res.cta) expect(res.cta.href.startsWith('/')).toBe(true)
  })

  it('ningún mock devuelve cta fuera de las secciones de la app', () => {
    const preguntas = [
      '¿Por dónde empiezo?',
      'clientas',
      'estrategia',
      'guardar',
      'algo totalmente distinto',
    ]
    const hrefsValidos = new Set([
      '/mi-marca', '/crear-contenido', '/stories', '/planificar', '/calendario',
      '/biblioteca', '/banco-ganchos', '/foto-inspo', '/carrusel', '/teleprompter',
    ])
    const resultados: BraviStep[] = []
    for (const q of preguntas) {
      for (const steps of [
        buildBraviChecklist(base),
        buildBraviChecklist({ ...base, isPremium: true }),
        buildBraviChecklist({ ...base, brandState: 'complete' }),
      ]) {
        const res = getMockBraviReply(
          chatInput({ question: q, steps, suggestionLabel: 'Planifica tu semana', suggestionHref: '/planificar' }),
        )
        if (res.cta) {
          expect(hrefsValidos.has(res.cta.href.split('?')[0])).toBe(true)
        }
        resultados.push(steps[0])
      }
    }
    expect(resultados).toHaveLength(15)
  })
})