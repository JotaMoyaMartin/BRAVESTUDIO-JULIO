// Creador de Carruseles BRÄVE — tipos compartidos.
// Principio: la IA escribe el CONTENIDO; el motor de plantillas controla el DISEÑO.
// La estilista no diseña, la estilista elige.

export type CarouselFamily = 'minimal' | 'beauty' | 'bold' | 'editorial'

export interface CarouselPalette {
  bg: string // fondo del slide
  ink: string // texto principal
  accent: string // acento (números, líneas, CTA)
  onAccent?: string // texto sobre acento
}

export interface SlideContent {
  number: number
  role: string
  text: string
}

export interface CarouselContent {
  title: string
  slides: SlideContent[]
  visualIdea?: string
  captionWithHashtags?: string
}

export interface SlideImage {
  src: string // objectURL / dataURL (solo en memoria en V1)
  scale: number // 1 = cover fit; >1 zoom in
  offsetX: number // -1..1 (fracción del ancho del hueco)
  offsetY: number
}

export type SlideLayout =
  | 'cover' // portada: número + título protagonista
  | 'cover-photo' // portada: título + fotografía
  | 'text' // texto protagonista
  | 'text-photo' // texto + fotografía
  | 'list' // lista corta (textos con saltos)
  | 'cta' // cierre + llamada a la acción

export interface CarouselBrandMark {
  name?: string | null // nombre del salón (Mi Marca) o default BRÄVE
}

export interface RenderSlideOptions {
  slide: SlideContent
  layout: SlideLayout
  index: number // 0-based
  total: number
  family: CarouselFamily
  palette: CarouselPalette
  brandName?: string | null
  image?: SlideImage | null // pan/zoom de la foto (spec)
  imageEl?: HTMLImageElement | null // foto ya precargada por el cliente
  fontFamily: string
  // Editorial: assets del diseño papel (hojas/polaroid/pin/tiras) + familias serif/script (next/font).
  editorialAssets?: EditorialAssetsSpec | null
  serifFamily?: string
  scriptFamily?: string
}

/** Referencia de imagen ya cargada (loader del cliente). Estructura, no DOM, para tests. */
export interface EditorialImageRef {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, w?: number, h?: number) => void
}

export const EDITORIAL_ASSET_KEYS = ['paperTall', 'paperTilted', 'polaroid', 'clip', 'strip'] as const

export type EditorialAssetsSpec = Partial<Record<(typeof EDITORIAL_ASSET_KEYS)[number], EditorialImageRef | null>>

export const SLIDE_W = 1080
export const SLIDE_H = 1350