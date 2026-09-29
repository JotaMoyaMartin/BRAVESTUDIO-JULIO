// Motor de plantillas de Carruseles BRÄVE — renderer canvas 2D a 1080×1350.
// LA MISMA función dibuja preview y export: WYSIWYG garantizado.
// La IA solo aporta texto; aquí se controla el diseño completo (plantillas bloqueadas).
// V2: gradientes, números fantasma, pills de rol, marcos finos, duotono y geometría.

import {
  RenderSlideOptions,
  SlideImage,
  SLIDE_H,
  SLIDE_W,
} from './types'
import { fitFontSize, listItems, Measure, wrapText } from './text'
import { EDITORIAL_GEOMETRY } from './assets'
import { EDITORIAL_TOKENS } from './templates'

const GEOM = EDITORIAL_GEOMETRY

export { SLIDE_W, SLIDE_H } from './types'

type Ctx = CanvasRenderingContext2D

export function makeMeasurer(ctx: Ctx, fontFamily: string): Measure {
  return (text, size, weight) => {
    ctx.font = `${weight} ${size}px ${fontFamily}`
    return ctx.measureText(text).width
  }
}

function pageLabel(index0: number, total: number): string {
  return `${index0 + 1}/${total}`
}

function pad2(n: number): string {
  return String(n + 1).padStart(2, '0')
}

// ── Color ───────────────────────────────────────────────────────────────────

function parseHex(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Mezcla dos colores hex (t=0 → a, t=1 → b). Para derivados sutiles del token. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

// ── Primitivas ──────────────────────────────────────────────────────────────

/** Radios por esquina [tl, tr, br, bl] o único. */
type Radius = number | [number, number, number, number]

function roundedRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: Radius) {
  const rr = (v: number) => Math.max(0, Math.min(v, w / 2, h / 2))
  const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map(rr)
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.arcTo(x + w, y, x + w, y + tr, tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
  ctx.lineTo(x + bl, y + h)
  ctx.arcTo(x, y + h, x, y + h - bl, bl)
  ctx.lineTo(x, y + tl)
  ctx.arcTo(x, y, x + tl, y, tl)
  ctx.closePath()
}

function drawPhoto(
  ctx: Ctx,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  image?: SlideImage | null,
  radius: Radius = 0,
  tint?: string,
) {
  if (!img || !img.width || !img.height) return
  // Sombra suave bajo fotos con radio (profundidad sutil).
  if (radius !== 0) {
    ctx.save()
    ctx.shadowColor = 'rgba(26,10,14,0.16)'
    ctx.shadowBlur = 36
    ctx.shadowOffsetY = 14
    roundedRectPath(ctx, x, y, w, h, radius)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.restore()
  }
  ctx.save()
  if (radius !== 0) {
    roundedRectPath(ctx, x, y, w, h, radius)
    ctx.clip()
  }
  // Cover-fit + pan (offsets en fracción del hueco) + zoom.
  const base = Math.max(w / img.width, h / img.height)
  const s = base * (image?.scale && image.scale > 0 ? image.scale : 1)
  const dw = img.width * s
  const dh = img.height * s
  // Clamp del pan: la foto nunca deja huecos en blanco (cubre siempre el box).
  const roomX = Math.max(0, (dw - w) / (2 * w))
  const roomY = Math.max(0, (dh - h) / (2 * h))
  const ox = Math.max(-roomX, Math.min(roomX, image?.offsetX ?? 0))
  const oy = Math.max(-roomY, Math.min(roomY, image?.offsetY ?? 0))
  const cx = x + w / 2 + ox * w
  const cy = y + h / 2 + oy * h
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh)
  // Duotono: velo multiplicado que rico-tonea la foto con el acento.
  if (tint) {
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = tint
    ctx.fillRect(x, y, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}

/** Fondo con gradiente vertical sutil (derivado del token bg). */
function gradientBg(ctx: Ctx, bg: string, wash: string, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, SLIDE_H)
  g.addColorStop(0, bg)
  g.addColorStop(1, mix(bg, wash, t))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H)
}

/** Resplandor radial suave — mancha de color difusa. */
function radialGlow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
}

/** Texto fantasma gigante (número editorial) tras el contenido. */
function ghostText(ctx: Ctx, text: string, x: number, y: number, size: number, color: string, alpha: number, fontFamily: string, align: CanvasTextAlign = 'right') {
  ctx.save()
  ctx.font = `800 ${size}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  ctx.textAlign = align
  ctx.fillText(text, x, y)
  ctx.restore()
}

/** Píldora con el rol del slide (etiqueta editorial). Devuelve el ancho. */
function pillBadge(ctx: Ctx, text: string, x: number, y: number, fg: string, fontFamily: string, opts: { bg?: string; border?: string; size?: number } = {}): number {
  const size = opts.size ?? 26
  const label = text.toUpperCase()
  ctx.save()
  ctx.font = `700 ${size}px ${fontFamily}`
  trySetLetterSpacing(ctx, '4px')
  const w = ctx.measureText(label).width + 48
  const h = size + 26
  roundedRectPath(ctx, x, y, w, h, h / 2)
  if (opts.bg) {
    ctx.fillStyle = opts.bg
    ctx.fill()
  }
  if (opts.border) {
    ctx.strokeStyle = opts.border
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.fillStyle = fg
  ctx.fillText(label, x + 24, y + h / 2 + size * 0.36)
  ctx.restore()
  return w
}

/** Marco fino interior (estilo passe-partout). */
function fineFrame(ctx: Ctx, x: number, y: number, w: number, h: number, inset: number, color: string, lw = 2) {
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2)
  ctx.restore()
}

/** Marcas de corte en las 4 esquinas (detalle editorial). */
function cornerMarks(ctx: Ctx, m: number, len: number, color: string) {
  ctx.save()
  ctx.globalAlpha = 0.28
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  const w = SLIDE_W
  const h = SLIDE_H
  const p = m
  ctx.beginPath()
  // top-left
  ctx.moveTo(p, p + len); ctx.lineTo(p, p); ctx.lineTo(p + len, p)
  // top-right
  ctx.moveTo(w - p - len, p); ctx.lineTo(w - p, p); ctx.lineTo(w - p, p + len)
  // bottom-right
  ctx.moveTo(w - p, h - p - len); ctx.lineTo(w - p, h - p); ctx.lineTo(w - p - len, h - p)
  // bottom-left
  ctx.moveTo(p + len, h - p); ctx.lineTo(p, h - p); ctx.lineTo(p, h - p - len)
  ctx.stroke()
  ctx.restore()
}

/** Rejilla de puntos (textura) en una banda. */
function dotsGrid(ctx: Ctx, x: number, y: number, cols: number, rows: number, gap: number, r: number, color: string, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.beginPath()
      ctx.arc(x + i * gap, y + j * gap, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Banda diagonal suave (transformada). */
function diagonalBand(ctx: Ctx, color: string, alpha: number, angle = -0.22, halfH = 300) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.translate(SLIDE_W / 2, SLIDE_H / 2)
  ctx.rotate(angle)
  ctx.fillRect(-SLIDE_W, -halfH, SLIDE_W * 2, halfH * 2)
  ctx.restore()
}

/** Arco fino decorativo. */
function thinArc(ctx: Ctx, cx: number, cy: number, r: number, color: string, alpha: number, lw = 2) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI * 0.1, Math.PI * 0.92)
  ctx.stroke()
  ctx.restore()
}

/** Línea horizontal fina. */
function thinRule(ctx: Ctx, x: number, y: number, w: number, color: string, alpha = 0.14, lw = 2) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.stroke()
  ctx.restore()
}

/** Dibuja un bloque de texto ajustado (auto-fit) y devuelve la altura usada. */
function drawFittedText(
  ctx: Ctx,
  text: string,
  box: { x: number; y: number; w: number; h: number },
  opts: { startSize: number; minSize: number; weight: number; lineHeight: number; color: string; measure: Measure; fontFamily: string; align?: CanvasTextAlign },
): number {
  const size = fitFontSize({ text, maxW: box.w, maxH: box.h, lineHeight: opts.lineHeight, startSize: opts.startSize, minSize: opts.minSize, weight: opts.weight, measure: opts.measure })
  const lines = wrapText(text, box.w, size, opts.weight, opts.measure)
  ctx.font = `${opts.weight} ${size}px ${opts.fontFamily}`
  ctx.fillStyle = opts.color
  ctx.textAlign = opts.align ?? 'left'
  const lh = size * opts.lineHeight
  let y = box.y
  for (const line of lines) {
    ctx.fillText(line, opts.align === 'center' ? box.x + box.w / 2 : box.x, y + size)
    y += lh
  }
  ctx.textAlign = 'left'
  return lines.length * lh
}

function drawBrandMark(ctx: Ctx, name: string, x: number, y: number, color: string, fontFamily: string) {
  ctx.font = `600 24px ${fontFamily}`
  trySetLetterSpacing(ctx, '3px')
  ctx.fillStyle = color
  ctx.globalAlpha = 0.75
  ctx.fillText(name.toUpperCase(), x, y)
  ctx.globalAlpha = 1
  trySetLetterSpacing(ctx, '0px')
}

function drawPageNumber(ctx: Ctx, label: string, x: number, y: number, color: string, fontFamily: string) {
  ctx.font = `600 26px ${fontFamily}`
  ctx.fillStyle = color
  ctx.globalAlpha = 0.7
  ctx.textAlign = 'right'
  ctx.fillText(label, x, y)
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1
}

function trySetLetterSpacing(ctx: Ctx, value: string) {
  try {
    ;(ctx as Ctx & { letterSpacing?: string }).letterSpacing = value
  } catch {
    /* navegadores sin letterSpacing: sin tracking, no rompe */
  }
}

// ── FAMILIA MINIMAL — editorial, limpia, premium ────────────────────────────

function renderMinimal(ctx: Ctx, o: RenderSlideOptions, brand: string, measurer: Measure) {
  const p = o.palette
  gradientBg(ctx, p.bg, p.accent, 0.05)
  const M = 96 // margen
  const W = SLIDE_W - M * 2

  if (o.layout === 'cover') {
    ghostText(ctx, pad2(0), SLIDE_W - M + 10, 560, 360, p.accent, 0.06, o.fontFamily)
    pillBadge(ctx, o.slide.role, M, 150, p.accent, o.fontFamily, { border: p.accent })
    ctx.fillStyle = p.accent
    ctx.fillRect(M, 268, 110, 8)
    ctx.beginPath()
    ctx.arc(M + 126, 272, 5, 0, Math.PI * 2)
    ctx.fill()
    drawFittedText(ctx, o.slide.text, { x: M, y: 420, w: W, h: 640 }, { startSize: 104, minSize: 50, weight: 800, lineHeight: 1.12, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
    cornerMarks(ctx, 44, 26, p.ink)
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
    drawPageNumber(ctx, pageLabel(0, o.total), SLIDE_W - M, SLIDE_H - 110, p.accent, o.fontFamily)
    return
  }

  if (o.layout === 'cover-photo') {
    drawPhoto(ctx, o.imageEl ?? null, 0, 0, SLIDE_W, 760, o.image, 0)
    // Fundido de la foto al fondo (sin corte duro).
    const g = ctx.createLinearGradient(0, 640, 0, 840)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, p.bg)
    ctx.fillStyle = g
    ctx.fillRect(0, 640, SLIDE_W, 200)
    ghostText(ctx, pad2(0), SLIDE_W - M + 10, 1150, 300, p.accent, 0.06, o.fontFamily)
    pillBadge(ctx, o.slide.role, M, 880, p.accent, o.fontFamily, { border: p.accent })
    drawFittedText(ctx, o.slide.text, { x: M, y: 990, w: W, h: 260 }, { startSize: 62, minSize: 36, weight: 700, lineHeight: 1.2, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
    drawBrandMark(ctx, brand, M, SLIDE_H - 60, p.ink, o.fontFamily)
    drawPageNumber(ctx, pageLabel(0, o.total), SLIDE_W - M, SLIDE_H - 60, p.accent, o.fontFamily)
    return
  }

  if (o.layout === 'text-photo') {
    ghostText(ctx, pad2(o.index), SLIDE_W - M + 10, 520, 280, p.accent, 0.055, o.fontFamily)
    pillBadge(ctx, o.slide.role, M, 120, p.accent, o.fontFamily, { border: p.accent })
    drawFittedText(ctx, o.slide.text, { x: M, y: 260, w: W, h: 380 }, { startSize: 58, minSize: 32, weight: 600, lineHeight: 1.35, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
    drawPhoto(ctx, o.imageEl ?? null, M, 700, W, 500, o.image, 48)
    fineFrame(ctx, M, 700, W, 500, -14, p.accent)
    drawBrandMark(ctx, brand, M, SLIDE_H - 70, p.ink, o.fontFamily)
    drawPageNumber(ctx, pageLabel(o.index, o.total), SLIDE_W - M, SLIDE_H - 70, p.accent, o.fontFamily)
    return
  }

  if (o.layout === 'list') {
    ghostText(ctx, pad2(o.index), SLIDE_W - M + 10, 1250, 260, p.accent, 0.05, o.fontFamily)
    pillBadge(ctx, o.slide.role, M, 120, p.accent, o.fontFamily, { border: p.accent })
    const items = listItems(o.slide.text)
    let y = 340
    const size = fitFontSize({ text: longestLine(o.slide.text), maxW: W - 90, maxH: 260, lineHeight: 1.3, startSize: 50, minSize: 30, weight: 600, measure: measurer })
    for (const [n, item] of items.entries()) {
      // Anillo editorial con punto en vez de punto relleno.
      ctx.strokeStyle = p.accent
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(M + 14, y + 8, 14, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = p.accent
      ctx.beginPath()
      ctx.arc(M + 14, y + 8, 5, 0, Math.PI * 2)
      ctx.fill()
      const lines = wrapText(item, W - 90, size, 600, measurer)
      ctx.font = `600 ${size}px ${o.fontFamily}`
      ctx.fillStyle = p.ink
      lines.forEach((line, i) => ctx.fillText(line, M + 60, y + 20 + i * size * 1.3))
      y += Math.max(lines.length, 1) * size * 1.3 + 56
      void n
    }
    thinRule(ctx, M, SLIDE_H - 160, W, p.ink)
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
    drawPageNumber(ctx, pageLabel(o.index, o.total), SLIDE_W - M, SLIDE_H - 110, p.accent, o.fontFamily)
    return
  }

  if (o.layout === 'cta') {
    const g = ctx.createLinearGradient(0, 0, SLIDE_W, SLIDE_H)
    g.addColorStop(0, p.accent)
    g.addColorStop(1, mix(p.accent, '#591427', 0.45))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H)
    const on = p.onAccent ?? p.bg
    dotsGrid(ctx, SLIDE_W - 220, SLIDE_H - 240, 6, 4, 34, 4, on, 0.16)
    ghostText(ctx, '“', M - 6, 420, 300, on, 0.14, o.fontFamily, 'left')
    drawKickerRaw(ctx, o.slide.role, M, 330, on, o.fontFamily)
    drawFittedText(ctx, o.slide.text, { x: M, y: 480, w: W, h: 560 }, { startSize: 76, minSize: 40, weight: 700, lineHeight: 1.25, color: on, measure: measurer, fontFamily: o.fontFamily })
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, on, o.fontFamily)
    return
  }

  // text
  ghostText(ctx, pad2(o.index), SLIDE_W - M + 10, 1080, 320, p.accent, 0.055, o.fontFamily)
  pillBadge(ctx, o.slide.role, M, 120, p.accent, o.fontFamily, { border: p.accent })
  drawFittedText(ctx, o.slide.text, { x: M, y: 420, w: W, h: 660 }, { startSize: 72, minSize: 36, weight: 600, lineHeight: 1.3, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
  thinRule(ctx, M, SLIDE_H - 160, W, p.ink)
  drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
  drawPageNumber(ctx, pageLabel(o.index, o.total), SLIDE_W - M, SLIDE_H - 110, p.accent, o.fontFamily)
}

// ── FAMILIA BEAUTY — visual, fotografías protagonistas ──────────────────────

function renderBeauty(ctx: Ctx, o: RenderSlideOptions, brand: string, measurer: Measure) {
  const p = o.palette
  gradientBg(ctx, p.bg, p.accent, 0.06)
  const M = 88
  const W = SLIDE_W - M * 2

  if (o.layout === 'cover-photo') {
    drawPhoto(ctx, o.imageEl ?? null, 0, 0, SLIDE_W, SLIDE_H, o.image, 0, mix(p.accent, '#591427', 0.1))
    ctx.fillStyle = 'rgba(10,6,8,0.28)'
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H)
    const g = ctx.createLinearGradient(0, SLIDE_H * 0.35, 0, SLIDE_H)
    g.addColorStop(0, 'rgba(10,6,8,0)')
    g.addColorStop(1, 'rgba(10,6,8,0.82)')
    ctx.fillStyle = g
    ctx.fillRect(0, SLIDE_H * 0.35, SLIDE_W, SLIDE_H * 0.65)
    drawBrandMark(ctx, brand, M, 90, '#FFFFFF', o.fontFamily)
    drawPageNumber(ctx, pageLabel(0, o.total), SLIDE_W - M, SLIDE_H - 70, '#FFFFFF', o.fontFamily)
    pillBadge(ctx, o.slide.role, M, SLIDE_H - 560, '#FFFFFF', o.fontFamily, { bg: 'rgba(10,6,8,0.35)' })
    drawFittedText(ctx, o.slide.text, { x: M, y: SLIDE_H - 470, w: W, h: 330 }, { startSize: 88, minSize: 42, weight: 700, lineHeight: 1.15, color: '#FFFFFF', measure: measurer, fontFamily: o.fontFamily })
    return
  }

  if (o.layout === 'cover') {
    // Resplandores orgánicos + arco + título protagonista.
    radialGlow(ctx, SLIDE_W - 180, 200, 320, p.accent, 0.22)
    radialGlow(ctx, 60, SLIDE_H - 140, 260, p.accent, 0.12)
    thinArc(ctx, SLIDE_W - 300, 320, 190, p.accent, 0.35)
    pillBadge(ctx, o.slide.role, M, 150, p.accent, o.fontFamily, { border: p.accent })
    drawFittedText(ctx, o.slide.text, { x: M, y: 440, w: W, h: 620 }, { startSize: 96, minSize: 46, weight: 700, lineHeight: 1.18, color: p.ink, measure: measurer, fontFamily: o.fontFamily, align: 'left' })
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
    drawPageNumber(ctx, pageLabel(0, o.total), SLIDE_W - M, SLIDE_H - 110, p.accent, o.fontFamily)
    return
  }

  if (o.layout === 'text-photo') {
    drawPhoto(ctx, o.imageEl ?? null, 0, 0, SLIDE_W, 760, o.image, [0, 0, 56, 56])
    const g = ctx.createLinearGradient(0, 640, 0, 800)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, p.bg)
    ctx.fillStyle = g
    ctx.fillRect(0, 640, SLIDE_W, 160)
    pillBadge(ctx, o.slide.role, M, 830, p.accent, o.fontFamily, { border: p.accent })
    drawFittedText(ctx, o.slide.text, { x: M, y: 940, w: W, h: 300 }, { startSize: 60, minSize: 32, weight: 700, lineHeight: 1.28, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
    drawBrandMark(ctx, brand, M, SLIDE_H - 60, p.ink, o.fontFamily)
    drawPageNumber(ctx, pageLabel(o.index, o.total), SLIDE_W - M, SLIDE_H - 60, p.accent, o.fontFamily)
    return
  }

  if (o.layout === 'list') {
    radialGlow(ctx, SLIDE_W - 120, SLIDE_H - 100, 300, p.accent, 0.14)
    pillBadge(ctx, o.slide.role, M, 120, p.accent, o.fontFamily, { border: p.accent })
    const items = listItems(o.slide.text)
    const size = fitFontSize({ text: longestLine(o.slide.text), maxW: W - 90, maxH: 240, lineHeight: 1.3, startSize: 48, minSize: 30, weight: 600, measure: measurer })
    let y = 350
    for (const item of items) {
      // Check cuadrado redondeado con punto de acento (centrado a la línea de texto).
      roundedRectPath(ctx, M + 2, y - 34, 34, 34, 10)
      ctx.strokeStyle = p.accent
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = p.accent
      ctx.beginPath()
      ctx.arc(M + 19, y - 17, 6, 0, Math.PI * 2)
      ctx.fill()
      const lines = wrapText(item, W - 90, size, 600, measurer)
      ctx.font = `600 ${size}px ${o.fontFamily}`
      ctx.fillStyle = p.ink
      lines.forEach((line, i) => ctx.fillText(line, M + 64, y + i * size * 1.3))
      y += Math.max(lines.length, 1) * size * 1.3 + 60
    }
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
    drawPageNumber(ctx, pageLabel(o.index, o.total), SLIDE_W - M, SLIDE_H - 110, p.accent, o.fontFamily)
    return
  }

  if (o.layout === 'cta') {
    radialGlow(ctx, SLIDE_W / 2, 200, 560, mix(p.accent, '#FFFFFF', 0.55), 0.35)
    ctx.fillStyle = p.accent
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H)
    fineFrame(ctx, 40, 40, SLIDE_W - 80, SLIDE_H - 80, 0, mix(p.onAccent ?? p.bg, p.accent, 0.35), 2)
    dotsGrid(ctx, M, SLIDE_H - 260, 5, 3, 36, 4, p.onAccent ?? p.bg, 0.16)
    drawKickerRaw(ctx, o.slide.role, M, 320, p.onAccent ?? p.bg, o.fontFamily)
    drawFittedText(ctx, o.slide.text, { x: M, y: 500, w: W, h: 560 }, { startSize: 80, minSize: 42, weight: 700, lineHeight: 1.25, color: p.onAccent ?? p.bg, measure: measurer, fontFamily: o.fontFamily })
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.onAccent ?? p.bg, o.fontFamily)
    return
  }

  // text
  radialGlow(ctx, SLIDE_W - 140, 180, 340, p.accent, 0.18)
  thinArc(ctx, 240, SLIDE_H - 260, 170, p.accent, 0.3)
  pillBadge(ctx, o.slide.role, M, 120, p.accent, o.fontFamily, { border: p.accent })
  drawFittedText(ctx, o.slide.text, { x: M, y: 420, w: W, h: 700 }, { startSize: 70, minSize: 36, weight: 600, lineHeight: 1.32, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
  drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
  drawPageNumber(ctx, pageLabel(o.index, o.total), SLIDE_W - M, SLIDE_H - 110, p.accent, o.fontFamily)
}

// ── FAMILIA BOLD — titulares fuertes y contraste ────────────────────────────

function renderBold(ctx: Ctx, o: RenderSlideOptions, brand: string, measurer: Measure) {
  const p = o.palette
  gradientBg(ctx, p.bg, p.accent, 0.07)
  const M = 90
  const W = SLIDE_W - M * 2

  if (o.layout === 'cover') {
    ghostText(ctx, pad2(o.index), SLIDE_W - M + 24, 620, 420, p.accent, 0.16, o.fontFamily)
    ctx.font = `800 150px ${o.fontFamily}`
    ctx.fillStyle = p.accent
    ctx.fillText(pad2(o.index), M, 300)
    drawFittedText(ctx, o.slide.text, { x: M, y: 460, w: W, h: 600 }, { startSize: 116, minSize: 54, weight: 800, lineHeight: 1.1, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
    ctx.fillStyle = p.accent
    ctx.fillRect(M, SLIDE_H - 190, 200, 12)
    ctx.fillStyle = mix(p.accent, p.ink, 0.35)
    ctx.fillRect(M + 214, SLIDE_H - 182, 90, 4)
    dotsGrid(ctx, SLIDE_W - 250, 130, 5, 3, 32, 4, p.ink, 0.14)
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
    return
  }

  if (o.layout === 'cover-photo') {
    drawPhoto(ctx, o.imageEl ?? null, 0, 0, SLIDE_W, SLIDE_H, o.image, 0, mix(p.accent, p.bg, 0.2))
    ctx.fillStyle = 'rgba(10,6,8,0.5)'
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H)
    ctx.font = `800 120px ${o.fontFamily}`
    ctx.fillStyle = p.accent
    ctx.fillText(pad2(o.index), M, 260)
    drawFittedText(ctx, o.slide.text, { x: M, y: SLIDE_H - 620, w: W, h: 420 }, { startSize: 100, minSize: 50, weight: 800, lineHeight: 1.1, color: '#FFFFFF', measure: measurer, fontFamily: o.fontFamily })
    // Banda cereza inferior con la marca.
    ctx.fillStyle = mix(p.accent, '#591427', 0.5)
    ctx.fillRect(0, SLIDE_H - 150, SLIDE_W, 150)
    drawBrandMark(ctx, brand, M, SLIDE_H - 65, '#FFFFFF', o.fontFamily)
    drawPageNumber(ctx, pageLabel(0, o.total), SLIDE_W - M, SLIDE_H - 65, '#FFFFFF', o.fontFamily)
    return
  }

  if (o.layout === 'text-photo') {
    ctx.font = `800 80px ${o.fontFamily}`
    ctx.fillStyle = p.accent
    ctx.textAlign = 'right'
    ctx.fillText(pageLabel(o.index, o.total), SLIDE_W - M, 200)
    ctx.textAlign = 'left'
    ghostText(ctx, pad2(o.index), SLIDE_W - M + 16, 560, 300, p.accent, 0.12, o.fontFamily)
    drawFittedText(ctx, o.slide.text, { x: M, y: 300, w: W, h: 420 }, { startSize: 66, minSize: 34, weight: 800, lineHeight: 1.18, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
    thinRule(ctx, M, 756, W, p.accent, 0.5, 4)
    drawPhoto(ctx, o.imageEl ?? null, M, 780, W, 440, o.image, [40, 40, 40, 120])
    drawBrandMark(ctx, brand, M, 720, p.ink, o.fontFamily)
    return
  }

  if (o.layout === 'list') {
    ghostText(ctx, pad2(o.index), SLIDE_W - M + 16, 1260, 300, p.accent, 0.12, o.fontFamily)
    drawKickerRaw(ctx, o.slide.role, M, 170, p.accent, o.fontFamily)
    thinRule(ctx, M, 210, 180, p.accent, 0.6, 5)
    const items = listItems(o.slide.text)
    const size = fitFontSize({ text: longestLine(o.slide.text), maxW: W - 130, maxH: 220, lineHeight: 1.25, startSize: 52, minSize: 30, weight: 700, measure: measurer })
    let y = 360
    for (const [n, item] of items.entries()) {
      ctx.font = `800 ${size + 8}px ${o.fontFamily}`
      ctx.fillStyle = p.accent
      ctx.fillText(`${n + 1}.`, M, y)
      const lines = wrapText(item, W - 130, size, 700, measurer)
      ctx.font = `700 ${size}px ${o.fontFamily}`
      ctx.fillStyle = p.ink
      lines.forEach((line, i) => ctx.fillText(line, M + 130, y + i * size * 1.3))
      y += Math.max(lines.length, 1) * size * 1.3 + 48
    }
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
    drawPageNumber(ctx, pageLabel(o.index, o.total), SLIDE_W - M, SLIDE_H - 110, p.accent, o.fontFamily)
    return
  }

  if (o.layout === 'cta') {
    ctx.fillStyle = p.accent
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H)
    diagonalBand(ctx, mix(p.accent, '#591427', 0.5), 0.55, -0.2, 260)
    dotsGrid(ctx, SLIDE_W - 250, 140, 6, 3, 34, 4, p.onAccent ?? p.bg, 0.2)
    ghostText(ctx, '*', SLIDE_W - M, 380, 340, p.onAccent ?? p.bg, 0.18, o.fontFamily)
    drawKickerRaw(ctx, o.slide.role, M, 320, p.onAccent ?? p.bg, o.fontFamily)
    drawFittedText(ctx, o.slide.text, { x: M, y: 520, w: W, h: 520 }, { startSize: 88, minSize: 44, weight: 800, lineHeight: 1.18, color: p.onAccent ?? p.bg, measure: measurer, fontFamily: o.fontFamily })
    drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.onAccent ?? p.bg, o.fontFamily)
    return
  }

  // text
  ctx.font = `800 80px ${o.fontFamily}`
  ctx.fillStyle = p.accent
  ctx.textAlign = 'right'
  ctx.fillText(pageLabel(o.index, o.total), SLIDE_W - M, 200)
  ctx.textAlign = 'left'
  ghostText(ctx, pad2(o.index), SLIDE_W - M + 16, 1060, 340, p.accent, 0.12, o.fontFamily)
  drawKickerRaw(ctx, o.slide.role, M, 170, p.ink, o.fontFamily)
  drawFittedText(ctx, o.slide.text, { x: M, y: 420, w: W, h: 680 }, { startSize: 76, minSize: 38, weight: 800, lineHeight: 1.2, color: p.ink, measure: measurer, fontFamily: o.fontFamily })
  ctx.fillStyle = p.accent
  ctx.fillRect(M, SLIDE_H - 178, 120, 10)
  drawBrandMark(ctx, brand, M, SLIDE_H - 110, p.ink, o.fontFamily)
}

/** Kicker simple (Mayúsculas + tracking) — para fondos de acento. */
function drawKickerRaw(ctx: Ctx, text: string, x: number, y: number, color: string, fontFamily: string) {
  ctx.font = `700 26px ${fontFamily}`
  trySetLetterSpacing(ctx, '4px')
  ctx.fillStyle = color
  ctx.fillText(text.toUpperCase(), x, y)
  trySetLetterSpacing(ctx, '0px')
}

// ── FAMILIA EDITORIAL — papel, polaroid y fotografía real (DISEÑO 3.pdf) ────

const E_TOKENS = EDITORIAL_TOKENS

/** Handle estilo IG para la portada editorial: @ + marca sin espacios/acentos. */
function sluggedHandle(brand: string): string {
  const base = brand
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return `@${base}`
}

/** Firma itálica pequeña (sustituye el "ESTILISTA" del diseño). */
function drawSignatureItalic(ctx: Ctx, text: string, rightX: number, baselineY: number, color: string, fontFamily: string) {
  ctx.save()
  ctx.font = `italic 300 25px ${fontFamily}`
  ctx.fillStyle = color
  ctx.globalAlpha = 0.85
  ctx.textAlign = 'right'
  ctx.fillText(text.toUpperCase(), rightX, baselineY)
  ctx.restore()
}

import { polaroidPhotoDraw, splitForWhite } from './assets'

/** Fondo liso del editorial (los fondos del PDF son colores planos). */
function flatBg(ctx: Ctx, bg: string) {
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H)
}

/** El titular serif con la inicial script decorativa (florituras del diseño). */
function drawSerifTitleWithScript(ctx: Ctx, text: string, box: { x: number; y: number; w: number; h: number }, serif: string, script: string, ink: string, measurer: Measure) {
  const size = fitFontSize({ text, maxW: box.w, maxH: box.h, lineHeight: 1.02, startSize: 122, minSize: 56, weight: 300, measure: measurer })
  const lines = wrapText(text, box.w, size, 300, measurer)
  const lh = size * 1.04
  ctx.font = `300 ${size}px ${serif}`
  ctx.fillStyle = ink
  lines.forEach((line, i) => ctx.fillText(line, box.x, box.y + size + i * lh))
  // Inicial script sobre el arranque del titular (mismo tamaño, flotando al oeste).
  if (lines.length > 0) {
    ctx.font = `400 ${size}px ${script}`
    ctx.fillStyle = ink
    ctx.fillText(lines[0].charAt(0).toUpperCase(), box.x - size * 0.16, box.y + size * 1.02)
  }
}

function renderEditorial(ctx: Ctx, o: RenderSlideOptions, brand: string, measurer: Measure) {
  const a = o.editorialAssets
  const serif = o.serifFamily || o.fontFamily
  const script = o.scriptFamily || serif
  const sans = o.fontFamily

  // Foto del polaroid EN EL HUECO INCLINADO (el marco va girado ~5° en el diseño
  // papel; la foto gira con él). Sin foto: relleno papel para que el marco
  // blanco sobre hoja blanca no desaparezca.
  const drawPolaroidPhoto = (pol: { x: number; y: number; w: number; h: number }) => {
    const d = polaroidPhotoDraw(pol)
    ctx.save()
    ctx.translate(d.cx, d.cy)
    ctx.rotate((d.deg * Math.PI) / 180)
    if (o.imageEl) drawPhoto(ctx, o.imageEl, -d.w / 2, -d.h / 2, d.w, d.h, o.image, 0)
    else {
      ctx.fillStyle = E_TOKENS.putty
      ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h)
    }
    ctx.restore()
  }

  // ── P1 · Cover: papel grande + polaroid con foto + titular serif ──
  if (o.layout === 'cover' || o.layout === 'cover-photo') {
    flatBg(ctx, E_TOKENS.putty)
    if (a?.paperTall) a.paperTall.draw(ctx, GEOM.cover.sheet.x, GEOM.cover.sheet.y, GEOM.cover.sheet.w, GEOM.cover.sheet.h)
    else {
      ctx.fillStyle = E_TOKENS.paper
      const s = GEOM.cover.sheet
      ctx.fillRect(s.x, s.y, s.w, s.h)
    }
    // Foto dentro del hueco del polaroid + marco encima.
    drawPolaroidPhoto(GEOM.cover.polaroid)
    if (a?.polaroid) a.polaroid.draw(ctx, GEOM.cover.polaroid.x, GEOM.cover.polaroid.y, GEOM.cover.polaroid.w, GEOM.cover.polaroid.h)
    ;(o.layout === 'cover' || o.layout === 'cover-photo') && a?.clip && a.clip.draw(ctx, GEOM.cover.clip.x, GEOM.cover.clip.y, GEOM.cover.clip.w, GEOM.cover.clip.h)
    // Handle arriba.
    ctx.font = `400 18px ${sans}`
    trySetLetterSpacing(ctx, '3px')
    ctx.fillStyle = E_TOKENS.ink
    ctx.fillText(sluggedHandle(brand), GEOM.cover.handle.x, GEOM.cover.handle.y)
    trySetLetterSpacing(ctx, '0px')
    drawSerifTitleWithScript(ctx, o.slide.text, GEOM.cover.titleBox, serif, script, E_TOKENS.ink, measurer)
    drawSignatureItalic(ctx, brand, GEOM.cover.signature.x, GEOM.cover.signature.y, E_TOKENS.ink, sans)
    return
  }

  // ── P2 · Statement: hoja inclinada + polaroid + frase centrada ──
  if (o.layout === 'text' || o.layout === 'list') {
    flatBg(ctx, o.palette.bg)
    if (a?.paperTilted) a.paperTilted.draw(ctx, GEOM.statement.sheet.x, GEOM.statement.sheet.y, GEOM.statement.sheet.w, GEOM.statement.sheet.h)
    else {
      ctx.fillStyle = E_TOKENS.paper
      const s = GEOM.statement.sheet
      ctx.fillRect(s.x, s.y, s.w, s.h)
    }
    drawPolaroidPhoto(GEOM.statement.polaroid)
    if (a?.polaroid) a.polaroid.draw(ctx, GEOM.statement.polaroid.x, GEOM.statement.polaroid.y, GEOM.statement.polaroid.w, GEOM.statement.polaroid.h)
    if (a?.clip) a.clip.draw(ctx, GEOM.statement.clip.x, GEOM.statement.clip.y, GEOM.statement.clip.w, GEOM.statement.clip.h)
    // Frase centrada en negrita sobre el papel.
    drawFittedText(ctx, o.slide.text, { x: GEOM.statement.textBox.x, y: GEOM.statement.textBox.y, w: GEOM.statement.textBox.w, h: GEOM.statement.textBox.h }, { startSize: 44, minSize: 24, weight: 700, lineHeight: 1.12, color: E_TOKENS.ink, measure: measurer, fontFamily: sans, align: 'center' })
    drawSignatureItalic(ctx, brand, GEOM.statement.signature.x, GEOM.statement.signature.y, '#000000', sans)
    return
  }

  // ── P3 · Foto-editorial: tiras + foto derecha + titular que funde en blanco ──
  const G = GEOM.photoEditorial
  const isCta = o.layout === 'cta'
  flatBg(ctx, E_TOKENS.paper)
  const drawStrips = () => {
    // Arriba: tira translúcida (asset o hairline suave). Abajo: tira oscura del PDF.
    if (a?.strip) a.strip.draw(ctx, 0, G.strips[0], SLIDE_W, 18)
    else {
      ctx.fillStyle = E_TOKENS.hairline
      ctx.globalAlpha = 0.6
      ctx.fillRect(0, G.strips[0], SLIDE_W, 18)
      ctx.globalAlpha = 1
    }
    ctx.fillStyle = E_TOKENS.hairline
    ctx.fillRect(0, G.strips[1], SLIDE_W, 18)
  }
  drawStrips()

  if (!isCta) {
    drawPhoto(ctx, o.imageEl ?? null, G.photo.x, G.photo.y, G.photo.w, G.photo.h, o.image, 0)
  }
  // Firma arriba a la derecha (también en CTA).
  drawSignatureItalic(ctx, brand, G.signature.x, G.signature.y, E_TOKENS.hairline, sans)

  const headline = o.slide.text.replace(/\n[\s\S]*/, '').trim() || o.slide.text
  // Cuerpo solo si el texto trae segunda parte tras un salto (título\ncuerpo).
  const ctaBody = /\n/.test(o.slide.text) ? o.slide.text.replace(/^[^\n]*\n/, '').trim() : ''

  if (isCta) {
    // CTA: titular serif centrado entre tiras + cuerpo sans (si hay).
    drawFittedText(ctx, headline, { x: 118, y: 380, w: SLIDE_W - 236, h: 420 }, { startSize: 92, minSize: 48, weight: 300, lineHeight: 1.14, color: E_TOKENS.ink, measure: measurer, fontFamily: serif })
    if (ctaBody) drawFittedText(ctx, ctaBody, { x: 122, y: 980, w: SLIDE_W - 244, h: 180 }, { startSize: 34, minSize: 24, weight: 600, lineHeight: 1.4, color: E_TOKENS.ink, measure: measurer, fontFamily: sans })
  } else {
    // Headline izquierda que se funde en blanco encima de la foto.
    const size = fitFontSize({ text: headline, maxW: G.headline.w, maxH: G.headline.h, lineHeight: 1.2, startSize: 77, minSize: 40, weight: 300, measure: measurer })
    const lines = wrapText(headline, G.headline.w, size, 300, measurer)
    const lh = size * 1.2
    ctx.font = `300 ${size}px ${sans}`
    ctx.fillStyle = E_TOKENS.ink
    lines.forEach((line, i) => {
      const y = G.headline.y + size + i * lh
      // Medidas por carácter (code point) para saber dónde cruza la foto.
      const chars = Array.from(line)
      const sizes = chars.map(ch => measurer(ch, size, 300))
      const { blackChars, hasWhite } = splitForWhite(line, G.headline.x, sizes, G.photo.x)
      if (!hasWhite) {
        ctx.fillText(line, G.headline.x, y)
      } else {
        // Todo en negro primero; el sufijo en blanco re-dibujado recortado a la foto.
        ctx.fillText(line, G.headline.x, y)
        ctx.save()
        ctx.beginPath()
        ctx.rect(G.photo.x, G.photo.y, G.photo.w, G.photo.h)
        ctx.clip()
        ctx.fillStyle = E_TOKENS.paper
        // Dibujar char a char para mantener posiciones exactas.
        const x0 = G.headline.x + sizes.slice(0, blackChars).reduce((a, b) => a + b, 0)
        let x = x0
        for (let c = blackChars; c < chars.length; c++) {
          ctx.fillText(chars[c], x, y)
          x += sizes[c]
        }
        ctx.restore()
      }
    })
    // Bloque CTA pequeño bajo el titular dentro de la hoja.
    const body = ctaBody || ''
    if (body) {
      drawFittedText(ctx, body, { x: G.cta.x, y: G.cta.y, w: G.cta.w, h: G.cta.h }, { startSize: 32, minSize: 20, weight: 600, lineHeight: 1.36, color: E_TOKENS.ink, measure: measurer, fontFamily: sans })
    }
  }
}

// ── API del motor ───────────────────────────────────────────────────────────

/** Para el fit de listas: mide por el texto más largo, no por el conjunto. */
export function longestLine(text: string): string {
  return text
    .split('\n')
    .map(l => l.trim())
    .reduce((a, b) => (b.length > a.length ? b : a), '')
}

/** Nombre de archivo del export: 01-portada … NN-slide … NN-final. */
export function exportFileName(index0: number, total: number): string {
  const n = String(index0 + 1).padStart(2, '0')
  const suffix = index0 === 0 ? 'portada' : index0 === total - 1 ? 'final' : 'slide'
  return `${n}-${suffix}.jpg`
}

/**
 * Dibuja un slide 1080×1350 en el canvas dado.
 * Preview y export llaman a ESTA función: cero divergencia visual.
 */
export function drawCarouselSlide(canvas: HTMLCanvasElement, opts: RenderSlideOptions): void {
  canvas.width = SLIDE_W
  canvas.height = SLIDE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, SLIDE_W, SLIDE_H)
  ctx.textBaseline = 'alphabetic'
  const brand = (opts.brandName || 'BRÄVE').trim() || 'BRÄVE'
  const measurer = makeMeasurer(ctx, opts.fontFamily)
  switch (opts.family) {
    case 'beauty':
      renderBeauty(ctx, opts, brand, measurer)
      break
    case 'bold':
      renderBold(ctx, opts, brand, measurer)
      break
    case 'editorial':
      renderEditorial(ctx, opts, brand, measurer)
      break
    default:
      renderMinimal(ctx, opts, brand, measurer)
  }
  ctx.shadowColor = 'transparent'
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
}

/** Carga las fuentes serif/script de la familia Editorial (variables next/font). Falla a la sans. */
export async function ensureEditorialFonts(): Promise<{ serif: string; script: string }> {
  if (typeof document === 'undefined') return { serif: 'Georgia', script: 'Georgia' }
  const cs = getComputedStyle(document.documentElement)
  const pick = (v: string, fallback: string) => cs.getPropertyValue(v).trim().replace(/["']/g, '') || fallback
  const sans = pick('--font-poppins', 'Poppins')
  const serif = pick('--font-fraunces', sans)
  const script = pick('--font-yellowtail', serif)
  try {
    await Promise.all([
      document.fonts.load(`300 100px "${serif}"`),
      document.fonts.load(`400 100px "${script}"`),
      document.fonts.load('300 100px "Poppins"'),
      document.fonts.load(`italic 300 25px "Poppins"`),
    ])
    await document.fonts.ready
  } catch {
    /* sin FontFace API: usa la primera disponible */
  }
  return { serif, script }
}

/** Carga la tipografía del producto (next/font) para usarla en canvas. */
export async function ensureCanvasFont(): Promise<string> {
  if (typeof document === 'undefined') return 'Poppins'
  let family = 'Poppins'
  try {
    const computed = getComputedStyle(document.body).fontFamily
    family = computed.split(',')[0].trim().replace(/["']/g, '') || 'Poppins'
  } catch {
    /* fallback */
  }
  try {
    await Promise.all([400, 600, 700, 800].map(w => document.fonts.load(`${w} 100px "${family}"`).catch(() => null)))
    await document.fonts.ready
  } catch {
    /* sin FontFace API: usa la primera disponible */
  }
  return family
}