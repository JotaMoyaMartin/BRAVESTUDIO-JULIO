import { describe, expect, it } from 'vitest'
import { QUESTIONS, answersToText, isAnswered, optionsOf } from '@/lib/marca/questions'
import { mockBrave5, brave5ToStrategy, strategyToBrave5, isBrave5 } from '@/lib/marca/brave5'
import { caminoProgress } from '@/lib/marca/camino'

const answers = {
  salon: 'Aura Hair', ciudad: 'Madrid', equipo: 'Trabajo sola', servicios: ['Balayage y mechas', 'Corte', 'Tratamientos'],
  estrella: 'Balayage y mechas', edad: ['25–35', '35–45'], problema: ['Rubio que amarillea'], diferencia: 'Miro el pelo antes de tocarlo',
  objetivo: 'Más clientas nuevas', tono: 'Cercana', camara: 'Lo hago a veces, quiero hacerlo más', tiempo: 'De 1 a 3 horas',
}

describe('Mi Marca · preguntas', () => {
  it('el servicio estrella se elige entre los servicios marcados', () => {
    const q = QUESTIONS.find(x => x.id === 'estrella')!
    expect(optionsOf(q, answers)).toEqual(['Balayage y mechas', 'Corte', 'Tratamientos'])
  })
  it('no deja avanzar sin respuesta y sí con ella', () => {
    const q = QUESTIONS.find(x => x.id === 'servicios')!
    expect(isAnswered(q, {})).toBe(false)
    expect(isAnswered(q, answers)).toBe(true)
    expect(isAnswered(QUESTIONS[0], { ciudad: 'Madrid' })).toBe(false)
  })
  it('las respuestas se convierten en texto para la IA', () => {
    const t = answersToText(answers)
    expect(t).toContain('Mi salón se llama Aura Hair y está en Madrid.')
    expect(t).toContain('El servicio que más quiero vender es Balayage y mechas.')
  })
})

describe('Mi Marca · estrategia en 5 tarjetas', () => {
  it('sin IA sale una estrategia completa y coherente', () => {
    const b = mockBrave5(answers)
    expect(isBrave5(b)).toBe(true)
    expect(b.bio.length).toBeLessThanOrEqual(150)
    expect(b.estrella.servicio).toBe('Balayage y mechas')
    expect(b.pilares).toHaveLength(3)
    expect(b.ritmo.semana).toBe(4)
  })
  it('se traduce al documento que usan Bravi y los generadores, y vuelve', () => {
    const b = mockBrave5(answers)
    const doc = brave5ToStrategy(b, answers)
    expect(doc.perfil_brave).toBe(b.frase)
    expect(doc.pilares_contenido.map(p => p.name)).toEqual(['Enseña', 'Transforma', 'Conecta'])
    expect(doc.resumen_para_ia).toContain('Balayage y mechas')
    expect(strategyToBrave5(doc)).toEqual(b)
  })
})

describe('Mi Marca · hablar a cámara', () => {
  it('a quien aún no ha empezado le propone empezar suave con el Teleprompter', () => {
    const b = mockBrave5({ ...answers, camara: 'Aún no he empezado, pero sé que lo necesito' })
    expect(b.ritmo.consejo).toContain('Teleprompter')
    expect(b.ritmo.reparto).toContain('15 segundos')
  })
})

describe('Mi Marca · ritmo', () => {
  it('nunca baja de 3 a la semana; con poco tiempo, grabar en bloque', () => {
    const b = mockBrave5({ ...answers, tiempo: 'Menos de 1 hora' })
    expect(b.ritmo.semana).toBe(3)
    expect(b.ritmo.consejo).toContain('graba los 3 vídeos de la semana seguidos')
  })
})

describe('Mi Marca · camino', () => {
  it('la etapa en curso es la primera sin terminar', () => {
    const sig = { marca: true, instagram: false, planCount: 0, reel: false, story: false, carrusel: false, publicadas: 0 }
    expect(caminoProgress(sig, {}).current).toBe(0)
    expect(caminoProgress(sig, { bio: true, instagram: true }).current).toBe(1)
    const p = caminoProgress({ ...sig, instagram: true, planCount: 5, reel: true, story: true }, { bio: true })
    expect(p.current).toBe(2)
    expect(p.totalDone).toBe(5)
  })
})
