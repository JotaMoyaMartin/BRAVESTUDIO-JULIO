// Editores visuales (canvas) — tipos compartidos entre Carrusel y Stories.
// Principio (plan D4): la IA escribe el contenido; la estilista puede AJUSTAR
// (mover/tamaño) el texto y elegir el fondo. Todo en fracciones (−1..1 / ×1):
// serializable en localStorage e independiente de la resolución del canvas.

import { SlideImage, TextAdjust } from '../carousel/types'

export type PhotoSource = 'catalog' | 'camera' | 'upload'

/** El visual de una story: fondo (degradado de marca o foto) + texto movible. */
export interface StoryVisual {
  background: 'gradient' | 'photo'
  /** Id de STORY_PALETTES (lib/stories/render.ts) cuando background='gradient'. */
  paletteId: string
  /** Foto de fondo cuando background='photo' (cover-fit + pan). Solo en memoria. */
  photo: SlideImage | null
  text: TextAdjust
  /** Velo negro 0..0.55 sobre la foto para legibilidad del texto. */
  overlay: number
}

/** Ítem del catálogo de stock de la app (lib/editor/catalog.ts). */
export interface EditorPhotoItem {
  id: string
  categoryId: string
  src: string
  title?: string
  /** Etiquetas transversales (ej. 'resultado', 'detalle') para filtros. */
  tags?: string[]
}