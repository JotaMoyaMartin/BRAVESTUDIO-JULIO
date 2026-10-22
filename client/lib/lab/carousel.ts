// LAB — prototipo de editor de carruseles editoriales (13-oct-2026).
// Fórmula mínima: 1 foto de fondo + 1 bloque de texto por slide. Nada más.
// No es producto: vive en /lab/carousel-editor, NO sustituye /carrusel.
// Si Jota valida la dirección, este modelo se integra al producto real.
// Modelado para poder cambiarse el lienzo a 9:16 después (mismo editor).

import { extractJSON } from '@/lib/ai/extract'
import { EDITOR_STOCK_ITEMS } from '@/lib/editor/catalog'

export const LAB_SLIDE_W = 1080
export const LAB_SLIDE_H = 1350

export const LAB_STORAGE_KEY = 'brave_lab_carousel_draft'
/** STORIES: mismo editor a 9:16, draft independiente (no pisan al del carrusel). */
export const LAB_STORY_STORAGE_KEY = 'brave_lab_story_draft'

// bebas/archivo/yellowtail: tipografías curadas de Stories (21-oct-2026).
type LabFont = 'serif' | 'sans' | 'arial' | 'poppins' | 'bebas' | 'archivo' | 'yellowtail'
export type LabTextColor = 'white' | 'black' | 'cherry' | 'blush'

/** Modo del editor: hoy SOLO carousel; story reutiliza el mismo editor a 9:16. */
export type LabMode = 'carousel' | 'story'

export function labCanvasSize(mode: LabMode): { w: number; h: number } {
  return mode === 'story' ? { w: 1080, h: 1920 } : { w: 1080, h: 1350 }
}

export interface LabSlide {
  text: string
  /** src estable (catálogo estático, URL firmada) o blob de la sesión. */
  photoSrc: string | null
  /** id del catálogo cuando la foto viene de ahí (re-selección más fácil). */
  photoId: string | null
  /** Encuadre de la foto (cover SIEMPRE): fracción del desplazamiento máximo. */
  focalX: number
  focalY: number
  zoom: number
  font: LabFont
  /** multiplicador sobre el tamaño base (1 = M). */
  fontScale: number
  color: LabTextColor
  /** blanco y negro sobre la foto (trivial: filtro + bucle ImageData en export). */
  bw: boolean
  /** overlay negro 0–0.6 para legibilidad del texto. */
  overlay: number
  /** centro del bloque de texto en coordenadas normalizadas 0–1 (jamás píxeles). */
  x: number
  y: number
  /** Fondo de degradado de marca cuando NO hay foto (SOLO el editor de
   *  stories del producto: degradados de rol de los mockups). LAB nunca lo
   *  setea → null = gris #EAE0DA de siempre. */
  bgId?: 'granate' | 'petroleo' | 'dorado' | 'noche' | null
}

export const ZOOM_STEPS = [1, 1.15, 1.3, 1.6, 2, 2.5] as const
export const ZOOM_MIN = 1
export const ZOOM_MAX = 2.5

export interface LabDraft {
  topic: string
  slideCount: number
  slides: LabSlide[]
}

export const SLIDE_COUNT_OPTIONS = [3, 4, 5, 6, 7] as const
export const TOPIC_IDEAS = [
  'Cuidados del color',
  'Mantenimiento del balayage',
  'Errores que dañan tu cabello',
  'Cómo elegir tu tono',
  'Productos recomendados',
] as const
/** Techo de slides por carrusel en esta fase (la tira lo avisa). */
export const MAX_SLIDES = 10

/** Pasos de tamaño: S/M/L/XL/MAX. Default = M (índice 2). */
export const LAB_FONT_STEPS = [0.7, 0.85, 1, 1.2, 1.45] as const
export const LAB_FONT_STEP_DEFAULT = 2
export const LAB_FONT_LABELS = ['S', 'M', 'L', 'XL', 'MAX'] as const

/** Tamaños basepx en lienzo 1080. Serif editorial manda; Arial/Poppins leen
 *  distinto a igual px (Arial más compacto → 84; Poppins x-height grande → 78). */
export const LAB_BASE_FONT_PX: Record<LabFont, number> = { serif: 92, sans: 78, arial: 84, poppins: 78, bebas: 108, archivo: 70, yellowtail: 100 }

/** Overlay negro por defecto: medio (legibilidad garantizada sobre foto). */
export const LAB_OVERLAY_STEPS = [0, 0.2, 0.4, 0.6] as const

// ── Posición: clamp + snap ─────────────────────────────────────────────────

export const CLAMP_X: [number, number] = [0.12, 0.88]
export const CLAMP_Y: [number, number] = [0.1, 0.9]
export const SNAP_THRESHOLD = 0.03

export function clampSlidePos(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(CLAMP_X[1], Math.max(CLAMP_X[0], x)),
    y: Math.min(CLAMP_Y[1], Math.max(CLAMP_Y[0], y)),
  }
}

/** Snap suave al centro horizontal/vertical (el bloque cae al eje si pasa cerca). */
export function snapSlidePos(x: number, y: number): { x: number; y: number } {
  const snap = (v: number, center: number) => (Math.abs(v - center) < SNAP_THRESHOLD ? center : v)
  return { x: snap(x, 0.5), y: snap(y, 0.5) }
}

export function applySlidePos(x: number, y: number): { x: number; y: number } {
  const clamped = clampSlidePos(x, y)
  return snapSlidePos(clamped.x, clamped.y)
}

// ── Encuadre de foto (cover + focal + zoom, sin huecos jamás) ──────────────

export function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
}

/** Paso discreto más cercano (para −/+ el editor). */
export function nearestZoomStep(z: number): number {
  let best = 0
  let dist = Infinity
  ZOOM_STEPS.forEach((s, i) => {
    const d = Math.abs(s - z)
    if (d < dist) {
      dist = d
      best = i
    }
  })
  return best
}

/** pan px (desde el centro) ↔ focal normalizado 0–1. max=0 ⇒ focal 0.5. */
export function focalToPan(f: number, max: number): number {
  return (f * 2 - 1) * max
}

export function panToFocal(pan: number, max: number): number {
  if (max <= 0) return 0.5
  const f = (pan / max + 1) / 2
  return Math.min(1, Math.max(0, f))
}

/**
 * Estilo de lafoto (cover + zoom + focal) en % del lienzo — preview,
 * miniaturas y grid comparten esta única fuente de verdad con el export.
 */
export function photoDrawStyle(
  slide: Pick<LabSlide, 'zoom' | 'focalX' | 'focalY'>,
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
): { leftPct: number; topPct: number; widthPct: number; heightPct: number } {
  const z = clampZoom(slide.zoom)
  const s0 = Math.max(canvasW / imgW, canvasH / imgH)
  const drawW = imgW * s0 * z
  const drawH = imgH * s0 * z
  const maxX = Math.max(0, (drawW - canvasW) / 2)
  const maxY = Math.max(0, (drawH - canvasH) / 2)
  const x0 = (canvasW - drawW) / 2 + focalToPan(slide.focalX, maxX)
  const y0 = (canvasH - drawH) / 2 + focalToPan(slide.focalY, maxY)
  return {
    leftPct: (x0 / canvasW) * 100,
    topPct: (y0 / canvasH) * 100,
    widthPct: (drawW / canvasW) * 100,
    heightPct: (drawH / canvasH) * 100,
  }
}

// ── Fotos: banco aleatorio ─────────────────────────────────────────────────

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Una foto DISTINTA por slide (shuffle del catálogo; si faltan, recicla). */
export function assignRandomPhotos(n: number): { photoSrc: string; photoId: string }[] {
  const pool = shuffle(EDITOR_STOCK_ITEMS)
  const out: { photoSrc: string; photoId: string }[] = []
  for (let i = 0; i < n; i++) {
    const item = pool[i % pool.length]
    out.push({ photoSrc: item.src, photoId: item.id })
  }
  return out
}

// ── IA: prompt + parseo de la respuesta ────────────────────────────────────

export function buildPrompt(topic: string, n: number, structureHint?: string, brandContext?: string): string {
  return [
    'Eres directora de contenido de BRÄVE Studio, experta en peluquería y salones de belleza.',
    'Escribe los textos de un carrusel de Instagram editorial para una estilista.',
    '',
    `TEMA: "${topic}"`,
    '',
    ...(structureHint ? [`ESTRUCTURA: ${structureHint}`, ''] : []),
    ...(brandContext ? [`CONTEXTO DEL SALÓN (adapta el contenido a este negocio):`, brandContext, ''] : []),
    'REGLAS:',
    `- Devuelve SOLO un JSON array con EXACTAMENTE ${n} objetos, cada uno {"text": "..."}.`,
    '- Slide 1: hook potente (pregunta o afirmación atrevida), máx 60 caracteres.',
    '- Slides centrales: UNA idea concreta y útil cada uno (cuidado, color, balayage, corte, productos, rutinas, ventas, objeciones).',
    '- Último slide: cierre corto o CTA conversacional si tiene sentido.',
    '- Cada texto máx 90 caracteres: debe leerse grande sobre una fotografía.',
    '- Español natural de salón (tuteo). Sin emojis, sin hashtags, sin comillas dentro del texto.',
    '- No repitas la misma idea en dos slides.',
  ].join('\n')
}

/**
 * Parseo tolerante de la respuesta: array directo, {slides:[{text}]} o
 * {slides:["str"]}. Normaliza (trim, ≤120), descarta vacíos y corta a n.
 */
export function parseSlidesResult(content: string, n: number): string[] | null {
  const json = extractJSON<unknown>(content)
  let arr: unknown[] | null = null
  if (Array.isArray(json)) {
    arr = json
  } else if (json && typeof json === 'object' && Array.isArray((json as { slides?: unknown }).slides)) {
    arr = (json as { slides: unknown[] }).slides
  }
  if (!arr) return null
  const texts = arr
    .map(it => {
      if (typeof it === 'string') return it
      if (it && typeof it === 'object' && typeof (it as { text?: unknown }).text === 'string') {
        return (it as { text: string }).text
      }
      return ''
    })
    .map(t => t.trim().slice(0, 120))
    .filter(Boolean)
  if (!texts.length) return null
  return texts.slice(0, n)
}

/** Fallback cuando la IA no está configurada en el entorno del LAB. */
export function mockSlides(_topic: string, n: number): string[] {
  const base = [
    '¿Tu balayage pierde vida antes de tiempo?',
    'El brillo se construye en el salón y en casa.',
    'Usa productos específicos para cabello tratado.',
    'El calor excesivo apaga el color: protégete.',
    'La rutina correcta alarga el resultado semanas.',
    'Tu color también se cuida entre visitas.',
    'Reserva tu cita y recuperamos tu brillo.',
  ]
  const out: string[] = []
  for (let i = 0; i < n; i++) out.push(base[i % base.length])
  return out
}

// ── Draft: persistencia localStorage (solo LAB; el producto no lo usa) ─────

export function emptySlide(partial?: Partial<LabSlide>): LabSlide {
  return {
    text: '',
    photoSrc: null,
    photoId: null,
    focalX: 0.5,
    focalY: 0.5,
    zoom: 1,
    font: 'serif',
    fontScale: LAB_FONT_STEPS[LAB_FONT_STEP_DEFAULT],
    color: 'white',
    bw: false,
    overlay: 0.3,
    x: 0.5,
    y: 0.5,
    bgId: null,
    ...partial,
  }
}

/** Rehidrata un slide guardado con defaults de versiones nuevas (backfill). */
export function hydrateSlide(raw: unknown): LabSlide {
  return emptySlide(raw && typeof raw === 'object' ? (raw as Partial<LabSlide>) : {})
}

// ── Plantillas MVP: estructura del copy + estilo inicial por rol ───────────
// Una "plantilla" aquí NO es un diseño gráfico: es una estructura editorial
// (gancho → desarrollo → cierre) con tipografía/posición/contraste de salida.

export interface LabSlidePreset {
  font: LabFont
  fontScale: number
  x: number
  y: number
  overlay: number
  bw?: boolean
}

export interface LabTemplate {
  id: string
  name: string
  description: string
  /** Texto que se muestra en la miniatura de la galería de plantillas. */
  previewText: string
  /** Frase que entra al prompt de IA como restricción de estructura. */
  promptHint: string
  /** Preset por rol: 1º slide = hook, último = cierre, intermedios = medio. */
  preset: (role: 'hook' | 'mid' | 'final') => LabSlidePreset
}

export const TEMPLATE_PREVIEW_PHOTO = '/banco-ia/rubios/rubio-balayage-espalda.jpg'

export const LAB_TEMPLATES: LabTemplate[] = [
  {
    id: 'editorial',
    name: 'Editorial Serif',
    description: 'Texto central elegante en serif — el clásico BRÄVE.',
    previewText: 'Cómo mantener tu balayage',
    promptHint: 'Estructura editorial: slide 1 = gancho elegante; intermedios = UNA idea cuidada cada uno; último = cierre serif.',
    preset: role => {
      if (role === 'hook') return { font: 'serif', fontScale: 1.2, x: 0.5, y: 0.45, overlay: 0.4, bw: false }
      if (role === 'final') return { font: 'serif', fontScale: 1, x: 0.5, y: 0.55, overlay: 0.35, bw: false }
      return { font: 'serif', fontScale: 1, x: 0.5, y: 0.5, overlay: 0.3, bw: false }
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Sans',
    description: 'Texto blanco limpio y directo.',
    previewText: 'Cuida el color en casa',
    promptHint: 'Estructura minimal: slide 1 = frase limpia y directa; intermedios = UN consejo claro cada uno; último = cierre corto.',
    preset: role => {
      if (role === 'hook') return { font: 'sans', fontScale: 1.2, x: 0.5, y: 0.5, overlay: 0.35, bw: false }
      if (role === 'final') return { font: 'sans', fontScale: 1, x: 0.5, y: 0.55, overlay: 0.3, bw: false }
      return { font: 'sans', fontScale: 1, x: 0.5, y: 0.5, overlay: 0.3, bw: false }
    },
  },
  {
    id: 'hook',
    name: 'Hook grande',
    description: 'La pregunta protagonista a pantalla completa.',
    previewText: '¿Tu rubio pierde vida?',
    promptHint: 'Slide 1 = pregunta potente que interpela; intermedios = argumentos de uno en uno; último = conclusión o CTA.',
    preset: role => {
      if (role === 'hook') return { font: 'sans', fontScale: 1.45, x: 0.5, y: 0.45, overlay: 0.45, bw: false }
      if (role === 'final') return { font: 'serif', fontScale: 1, x: 0.5, y: 0.55, overlay: 0.35, bw: false }
      return { font: 'sans', fontScale: 1, x: 0.5, y: 0.5, overlay: 0.3, bw: false }
    },
  },
  {
    id: 'consejo',
    name: 'Consejo',
    description: 'Texto discreto arriba, la foto manda.',
    previewText: 'Un consejo para tu rutina',
    promptHint: 'Estructura de consejos: slide 1 = gancho breve; intermedios = un consejo práctico por slide con texto en la parte alta; último = CTA.',
    preset: role => {
      if (role === 'hook') return { font: 'sans', fontScale: 0.85, x: 0.5, y: 0.28, overlay: 0.3, bw: false }
      if (role === 'final') return { font: 'sans', fontScale: 0.85, x: 0.5, y: 0.28, overlay: 0.3, bw: false }
      return { font: 'sans', fontScale: 0.85, x: 0.5, y: 0.28, overlay: 0.3, bw: false }
    },
  },
  {
    id: 'bn',
    name: 'B/N Editorial',
    description: 'Fotografía monocroma + serif atemporal.',
    previewText: 'Belleza atemporal',
    promptHint: 'Estructura editorial en blanco y negro: slide 1 = frase corta potente; intermedios = una idea cada uno; último = cierre elegante.',
    preset: role => {
      if (role === 'hook') return { font: 'serif', fontScale: 1.2, x: 0.5, y: 0.45, overlay: 0.4, bw: true }
      if (role === 'final') return { font: 'serif', fontScale: 1, x: 0.5, y: 0.55, overlay: 0.35, bw: true }
      return { font: 'serif', fontScale: 1, x: 0.5, y: 0.5, overlay: 0.35, bw: true }
    },
  },
]

export function templateById(id: string): LabTemplate {
  return LAB_TEMPLATES.find(t => t.id === id) ?? LAB_TEMPLATES[0]
}

/** Preset del slide i en un carrusel de n (primero=hook, último=final). */
export function templatePreset(templateId: string, slideIndex: number, total: number): LabSlidePreset {
  const t = templateById(templateId)
  const role = slideIndex === 0 ? 'hook' : slideIndex === total - 1 ? 'final' : 'mid'
  return t.preset(role)
}

/** Aplica estilo y estructura a los textos generados (editables después). */
export function applyTemplateToSlides(slides: LabSlide[], templateId: string): LabSlide[] {
  const total = slides.length
  return slides.map((s, i) => {
    const p = templatePreset(templateId, i, total)
    return { ...s, font: p.font, fontScale: p.fontScale, x: p.x, y: p.y, overlay: p.overlay, bw: p.bw ?? false }
  })
}

// ── Gestión de slides: añadir / duplicar / eliminar (puras) ────────────────

/** Carrusel manual: empieza con UN slide vacío que la clienta construye. */
export function emptyDraft(): LabDraft {
  return { topic: '', slideCount: 1, slides: [emptySlide()] }
}

/** Inserta slide tras `afterIndex` copiando ESTILO (sin texto ni foto). */
export function addSlideToDraft(d: LabDraft, afterIndex: number): LabDraft {
  if (d.slides.length >= MAX_SLIDES) return d
  const src = d.slides[Math.max(0, Math.min(d.slides.length - 1, afterIndex))] ?? emptySlide()
  const fresh = emptySlide({ font: src.font, fontScale: src.fontScale, color: src.color, overlay: src.overlay, x: src.x, y: src.y })
  const slides = [...d.slides]
  slides.splice(Math.min(d.slides.length, afterIndex + 1), 0, fresh)
  return { ...d, slideCount: slides.length, slides }
}

/** Duplicación completa (texto, foto y encuadre incluidos). */
export function duplicateSlideInDraft(d: LabDraft, index: number): LabDraft {
  const src = d.slides[index]
  if (!src) return d
  const slides = [...d.slides]
  slides.splice(index + 1, 0, { ...src })
  return { ...d, slideCount: slides.length, slides }
}

/** Elimina el slide `index` — JAMÁS deja el carrusel en 0 (devuelve null). */
export function removeSlideInDraft(d: LabDraft, index: number): LabDraft | null {
  if (d.slides.length <= 1) return null
  const slides = d.slides.filter((_, i) => i !== index)
  return { ...d, slideCount: slides.length, slides }
}

export function createDraft(topic: string, n: number, texts: string[]): LabDraft {
  const photos = assignRandomPhotos(texts.length)
  return {
    topic,
    slideCount: n,
    slides: texts.map((text, i) => emptySlide({ text, ...photos[i], x: 0.5, y: 0.5 })),
  }
}

/** La key depende del modo: carrusel y stories mantienen drafts separados. */
export function saveDraft(draft: LabDraft, key: string = LAB_STORAGE_KEY): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // localStorage bloqueado (modo privado): el draft vive solo en memoria.
  }
}

export function loadDraft(key: string = LAB_STORAGE_KEY): LabDraft | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LabDraft
    if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) return null
    // Backfill: slides viejos sin focal/zoom vuelven con defaults.
    return { ...parsed, slides: parsed.slides.map(hydrateSlide) }
  } catch {
    return null
  }
}

export function clearDraft(key: string = LAB_STORAGE_KEY): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignorar
  }
}