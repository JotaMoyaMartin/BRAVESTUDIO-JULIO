import { describe, it, expect } from 'vitest'
import { READY_SEQUENCES, SEQUENCE_TYPES, SEQUENCE_SERVICES, readyToStories } from '@/lib/stories/sequences'

// Estándar BRÄVE de stories (21-oct-2026): máx. 3 stories, texto corto,
// acción conversacional y nada de «comenta PALABRA».
describe('secuencias listas de stories', () => {
  it('hay una por tipo y servicio clave (5 × 6)', () => {
    expect(READY_SEQUENCES).toHaveLength(SEQUENCE_TYPES.length * SEQUENCE_SERVICES.length)
    const ids = new Set(READY_SEQUENCES.map(s => s.id))
    expect(ids.size).toBe(READY_SEQUENCES.length)
  })

  it('cada secuencia tiene como mucho 3 stories y coincide con su tipo', () => {
    for (const s of READY_SEQUENCES) {
      const def = SEQUENCE_TYPES.find(t => t.id === s.type)!
      expect(s.stories.length).toBeLessThanOrEqual(3)
      expect(s.stories.length).toBe(def.beats.length)
    }
  })

  it('los textos son cortos (se leen en 3–4 s)', () => {
    for (const s of READY_SEQUENCES) for (const st of s.stories) {
      expect(st.text.split(/\s+/).length, `${s.id}: ${st.text}`).toBeLessThanOrEqual(30)
    }
  })

  it('sin CTA de palabra clave', () => {
    for (const s of READY_SEQUENCES) for (const st of s.stories) {
      expect(st.text).not.toMatch(/comenta [A-ZÁÉÍÓÚ]{3,}|escribe [A-ZÁÉÍÓÚ]{3,}/)
    }
  })

  it('la última story invita a actuar', () => {
    for (const s of READY_SEQUENCES) {
      expect(s.stories[s.stories.length - 1].text.toLowerCase()).toMatch(/escríbe|escribe|reserv|ven/)
    }
  })

  it('convierte al formato del editor con encuesta incluida', () => {
    const out = readyToStories(READY_SEQUENCES[0])
    expect(out[0].number).toBe(1)
    expect(out[0].sticker?.type).toBe('poll')
    expect(out[2].role).toBe('Resultado + acción')
  })
})
