/**
 * ESTUDIO DE FOTOS · motor de edición GRATIS (22-oct-2026).
 * Todo se calcula en el navegador con <canvas>: vista previa en vivo y
 * exportación a tamaño Instagram, sin IA ni coste por foto.
 */

export interface Adjust {
  /** −100…100 en todos (0 = sin cambio), salvo viñeta y grano (0…100). */
  luz: number
  contraste: number
  calidez: number
  color: number
  sombras: number
  vineta: number
  grano: number
}

export const NEUTRAL: Adjust = { luz: 0, contraste: 0, calidez: 0, color: 0, sombras: 0, vineta: 0, grano: 0 }

export const ADJUST_FIELDS: Array<{ id: keyof Adjust; name: string; min: number; max: number }> = [
  { id: 'luz', name: 'Luz', min: -100, max: 100 },
  { id: 'contraste', name: 'Contraste', min: -100, max: 100 },
  { id: 'calidez', name: 'Calidez', min: -100, max: 100 },
  { id: 'color', name: 'Intensidad del color', min: -100, max: 100 },
  { id: 'sombras', name: 'Sombras suaves', min: 0, max: 100 },
  { id: 'vineta', name: 'Viñeta', min: 0, max: 100 },
  { id: 'grano', name: 'Grano de película', min: 0, max: 100 },
]

/** Filtros de salón: un toque y la foto tiene «look» de marca. */
export const PRESETS: Array<{ id: string; name: string; adjust: Adjust }> = [
  { id: 'original', name: 'Original', adjust: NEUTRAL },
  { id: 'natural', name: 'Natural', adjust: { ...NEUTRAL, luz: 8, contraste: 8, color: 6 } },
  { id: 'calido', name: 'Cálido BRÄVE', adjust: { ...NEUTRAL, luz: 6, contraste: 10, calidez: 28, color: 4, vineta: 18 } },
  { id: 'mate', name: 'Editorial mate', adjust: { ...NEUTRAL, luz: 4, contraste: -14, calidez: 10, color: -22, sombras: 45, grano: 22 } },
  { id: 'limpio', name: 'Blanco limpio', adjust: { ...NEUTRAL, luz: 18, contraste: 4, calidez: -10, color: -6, sombras: 20 } },
  { id: 'dorado', name: 'Hora dorada', adjust: { ...NEUTRAL, luz: 4, contraste: 14, calidez: 45, color: 12, vineta: 30 } },
  { id: 'bn', name: 'Blanco y negro', adjust: { ...NEUTRAL, contraste: 22, color: -100, vineta: 20, grano: 18 } },
]

export type AspectId = '4:5' | '9:16' | '1:1' | 'original'

export const ASPECTS: Array<{ id: AspectId; name: string; hint: string }> = [
  { id: '4:5', name: 'Carrusel', hint: '4:5' },
  { id: '9:16', name: 'Story', hint: '9:16' },
  { id: '1:1', name: 'Cuadrada', hint: '1:1' },
  { id: 'original', name: 'Original', hint: 'sin recorte' },
]

/** Tamaño final para Instagram según el formato. */
export function outputSize(aspect: AspectId, img: { width: number; height: number }): { w: number; h: number } {
  if (aspect === '4:5') return { w: 1080, h: 1350 }
  if (aspect === '9:16') return { w: 1080, h: 1920 }
  if (aspect === '1:1') return { w: 1080, h: 1080 }
  const s = Math.min(1, 2048 / Math.max(img.width, img.height))
  return { w: Math.round(img.width * s), h: Math.round(img.height * s) }
}

export type BackgroundMode = { kind: 'original' } | { kind: 'blur'; amount: number } | { kind: 'color'; color: string }

export interface EditState {
  adjust: Adjust
  aspect: AspectId
  /** Encuadre: zoom ≥ 1 y desplazamiento −1…1 dentro del sobrante. */
  zoom: number
  panX: number
  panY: number
  background: BackgroundMode
}

export const INITIAL_EDIT: EditState = { adjust: NEUTRAL, aspect: '4:5', zoom: 1, panX: 0, panY: 0, background: { kind: 'original' } }

/** Filtro CSS de canvas (luz, contraste, color). */
export function cssFilter(a: Adjust): string {
  const b = 1 + a.luz / 220
  const c = 1 + a.contraste / 180
  const s = Math.max(0, 1 + a.color / 100)
  return `brightness(${b.toFixed(3)}) contrast(${c.toFixed(3)}) saturate(${s.toFixed(3)})`
}

/** Rectángulo de la imagen origen que se ve en el lienzo (cover + zoom + pan). */
export function sourceRect(imgW: number, imgH: number, outW: number, outH: number, zoom: number, panX: number, panY: number) {
  const scale = Math.max(outW / imgW, outH / imgH) * zoom
  const sw = outW / scale
  const sh = outH / scale
  const sx = (imgW - sw) / 2 + ((imgW - sw) / 2) * panX
  const sy = (imgH - sh) / 2 + ((imgH - sh) / 2) * panY
  return { sx, sy, sw, sh }
}

/** Safari antiguo no aplica ctx.filter: lo detectamos una vez. */
let filterSupport: boolean | null = null
function supportsCanvasFilter(): boolean {
  if (filterSupport !== null) return filterSupport
  const c = document.createElement('canvas').getContext('2d')!
  c.filter = 'blur(2px)'
  filterSupport = c.filter === 'blur(2px)'
  return filterSupport
}

/** Plan B sin ctx.filter: luz, contraste y color píxel a píxel. */
function pixelAdjust(ctx: CanvasRenderingContext2D, w: number, h: number, a: Adjust) {
  if (!a.luz && !a.contraste && !a.color) return
  const b = 1 + a.luz / 220, c = 1 + a.contraste / 180, s = Math.max(0, 1 + a.color / 100)
  const d = ctx.getImageData(0, 0, w, h)
  const p = d.data
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i] * b, g = p[i + 1] * b, bl = p[i + 2] * b
    r = (r - 128) * c + 128; g = (g - 128) * c + 128; bl = (bl - 128) * c + 128
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * bl
    p[i] = l + (r - l) * s; p[i + 1] = l + (g - l) * s; p[i + 2] = l + (bl - l) * s
  }
  ctx.putImageData(d, 0, 0)
}

/** Dibuja con filtro (o plan B): `blurPx` usa reducción-ampliación si no hay ctx.filter. */
function drawFiltered(ctx: CanvasRenderingContext2D, img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, a: Adjust, blurPx = 0) {
  if (supportsCanvasFilter()) {
    ctx.filter = `${cssFilter(a)}${blurPx ? ` blur(${blurPx}px)` : ''}`
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    ctx.filter = 'none'
    return
  }
  const W = ctx.canvas.width, H = ctx.canvas.height
  const t = document.createElement('canvas')
  const k = blurPx ? Math.max(0.04, 1 / (1 + blurPx / 3)) : 1
  t.width = Math.max(1, Math.round(W * k)); t.height = Math.max(1, Math.round(H * k))
  const tc = t.getContext('2d')!
  tc.imageSmoothingQuality = 'high'
  tc.drawImage(img, sx, sy, sw, sh, dx * k, dy * k, dw * k, dh * k)
  pixelAdjust(tc, t.width, t.height, a)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(t, 0, 0, W, H)
}

let grainTile: HTMLCanvasElement | null = null
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile
  const c = document.createElement('canvas')
  c.width = c.height = 160
  const ctx = c.getContext('2d')!
  const d = ctx.createImageData(160, 160)
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 110
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v
    d.data[i + 3] = 255
  }
  ctx.putImageData(d, 0, 0)
  grainTile = c
  return c
}

/**
 * Pinta la foto editada en `canvas` a (outW × outH).
 * `mask` (opcional): alfa de la persona (blanco = persona) del mismo tamaño
 * que la imagen original; necesario para fondo desenfocado o de color.
 */
export function renderEdit(
  canvas: HTMLCanvasElement,
  img: CanvasImageSource & { width: number; height: number },
  state: EditState,
  outW: number,
  outH: number,
  mask?: HTMLCanvasElement | null,
) {
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  const { sx, sy, sw, sh } = sourceRect(img.width, img.height, outW, outH, state.zoom, state.panX, state.panY)
  const a = state.adjust
  const bg = state.background

  if (bg.kind !== 'original' && mask) {
    // 1) Fondo: foto desenfocada o color liso.
    if (bg.kind === 'blur') {
      const blurPx = Math.round((outW / 1080) * (6 + bg.amount * 0.34))
      // Margen para que el desenfoque no oscurezca los bordes.
      const m = blurPx * 2
      drawFiltered(ctx, img, sx, sy, sw, sh, -m, -m, outW + m * 2, outH + m * 2, a, blurPx)
    } else {
      ctx.fillStyle = bg.color
      ctx.fillRect(0, 0, outW, outH)
    }
    // 2) Persona: foto nítida recortada con la máscara.
    const fg = document.createElement('canvas')
    fg.width = outW
    fg.height = outH
    const f = fg.getContext('2d')!
    drawFiltered(f, img, sx, sy, sw, sh, 0, 0, outW, outH, a)
    f.globalCompositeOperation = 'destination-in'
    const mx = (sx / img.width) * mask.width
    const my = (sy / img.height) * mask.height
    f.drawImage(mask, mx, my, (sw / img.width) * mask.width, (sh / img.height) * mask.height, 0, 0, outW, outH)
    ctx.drawImage(fg, 0, 0)
  } else {
    drawFiltered(ctx, img, sx, sy, sw, sh, 0, 0, outW, outH, a)
  }

  // Calidez: capa ámbar o azul en «soft-light».
  if (a.calidez !== 0) {
    ctx.globalCompositeOperation = 'soft-light'
    ctx.globalAlpha = Math.min(1, Math.abs(a.calidez) / 100) * 0.55
    ctx.fillStyle = a.calidez > 0 ? '#FF9A3C' : '#3C8CFF'
    ctx.fillRect(0, 0, outW, outH)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
  // Sombras suaves: levanta los negros (look mate).
  if (a.sombras > 0) {
    ctx.globalCompositeOperation = 'lighten'
    ctx.fillStyle = `rgba(58,48,44,${(a.sombras / 100) * 0.9})`
    ctx.fillRect(0, 0, outW, outH)
    ctx.globalCompositeOperation = 'source-over'
  }
  if (a.vineta > 0) {
    const g = ctx.createRadialGradient(outW / 2, outH / 2, Math.min(outW, outH) * 0.35, outW / 2, outH / 2, Math.hypot(outW, outH) / 2)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${(a.vineta / 100) * 0.6})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, outW, outH)
  }
  if (a.grano > 0) {
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = (a.grano / 100) * 0.35
    ctx.fillStyle = ctx.createPattern(grain(), 'repeat')!
    ctx.fillRect(0, 0, outW, outH)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo abrir la foto'))
    img.src = src
  })
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('export'))), 'image/jpeg', quality))
}
