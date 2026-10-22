// Motor de render de STORIES visuales — canvas 2D a 1080×1920 (9:16).
// LA MISMA función dibuja preview y export: WYSIWYG (mismo principio que carruseles).
// NO reutiliza drawCarouselSlide (SLIDE_W/H van cocinados dentro del motor de
// plantillas 4:5); reusa las primitivas paramétricas del motor (drawPhoto) y
// los helpers puros de texto (fitFontSize/wrapText), que son independientes de
// resolución. La geometría del texto ES la API: layoutStoryText alimenta el
// hit-test del editor y el render emite la caja final (misma fuente de verdad).

import { fitFontSize, Measure, wrapText } from '../carousel/text'
import { drawPhoto } from '../carousel/render'
import { StoryVisual } from '../editor/types'

export const STORY_W = 1080
export const STORY_H = 1920

// ── Paletas de degradado ─────────────────────────────────────────────────────

export interface StoryPalette {
  id: string
  name: string
  from: string
  to: string
  angle: number // grados CSS (160 = como los RoleGradients del mockup)
}

// Espeja ROLE_GRADIENTS de components/content/StoryMockup.tsx (los degradados
// que la app ya usa para stories) + "noche" derivado del granate de marca.
export const STORY_PALETTES: StoryPalette[] = [
  { id: 'granate', name: 'Burdeos', from: '#8A1E3B', to: '#591427', angle: 160 },
  { id: 'petroleo', name: 'Rosa empolvado', from: '#B05B70', to: '#86384F', angle: 160 },
  { id: 'dorado', name: 'Caramelo', from: '#A8742E', to: '#7A5020', angle: 160 },
  { id: 'noche', name: 'Noche', from: '#3d1621', to: '#1c0a10', angle: 160 },
]

export function storyPalette(id: string): StoryPalette {
  return STORY_PALETTES.find(p => p.id === id) ?? STORY_PALETTES[0]
}

export function defaultStoryVisual(paletteId = 'granate'): StoryVisual {
  return {
    background: 'gradient',
    paletteId,
    photo: null,
    text: { dx: 0, dy: 0, sizeFactor: 1 },
    overlay: 0.3,
  }
}

// ── Geometría del bloque de texto (pura, usable para hit-test y render) ─────

const BAND_W_FRAC = 0.84
const BAND_H_FRAC = 0.42
const EDGE = 20 // margen mínimo del borde, en px de canvas

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface StoryTextLayout {
  band: Rect // banda máx donde cabe el texto ajustado
  rect: Rect // caja FINAL dibujada (lo que el drag debe seguir)
  size: number
  lines: string[]
}

/**
 * Caja BASE del bloque de texto (banda) con el ajuste aplicado y clampado:
 * el bloque nunca sale del lienzo en ninguno de los 4 lados.
 */
export function resolveStoryTextBox(visual: StoryVisual): Rect {
  const w = Math.round(STORY_W * BAND_W_FRAC)
  const h = Math.round(STORY_H * BAND_H_FRAC)
  const maxY = STORY_H - Math.round(STORY_H * 0.08) - h
  const x = Math.max(EDGE, Math.min(STORY_W - EDGE - w, Math.round((STORY_W - w) / 2 + visual.text.dx * STORY_W)))
  const y = Math.max(Math.round(STORY_H * 0.08), Math.min(maxY, Math.round((STORY_H - h) / 2 + visual.text.dy * STORY_H)))
  return { x, y, w, h }
}

const clampSizeFactor = (sf: number): number => Math.max(0.6, Math.min(2, sf || 1))

/**
 * Layout completo del texto: fit de tamaño dentro de la banda, líneas envueltas
 * y caja final centrada verticalmente dentro de la banda (lo que "se ve").
 */
export function layoutStoryText(text: string, visual: StoryVisual, measure: Measure): StoryTextLayout {
  const band = resolveStoryTextBox(visual)
  const sf = clampSizeFactor(visual.text.sizeFactor)
  const size = fitFontSize({ text, maxW: band.w, maxH: band.h, lineHeight: 1.22, startSize: Math.round(96 * sf), minSize: Math.max(24, Math.round(34 * sf)), weight: 600, measure })
  const lines = wrapText(text, band.w, size, 600, measure)
  const usedH = Math.max(lines.length, 1) * size * 1.22
  const rect: Rect = { x: band.x, y: Math.round(band.y + Math.max(0, (band.h - usedH) / 2)), w: band.w, h: usedH }
  return { band, rect, size, lines }
}

// ── Render ───────────────────────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D

function clampOverlay(v: number): number {
  return Math.max(0, Math.min(0.55, Number.isFinite(v) ? v : 0))
}

/** Solo para tests (firma pública estable sin exponer el resto). */
export const clampOverlayTestable = clampOverlay

/** Gradiente CSS-compatible (ángulo en grados) sobre todo el lienzo. */
/** Exportado: el editor de stories del producto dibuja el mismo degradado
 *  160° de los mockups (drawLabSlide rama bgId) — una sola fuente de verdad. */
export function fillGradient(ctx: Ctx, w: number, h: number, deg: number, from: string, to: string) {
  const rad = (deg * Math.PI) / 180
  const axisX = Math.sin(rad)
  const axisY = -Math.cos(rad)
  const length = Math.abs(w * axisX) + Math.abs(h * axisY)
  const cx = w / 2
  const cy = h / 2
  const g = ctx.createLinearGradient(
    cx - (axisX * length) / 2,
    cy - (axisY * length) / 2,
    cx + (axisX * length) / 2,
    cy + (axisY * length) / 2,
  )
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export interface DrawStoryOptions {
  text: string
  visual: StoryVisual
  /** Foto ya precargada por el cliente (objectURL). background='photo' sin él ⇒ degradado. */
  imageEl?: HTMLImageElement | null
  fontFamily: string
  brandName?: string | null
  /** El render reporta la caja final del texto (hit-test del editor). */
  emitTextBox?: (rect: Rect) => void
  measure?: Measure
}

/** Dibuja una story 1080×1920. Preview y export llaman a ESTA función. */
export function drawStoryCanvas(canvas: HTMLCanvasElement, o: DrawStoryOptions): void {
  canvas.width = STORY_W
  canvas.height = STORY_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, STORY_W, STORY_H)
  ctx.textBaseline = 'alphabetic'

  const isPhoto = o.visual.background === 'photo' && !!o.imageEl
  if (isPhoto && o.imageEl) {
    drawPhoto(ctx, o.imageEl, 0, 0, STORY_W, STORY_H, o.visual.photo, 0)
    // Velo de legibilidad sobre la foto (mín. 0.25 — texto blanco siempre legible).
    ctx.fillStyle = 'rgba(10,6,8,1)'
    ctx.globalAlpha = clampOverlay(o.visual.overlay) || 0.25
    ctx.fillRect(0, 0, STORY_W, STORY_H)
    ctx.globalAlpha = 1
  } else {
    const pal = storyPalette(o.visual.paletteId)
    fillGradient(ctx, STORY_W, STORY_H, pal.angle, pal.from, pal.to)
  }

  const text = (o.text || '').trim()
  if (text) {
    const measure = o.measure ?? ((t: string, size: number, weight: number) => {
      ctx.font = `${weight} ${size}px ${o.fontFamily}`
      return ctx.measureText(t).width
    })
    const layout = layoutStoryText(text, o.visual, measure)
    ctx.font = `600 ${layout.size}px ${o.fontFamily}`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    const cx = layout.rect.x + layout.rect.w / 2
    layout.lines.forEach((line, i) => {
      ctx.fillText(line, cx, layout.rect.y + layout.size + i * layout.size * 1.22)
    })
    ctx.textAlign = 'left'
    o.emitTextBox?.(layout.rect)
  }

  const brand = (o.brandName || '').trim()
  if (brand) {
    ctx.font = `600 26px ${o.fontFamily}`
    try {
      ;(ctx as Ctx & { letterSpacing?: string }).letterSpacing = '3px'
    } catch {
      /* navegador sin letterSpacing */
    }
    ctx.fillStyle = '#FFFFFF'
    ctx.globalAlpha = 0.8
    ctx.textAlign = 'center'
    ctx.fillText(brand.toUpperCase(), STORY_W / 2, STORY_H - STORY_H * 0.06)
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
    try {
      ;(ctx as Ctx & { letterSpacing?: string }).letterSpacing = '0px'
    } catch {
      /* noop */
    }
  }
}

/** Nombre del export: story-1-fecha.jpg. */
export function storyExportFileName(index1: number, total: number): string {
  const totalPart = total > 1 ? `de${total}` : ''
  const n = String(Math.max(1, index1)).padStart(2, '0')
  return `story-${n}${totalPart}.jpg`
}