import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLASSIC_CATEGORY, MOCKUP_TEMPLATES, STORY_CATEGORIES, splitHighlight } from '@/lib/stories/mockups'
import { STORY_TEMPLATES } from '@/lib/stories/templates'
import { keysToClear, resettableSection } from '@/lib/section-reset'

const pub = (p: string) => join(__dirname, '..', 'public', p)

describe('Stories con arte', () => {
  it('cada plantilla tiene su imagen y sus fotos de ejemplo guardadas', () => {
    for (const t of MOCKUP_TEMPLATES) {
      expect(existsSync(pub(t.art)), t.art).toBe(true)
      t.slots.forEach(s => expect(existsSync(pub(s.sample)), s.sample).toBe(true))
    }
  })
  it('huecos y textos caben en el lienzo de 1080×1920', () => {
    for (const t of MOCKUP_TEMPLATES) {
      for (const b of [...t.slots, ...t.texts]) {
        expect(b.x).toBeGreaterThanOrEqual(0)
        expect(b.y).toBeGreaterThanOrEqual(0)
        expect(b.x + b.w).toBeLessThanOrEqual(1080)
        expect(b.y + b.h).toBeLessThanOrEqual(1920)
      }
    }
  })
  it('todas las categorías de destacadas tienen plantillas', () => {
    for (const c of STORY_CATEGORIES) {
      const n = MOCKUP_TEMPLATES.filter(m => m.category === c.id).length + STORY_TEMPLATES.filter(t => CLASSIC_CATEGORY[t.id] === c.id).length
      expect(n, c.label).toBeGreaterThan(0)
    }
    expect(MOCKUP_TEMPLATES.filter(m => m.category === 'antes-despues').every(m => m.slots.length === 2)).toBe(true)
  })
  it('el **resaltado** se separa del resto', () => {
    expect(splitHighlight('Te espero **aquí**')).toEqual([{ text: 'Te espero ', hi: false }, { text: 'aquí', hi: true }])
  })
})

describe('Empezar de nuevo', () => {
  const keys = [
    'brave_session_u:1:stories:visuals', 'brave_session_u:1:story-designer', 'brave_session_u:1:story-designer:mockupId',
    'brave_session_u:1:stories-diseno:x', 'brave_session_u:2:stories:visuals', 'brave_session_u:1:planificar:plan',
  ]
  it('borra solo lo de esa sección y esa usuaria', () => {
    expect(keysToClear(keys, '1', 'stories')).toEqual(['brave_session_u:1:stories:visuals', 'brave_session_u:1:story-designer', 'brave_session_u:1:story-designer:mockupId'])
    expect(keysToClear(keys, '1', 'planificar')).toEqual(['brave_session_u:1:planificar:plan'])
  })
  it('sale en las secciones con pasos y no en Inicio', () => {
    expect(resettableSection('/stories')).toBe('stories')
    expect(resettableSection('/crear-contenido/algo')).toBe('crear-contenido')
    expect(resettableSection('/inicio')).toBeNull()
  })
})
