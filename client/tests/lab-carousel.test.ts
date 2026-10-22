// Tests del prototipo LAB /lab/carousel-editor — solo helpers puros
// (lib/lab/carousel.ts + math del draw). Patrón del proyecto: sin canvas.

import { describe, expect, it, vi, afterEach } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  addSlideToDraft,
  applySlidePos,
  applyTemplateToSlides,
  assignRandomPhotos,
  buildPrompt,
  LAB_BASE_FONT_PX,
  LAB_STORY_STORAGE_KEY,
  clearDraft,
  clampSlidePos,
  clampZoom,
  createDraft,
  duplicateSlideInDraft,
  emptyDraft,
  emptySlide,
  focalToPan,
  hydrateSlide,
  LAB_FONT_STEP_DEFAULT,
  LAB_FONT_STEPS,
  LAB_STORAGE_KEY,
  LAB_TEMPLATES,
  labCanvasSize,
  loadDraft,
  MAX_SLIDES,
  mockSlides,
  nearestZoomStep,
  panToFocal,
  parseSlidesResult,
  photoDrawStyle,
  removeSlideInDraft,
  saveDraft,
  shuffle,
  snapSlidePos,
  templateById,
  TEMPLATE_PREVIEW_PHOTO,
  templatePreset,
  TOPIC_IDEAS,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEPS,
} from '@/lib/lab/carousel'
import { labExportFileName } from '@/app/lab/carousel-editor/drawLabSlide'

describe('buildPrompt', () => {
  it('cubre todos los tipos de letra del slide con px base positivo', () => {
    const keys = Object.keys(LAB_BASE_FONT_PX).sort()
    // 4 del carrusel + 3 curadas de Stories (bebas, archivo, yellowtail; 21-oct-2026)
    expect(keys).toEqual(['archivo', 'arial', 'bebas', 'poppins', 'sans', 'serif', 'yellowtail'])
    Object.values(LAB_BASE_FONT_PX).forEach(px => expect(px).toBeGreaterThan(0))
  })

  it('incluye el tema y pide EXACTAMENTE n objetos JSON', () => {
    const p = buildPrompt('Cómo cuidar un balayage', 5)
    expect(p).toContain('Cómo cuidar un balayage')
    expect(p).toContain('EXACTAMENTE 5')
    expect(p).toContain('{"text"')
    expect(p).toContain('hook')
  })

  it('añade la estructura de la plantilla cuando se pasa hint', () => {
    const t = templateById('editorial')
    const p = buildPrompt('balayage', 4, t.promptHint)
    expect(p).toContain(`ESTRUCTURA: ${t.promptHint}`)
    expect(buildPrompt('balayage', 4)).not.toContain('ESTRUCTURA')
  })
})

describe('plantillas de ESTILO (galería visual de la ronda mobile-first)', () => {
  it('hay 5 estilos con ids/nombres/textos de preview únicos y prompt por estructura', () => {
    expect(LAB_TEMPLATES.map(t => t.id)).toEqual(['editorial', 'minimal', 'hook', 'consejo', 'bn'])
    const names = new Set(LAB_TEMPLATES.map(t => t.name))
    const previews = new Set(LAB_TEMPLATES.map(t => t.previewText))
    expect(names.size).toBe(5)
    expect(previews.size).toBe(5)
    for (const t of LAB_TEMPLATES) {
      expect(t.description.length).toBeGreaterThan(0)
      expect(t.promptHint.length).toBeGreaterThan(0)
      expect(t.previewText.length).toBeGreaterThan(0)
      expect(templateById(t.id).id).toBe(t.id)
    }
  })

  it('la foto de preview de la galería existe en /public', () => {
    const file = join(__dirname, '..', 'public', TEMPLATE_PREVIEW_PHOTO.slice(1))
    expect(existsSync(file), `no existe ${file}`).toBe(true)
  })

  it('templatePreset asigna roles: 1º hook, último final, medios middle (y n=1/n=2)', () => {
    // editorial: hook serif grande arriba; cierre más abajo; mid neutro.
    const eh = templatePreset('editorial', 0, 5)
    expect(eh.font).toBe('serif')
    expect(eh.fontScale).toBe(1.2)
    expect(eh.y).toBe(0.45)
    expect(templatePreset('editorial', 2, 5).y).toBe(0.5)
    expect(templatePreset('editorial', 4, 5).y).toBe(0.55)
    // hook grande: sans XL en el gancho, serif en el cierre.
    expect(templatePreset('hook', 0, 5).fontScale).toBe(1.45)
    expect(templatePreset('hook', 4, 5).font).toBe('serif')
    // n=2: 2º slide ya es cierre; n=1: único slide = hook.
    expect(templatePreset('editorial', 1, 2).y).toBe(0.55)
    expect(templatePreset('editorial', 0, 1).fontScale).toBe(1.2)
  })

  it('consejo deja el texto discreto arriba en TODOS los roles; bn activa B/N siempre', () => {
    for (const [role] of [[0], [2], [4]] as const) {
      const p = templatePreset('consejo', role, 5)
      expect(p.y).toBe(0.28)
      expect(p.fontScale).toBe(0.85)
      expect(p.font).toBe('sans')
      expect(templatePreset('bn', role, 5).bw).toBe(true)
      expect(templatePreset('editorial', role, 5).bw).toBe(false)
      expect(templatePreset('minimal', role, 5).bw).toBe(false)
    }
  })

  it('applyTemplateToSlides conserva el texto y aplica el preset del rol', () => {
    const texts = ['g', 'm1', 'm2', 'f']
    const slides = createDraft('test', 4, texts).slides
    const out = applyTemplateToSlides(slides, 'hook')
    expect(out.map(s => s.text)).toEqual(texts)
    expect(out[0].font).toBe('sans')
    expect(out[0].fontScale).toBe(1.45)
    expect(out[3].font).toBe('serif')
    expect(out[3].y).toBe(0.55)
    expect(out.every(s => s.bw)).toBe(false)
    // No muta el original.
    expect(slides[0].fontScale).toBe(LAB_FONT_STEPS[LAB_FONT_STEP_DEFAULT])
  })
})

describe('gestión de slides (añadir / duplicar / eliminar)', () => {
  function draft3() {
    const d = createDraft('test', 3, ['uno', 'dos', 'tres'])
    d.slides[1] = { ...d.slides[1], font: 'sans' as const, fontScale: 0.85, color: 'cherry' as const, overlay: 0.4, x: 0.4, y: 0.45 }
    return d
  }

  it('addSlide inserta tras el actual copiando ESTILO sin texto ni foto', () => {
    const next = addSlideToDraft(draft3(), 1)
    expect(next.slides).toHaveLength(4)
    expect(next.slideCount).toBe(4)
    const added = next.slides[2]
    expect(added.text).toBe('')
    expect(added.photoSrc).toBeNull()
    expect(added.font).toBe('sans')
    expect(added.fontScale).toBe(0.85)
    expect(added.color).toBe('cherry')
    expect(added.overlay).toBe(0.4)
  })

  it('duplicateSlide copia TODO (texto, foto y encuadre); index inválido no op', () => {
    const d = draft3()
    const next = duplicateSlideInDraft(d, 1)
    expect(next.slides[2]).toEqual(d.slides[1])
    expect(next.slides).toHaveLength(4)
    expect(duplicateSlideInDraft(d, 99)).toEqual(d)
  })

  it('removeSlide elimina y Jamás deja 0 slides', () => {
    const d = draft3()
    const next = removeSlideInDraft(d, 0)
    expect(next?.slides.map(s => s.text)).toEqual(['dos', 'tres'])
    expect(next?.slideCount).toBe(2)
    const one = { ...d, slides: [d.slides[0]], slideCount: 1 }
    expect(removeSlideInDraft(one, 0)).toBeNull()
  })

  it('emptyDraft arranca con UN slide vacío construido por ella', () => {
    const d = emptyDraft()
    expect(d.topic).toBe('')
    expect(d.slideCount).toBe(1)
    expect(d.slides[0].text).toBe('')
    expect(d.slides[0].photoSrc).toBeNull()
  })

  it('tope MAX_SLIDES: addSlide deja de operar al llegar al cap de 10', () => {
    let d = createDraft('test', 3, ['uno', 'dos', 'tres'])
    while (d.slides.length < MAX_SLIDES) d = addSlideToDraft(d, d.slides.length - 1)
    expect(d.slides.length).toBe(MAX_SLIDES)
    expect(addSlideToDraft(d, 0).slides.length).toBe(MAX_SLIDES)
  })
})

describe('parseSlidesResult', () => {
  it('lee un array JSON cercado en ```json', () => {
    const out = parseSlidesResult('```json\n["a", "b"]\n```', 5)
    expect(out).toEqual(['a', 'b'])
  })

  it('lee {slides:[{text}]}', () => {
    const out = parseSlidesResult('{"slides":[{"text":"uno"},{"text":"dos"}]}', 5)
    expect(out).toEqual(['uno', 'dos'])
  })

  it('lee {slides:["str"]}', () => {
    const out = parseSlidesResult('{"slides":["uno","dos"]}', 5)
    expect(out).toEqual(['uno', 'dos'])
  })

  it('recorta a 120, trimea, descarta vacíos y corta a n', () => {
    const long = 'x'.repeat(200)
    const out = parseSlidesResult(`["  uno  ", "", "   ", "${long}", "cuatro", "cinco"]`, 3)
    expect(out).toEqual(['uno', 'x'.repeat(120), 'cuatro'])
  })

  it('devuelve null con basura o vacío', () => {
    expect(parseSlidesResult('no es json', 5)).toBeNull()
    expect(parseSlidesResult('[]', 5)).toBeNull()
    expect(parseSlidesResult('', 5)).toBeNull()
  })

  it('corta al pedido aunque la IA añada más', () => {
    expect(parseSlidesResult('["a","b","c","d","e","f","g"]', 5)).toHaveLength(5)
  })
})

describe('posiciones: clamp + snap', () => {
  it('clamp mantiene el centro del bloque dentro del lienzo', () => {
    expect(clampSlidePos(0.01, 0.98)).toEqual({ x: 0.12, y: 0.9 })
    expect(clampSlidePos(-1, 2)).toEqual({ x: 0.12, y: 0.9 })
    expect(clampSlidePos(0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('snap cae al eje cerca del centro y respetan fuera de él', () => {
    expect(snapSlidePos(0.52, 0.48)).toEqual({ x: 0.5, y: 0.5 })
    expect(snapSlidePos(0.36, 0.62)).toEqual({ x: 0.36, y: 0.62 })
    expect(applySlidePos(0.51, 0.09)).toEqual({ x: 0.5, y: 0.1 })
    expect(applySlidePos(0.97, 0.55)).toEqual({ x: 0.88, y: 0.55 })
  })
})

describe('fotos: shuffle + banco', () => {
  it('shuffle no muta el original y conserva los elementos', () => {
    const base = [1, 2, 3, 4, 5]
    const out = shuffle(base)
    expect(base).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('assignRandomPhotos da fotos únicas con claves photoSrc/photoId', () => {
    const out = assignRandomPhotos(5)
    expect(out).toHaveLength(5)
    expect(new Set(out.map(p => p.photoSrc)).size).toBe(5)
    for (const p of out) {
      expect(p.photoSrc).toMatch(/^\/(foto-inspo|landing|banco-ia)\//)
      expect(p.photoId).toBeTruthy()
    }
  })
})

describe('draft', () => {
  it('createDraft: defaults sane + una foto por slide', () => {
    const d = createDraft('balayage', 3, ['uno', 'dos', 'tres'])
    expect(d.topic).toBe('balayage')
    expect(d.slideCount).toBe(3)
    expect(d.slides).toHaveLength(3)
    expect(d.slides[0].text).toBe('uno')
    expect(d.slides[0].fontScale).toBe(LAB_FONT_STEPS[LAB_FONT_STEP_DEFAULT])
    expect(d.slides[0].color).toBe('white')
    expect(d.slides[0].x).toBe(0.5)
    expect(d.slides[0].y).toBe(0.5)
    expect(d.slides[0].overlay).toBe(0.3)
    for (const s of d.slides) expect(s.photoSrc).toBeTruthy()
  })

  it('mockSlides devuelve n textos', () => {
    expect(mockSlides('test', 4)).toHaveLength(4)
  })

  it('TOPIC_IDEAS: exactamente los 5 chips peluqueros del mobile-first', () => {
    expect(TOPIC_IDEAS).toEqual([
      'Cuidados del color',
      'Mantenimiento del balayage',
      'Errores que dañan tu cabello',
      'Cómo elegir tu tono',
      'Productos recomendados',
    ])
  })
})

describe('persistencia localStorage (LAB)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('save/load roundtrip y clear', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    })
    const d = createDraft('balayage', 2, ['uno', 'dos'])
    saveDraft(d)
    const loaded = loadDraft()
    expect(loaded).toEqual(d)
    clearDraft()
    expect(loadDraft()).toBeNull()
    expect(store.has(LAB_STORAGE_KEY)).toBe(false)
  })

  it('loadDraft tolera localStorage bloqueado y JSON roto', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {
          throw new Error('blocked')
        },
        removeItem: () => undefined,
      },
    })
    expect(loadDraft()).toBeNull()
    expect(() => saveDraft(createDraft('a', 1, ['t']))).not.toThrow()
  })

  it('stories: draft INDEPENDIENTE del carrusel (key propia) + clear aislado', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    })
    expect(LAB_STORY_STORAGE_KEY).not.toBe(LAB_STORAGE_KEY)
    saveDraft(createDraft('tips de color', 3, ['a', 'b', 'c']), LAB_STORY_STORAGE_KEY)
    expect(loadDraft(LAB_STORY_STORAGE_KEY)?.topic).toBe('tips de color')
    expect(loadDraft()).toBeNull() // el carrusel no ve el draft de stories
    clearDraft(LAB_STORY_STORAGE_KEY)
    expect(store.has(LAB_STORAGE_KEY)).toBe(false)
    expect(loadDraft(LAB_STORY_STORAGE_KEY)).toBeNull()
  })
})

describe('encuadre de foto: zoom + focal (cover SIEMPRE, sin huecos)', () => {
  const W = 1080
  const H = 1350
  const slide = (zoom: number, fx: number, fy: number) => emptySlide({ zoom, focalX: fx, focalY: fy })

  it('zoom 1 con fuente mismo ratio llena el lienzo exacto', () => {
    const p = photoDrawStyle(slide(1, 0.5, 0.5), 1080, 1350, W, H)
    expect(p.leftPct).toBe(0)
    expect(p.topPct).toBe(0)
    expect(p.widthPct).toBe(100)
    expect(p.heightPct).toBe(100)
  })

  it('nunca deja huecos: drawW ≥ lienzo y drawH ≥ lienzo (fuentes landscape y portrait)', () => {
    for (const [iw, ih] of [[4000, 3000], [1080, 1920], [800, 800], [1920, 1080]] as const) {
      for (const zoom of ZOOM_STEPS) {
        for (const fx of [0, 0.3, 0.5, 0.8, 1]) {
          for (const fy of [0, 0.5, 1]) {
            const p = photoDrawStyle(slide(zoom, fx, fy), iw, ih, W, H)
            expect(p.widthPct).toBeGreaterThanOrEqual(100)
            expect(p.heightPct).toBeGreaterThanOrEqual(100)
            // El rect dibujado siempre cubre el lienzo completo (épsilon por
            // coma flotante: los bordes exactos dan 99.999…999).
            const EPS = 1e-9
            expect(p.leftPct + p.widthPct).toBeGreaterThanOrEqual(100 - EPS)
            expect(p.topPct + p.heightPct).toBeGreaterThanOrEqual(100 - EPS)
            expect(p.leftPct).toBeLessThanOrEqual(EPS)
            expect(p.topPct).toBeLessThanOrEqual(EPS)
          }
        }
      }
    }
  })

  it('mantiene el ratio de la imagen fuente (sin distorsión)', () => {
    const p = photoDrawStyle(slide(1.3, 0.5, 0.5), 4000, 3000, W, H)
    const drawRatio = (p.widthPct / 100 * W) / (p.heightPct / 100 * H)
    expect(drawRatio).toBeCloseTo(4000 / 3000, 5)
  })

  it('focal 0 y 1 pegan el borde opuesto y el centro queda a medio camino', () => {
    const c = photoDrawStyle(slide(1.15, 0.5, 0.5), 4000, 3000, W, H)
    const left = photoDrawStyle(slide(1.15, 0, 0.5), 4000, 3000, W, H)
    const right = photoDrawStyle(slide(1.15, 1, 0.5), 4000, 3000, W, H)
    expect(left.widthPct).toBeCloseTo(c.widthPct, 9)
    // focal 1: borde izquierdo de la foto ras con el lienzo.
    expect(right.leftPct).toBeCloseTo(0, 9)
    // focal 0: borde derecho ras con el lienzo.
    expect(left.leftPct + left.widthPct).toBeCloseTo(100, 6)
    // 0.5 queda a medio camino del rango de paneo.
    expect(c.leftPct - left.leftPct).toBeCloseTo(right.leftPct - c.leftPct, 9)
    expect(left.topPct).toBeCloseTo(c.topPct, 9)
  })

  it('panToFocal/focalToPan roundtrip y casos borde', () => {
    expect(focalToPan(0.5, 100)).toBe(0)
    expect(focalToPan(0.75, 100)).toBe(50)
    expect(panToFocal(0, 0)).toBe(0.5) // sin margen ⇒ focal neutro
    for (const f of [0, 0.2, 0.7, 1]) {
      expect(panToFocal(focalToPan(f, 80), 80)).toBeCloseTo(f, 10)
    }
  })
})

describe('zoom helpers', () => {
  it('clampZoom acota al rango válido', () => {
    expect(clampZoom(0.5)).toBe(ZOOM_MIN)
    expect(clampZoom(9)).toBe(ZOOM_MAX)
    expect(clampZoom(1.3)).toBe(1.3)
  })

  it('nearestZoomStep encuentra el paso discreto más cercano', () => {
    expect(nearestZoomStep(1)).toBe(0)
    expect(nearestZoomStep(1.05)).toBe(0)
    expect(nearestZoomStep(1.62)).toBe(3)
    expect(nearestZoomStep(2.5)).toBe(ZOOM_STEPS.length - 1)
  })
})

describe('migración + modos del lienzo', () => {
  it('hydrateSlide rellena slides viejos sin focal/zoom (backfill)', () => {
    const old = hydrateSlide({ text: 'hola', color: 'black' })
    expect(old.text).toBe('hola')
    expect(old.color).toBe('black')
    expect(old.focalX).toBe(0.5)
    expect(old.focalY).toBe(0.5)
    expect(old.zoom).toBe(1)
    expect(old.font).toBe('serif')
  })

  it('hydrateSlide tolera basura', () => {
    expect(hydrateSlide(null).text).toBe('')
    expect(hydrateSlide('nada').x).toBe(0.5)
  })

  it('hydrateSlide/emptySlide: bgId SIEMPRE null (el LAB jamás usa degradados de marca)', () => {
    expect(hydrateSlide({}).bgId).toBeNull()
    expect(emptySlide().bgId).toBeNull()
  })

  it('labCanvasSize: carousel 4:5 y story 9:16 listo para reutilizar', () => {
    expect(labCanvasSize('carousel')).toEqual({ w: 1080, h: 1350 })
    expect(labCanvasSize('story')).toEqual({ w: 1080, h: 1920 })
  })

  it('nombre de export con zero-pad', () => {
    expect(labExportFileName(0, 5)).toBe('lab-carrusel-01de05.png')
    expect(labExportFileName(4, 5)).toBe('lab-carrusel-05de05.png')
    expect(labExportFileName(0, 5, 'story')).toBe('lab-story-01de05.png')
    expect(labExportFileName(2, 7, 'story')).toBe('lab-story-03de07.png')
  })
})