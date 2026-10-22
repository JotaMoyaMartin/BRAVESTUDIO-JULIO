// Editor de diseño de stories (producto) — helpers PUROS, sin React ni canvas.
// Siembra los slides desde las stories IA: degradado de rol + texto ya montado,
// igual que los mockups de arriba. La edición vive en StoryDesignEditor.
// Fase 1 NO persiste diseños en content_json: solo exporta PNG.

import type { SingleStory } from '@/lib/ai/prompts/stories'
import { LAB_FONT_STEPS, emptySlide, hydrateSlide, type LabSlide } from '@/lib/lab/carousel'
import { storyPalette } from '@/lib/stories/render'

export type StoryBgId = NonNullable<LabSlide['bgId']>

/** Rol n → degradado (espeja ROLE_GRADIENTS de StoryMockup: 1 granate / 2 petróleo / 3 dorado). */
export function defaultBgIdForRole(n: number): StoryBgId {
  if (n === 2) return 'petroleo'
  if (n === 3) return 'dorado'
  return 'granate'
}

/** Índice en LAB_FONT_STEPS según longitud del texto: más texto = letra más pequeña. */
export function fontScaleIndexForText(len: number): number {
  // 21-oct-2026: un paso más pequeño por defecto (Jota) — se puede subir con «Tamaño».
  if (len <= 60) return 3 // XL
  if (len <= 110) return 2 // L
  if (len <= 180) return 1 // M
  return 0 // S
}

/** CSS del degradado para preview DOM (mockups, SlideThumb, botones de fondo). */
export function storyBgCss(bgId: StoryBgId): string {
  const pal = storyPalette(bgId)
  return `linear-gradient(${pal.angle}deg, ${pal.from} 0%, ${pal.to} 100%)`
}

/** Slide inicial de la story n: propuesta montada — degradado de rol + texto IA. */
export function seedStorySlide(story: SingleStory): LabSlide {
  const len = (story.text || '').length
  return emptySlide({
    text: story.text || '',
    bgId: defaultBgIdForRole(story.number),
    photoSrc: null,
    photoId: null,
    focalX: 0.5,
    focalY: 0.5,
    zoom: 1,
    font: 'poppins',
    fontScale: LAB_FONT_STEPS[fontScaleIndexForText(len)],
    color: 'white',
    bw: false,
    overlay: 0,
    x: 0.5,
    y: 0.5,
  })
}

/** Mapa normalizado por nº de story: hidrata los existentes (blobs muertos →
 *  null), siembra los que falten y poda huérfanos. Idempotente. */
export function ensureDesignSlides(
  stories: SingleStory[],
  existing: Record<number, LabSlide>,
): Record<number, LabSlide> {
  const out: Record<number, LabSlide> = {}
  const sorted = [...stories].sort((a, b) => a.number - b.number)
  for (const story of sorted) {
    const prev = existing[story.number]
    if (prev) {
      const slide = hydrateSlide(prev)
      // Blob de una sesión anterior: la URL ya está muerta → volvemos al degradado.
      if (slide.photoSrc && slide.photoSrc.startsWith('blob:')) {
        slide.photoSrc = null
        slide.photoId = null
      }
      out[story.number] = slide
    } else {
      out[story.number] = seedStorySlide(story)
    }
  }
  return out
}

/** Nombre del export PNG: story-01de03.png (o story-01.png si es única). */
export function storyDesignFileName(index1: number, total: number): string {
  const totalPart = total > 1 ? `de${String(total).padStart(2, '0')}` : ''
  const n = String(Math.max(1, index1)).padStart(2, '0')
  return `story-${n}${totalPart}.png`
}