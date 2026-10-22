'use client'
// Render canvas de UN slide del LAB. Preview y export llaman a la MISMA
// función (WYSIWYG). Foto cover + focal + zoom (misma fórmula que el DOM:
// photoDrawStyle lib), overlay negro y 1 bloque de texto centrado con wrap.

import {
  LabMode,
  LabSlide,
  LAB_BASE_FONT_PX,
  labCanvasSize,
  photoDrawStyle,
} from '@/lib/lab/carousel'
import { makeMeasurer } from '@/lib/carousel/render'
import { wrapText } from '@/lib/carousel/text'
import { fillGradient, storyPalette } from '@/lib/stories/render'

export interface LabDrawOpts {
  slide: LabSlide
  imageEl: HTMLImageElement | null
  /** Family RESUELTA para canvas (next/font ofusca los nombres internos). */
  fontFamily: string
  /** Modo del lienzo (hoy solo 'carousel' está caracterizado). */
  mode?: LabMode
  w?: number
  h?: number
  emitBox?: (box: { x: number; y: number; w: number; h: number }) => void
}

/** Color del texto en hex (canvas no lee CSS vars del theme). */
export function labTextColorHex(color: LabSlide['color']): string {
  switch (color) {
    case 'white':
      return '#FFFDF5'
    case 'black':
      return '#1F1A17'
    case 'cherry':
      return '#7A1832'
    case 'blush':
      return '#A04060'
  }
}

const BLOCK_W_RATIO = 0.8
const MAX_LINES = 6
const LINE_HEIGHT = 1.3

/**
 * Dibuja un slide completo sobre `canvas` (lo dimensiona según el modo).
 * `fontFamily` ya resuelta (probe del componente); serif pesa 400, sans 600.
 */
export function drawLabSlide(canvas: HTMLCanvasElement, opts: LabDrawOpts): void {
  const { slide, imageEl, fontFamily, emitBox } = opts
  const size = labCanvasSize(opts.mode ?? 'carousel')
  const W = opts.w ?? size.w
  const H = opts.h ?? size.h
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Fondo: foto cover+zoom+focal o gris cálido si no hay imagen viva.
  if (imageEl && imageEl.width && imageEl.height) {
    const s = photoDrawStyle(slide, imageEl.width, imageEl.height, W, H)
    ctx.drawImage(
      imageEl,
      (s.leftPct / 100) * W,
      (s.topPct / 100) * H,
      (s.widthPct / 100) * W,
      (s.heightPct / 100) * H,
    )
    if (slide.bw) applyGrayscale(ctx, W, H)
  } else if (slide.bgId) {
    // Story de producto sin foto: degradado de marca EXACTO de los mockups
    // (160°, paletas de STORY_PALETTES). Inerte en LAB — ahí bgId es null.
    const pal = storyPalette(slide.bgId)
    fillGradient(ctx, W, H, pal.angle, pal.from, pal.to)
  } else {
    ctx.fillStyle = '#EAE0DA'
    ctx.fillRect(0, 0, W, H)
  }

  // Overlay negro para legibilidad.
  if (slide.overlay > 0) {
    ctx.fillStyle = `rgba(0,0,0,${slide.overlay})`
    ctx.fillRect(0, 0, W, H)
  }

  // Texto: 1 bloque centrado con wrap; se reduce si desborda en alto.
  const basePx = LAB_BASE_FONT_PX[slide.font] * slide.fontScale
  const weight = slide.font === 'serif' ? 400 : 600
  const measure = makeMeasurer(ctx, fontFamily)
  const blockW = W * BLOCK_W_RATIO
  let px = basePx
  let lines = wrapText(slide.text, blockW, px, weight, measure)
  while (lines.length > MAX_LINES && px > 24) {
    px *= 0.88
    lines = wrapText(slide.text, blockW, px, weight, measure)
  }
  const lh = px * LINE_HEIGHT
  const blockH = lines.length * lh
  const cx = slide.x * W
  const cy = slide.y * H
  const top = cy - blockH / 2

  ctx.save()
  ctx.font = `${weight} ${Math.round(px)}px ${fontFamily}`
  ctx.fillStyle = labTextColorHex(slide.color)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, top + i * lh + lh / 2)
  })
  ctx.restore()

  emitBox?.({ x: (W - blockW) / 2, y: top, w: blockW, h: blockH })
}

/** B&W determinista en todas las plataformas (bucle ImageData, ~1.4M px). */
function applyGrayscale(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  try {
    const data = ctx.getImageData(0, 0, w, h)
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
      const g = Math.round(px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114)
      px[i] = g
      px[i + 1] = g
      px[i + 2] = g
    }
    ctx.putImageData(data, 0, 0)
  } catch {
    // Canvas manchado (CORS): la foto sale en color pero el slide se exporta.
  }
}

/** Stack CSS + peso de CADA fuente del slide (preview DOM, miniaturas, botones).
 *  El canvas necesita family RESUELTA por probe (next/font ofusca) — ver
 *  LabCarouselEditor; Arial es fuente del sistema y no requiere probe. */
export function labFontCss(font: LabSlide['font']): { family: string; weight: number } {
  switch (font) {
    case 'serif':
      return { family: 'var(--font-dmserif)', weight: 400 }
    case 'sans':
      return { family: 'var(--font-montserrat)', weight: 600 }
    case 'poppins':
      return { family: 'var(--font-poppins)', weight: 600 }
    case 'arial':
      return { family: 'Arial, Helvetica, sans-serif', weight: 600 }
    case 'bebas':
      return { family: 'var(--font-bebas)', weight: 400 }
    case 'archivo':
      return { family: 'var(--font-archivo)', weight: 400 }
    case 'yellowtail':
      return { family: 'var(--font-yellowtail)', weight: 400 }
  }
}

/** Precarga una foto con CORS (URLs firmadas de Storage manchan el canvas). */
export function preloadLabImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Nombre del archivo de export: lab-carrusel-01de05.png / lab-story-01de05.png. */
export function labExportFileName(index0: number, total: number, mode: LabMode = 'carousel'): string {
  const n = String(index0 + 1).padStart(2, '0')
  const t = String(total).padStart(2, '0')
  return `lab-${mode === 'story' ? 'story' : 'carrusel'}-${n}de${t}.png`
}