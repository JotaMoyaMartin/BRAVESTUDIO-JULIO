// Assets de la familia Editorial (diseño papel — pipeline PDF Canva).
// Geometría exacta extraída de DISEÑO 3.pdf (canvas px = PDF×4/3) + loader de imágenes.
// El render cae a formas simples si algún asset no cargó (nunca rompe).

import { EditorialAssetsSpec, EditorialImageRef } from './types'

// ── Geometría (px canvas 1080×1350) ─────────────────────────────────────────

export const EDITORIAL_GEOMETRY = {
  // Cover (página 1 del PDF)
  cover: {
    sheet: { x: 124, y: 135, w: 956, h: 1215 }, // asset natural, cortado por bordes dcho/inf
    polaroid: { x: 269, y: 405, w: 480, h: 529 }, // tr_p28 escalado a w=480 (521×574 · 0.9213)
    clip: { x: 499, y: 328, w: 135, h: 172 },
    handle: { x: 295, y: 205 }, // baseline
    titleBox: { x: 229, y: 817, w: 680, h: 253 },
    signature: { x: 960, y: 1190 }, // baseline, alineado derecha al x
  },
  // Statement (página 2 del PDF) — polaroid arriba, frase centrada debajo
  statement: {
    sheet: { x: 41, y: 151, w: 915, h: 1166 }, // asset natural (pre-rotada)
    polaroid: { x: 373, y: 118, w: 521, h: 574 },
    clip: { x: 623, y: 33, w: 146, h: 187 },
    // Foto del polaroid: BBOX del hueco (inclina 5.08° con el marco) en fracciones
    // del polaroid 521×574, medido del PDF (x29 dibujado encima del marco x28).
    polaroidPhotoFx: { fx0: 0.1209, fy0: 0.1167, fx1: 0.879, fy1: 0.794, deg: 5.08 },
    textBox: { x: 240, y: 768, w: 600, h: 155 },
    signature: { x: 853, y: 1085 },
  },
  // Editorial-foto (página 3 del PDF) — foto derecha + titular que funde en blanco
  photoEditorial: {
    photo: { x: 456, y: 303, w: 562, h: 862 },
    strips: [219, 1231], // ys de las tiras (1080×18; la de abajo va en oscuro)
    headline: { x: 118, y: 483, w: 480, h: 370 },
    cta: { x: 122, y: 897, w: 320, h: 180 },
    signature: { x: 958, y: 130 },
  },
} as const

/** Path del asset (Next sirve /carousel-editorial/*). */
export function editorialAssetPath(name: string): string {
  return `/carousel-editorial/${name}.png`
}

function loadOne(path: string): Promise<EditorialImageRef | null> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(null)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        draw: (ctx, x, y, w, h) => {
          const sw = w ?? img.naturalWidth
          const sh = h ?? (sw / img.naturalWidth) * img.naturalHeight
          ctx.drawImage(img, x, y, sw, sh)
        },
      })
    }
    img.onerror = () => resolve(null)
    img.src = path
  })
}

let inflight: Promise<EditorialAssetsSpec> | null = null

/** Single-flight: una sola carga por sesión de página. null si el asset falla (fallback en render). */
export function loadEditorialAssets(): Promise<EditorialAssetsSpec> {
  if (inflight) return inflight
  inflight = Promise.all([
    loadOne(editorialAssetPath('paper-tall')),
    loadOne(editorialAssetPath('paper-tilted')),
    loadOne(editorialAssetPath('polaroid')),
    loadOne(editorialAssetPath('clip')),
    loadOne(editorialAssetPath('strip')),
  ]).then(([paperTall, paperTilted, polaroid, clip, strip]) => ({ paperTall, paperTilted, polaroid, clip, strip }))
  return inflight
}

/** Rect del hueco de foto (bbox del hueco inclinado), dado el rect del polaroid. */
export function polaroidHoleRect(polaroid: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  const { polaroidPhotoFx } = EDITORIAL_GEOMETRY.statement
  return {
    x: polaroid.x + polaroidPhotoFx.fx0 * polaroid.w,
    y: polaroid.y + polaroidPhotoFx.fy0 * polaroid.h,
    w: (polaroidPhotoFx.fx1 - polaroidPhotoFx.fx0) * polaroid.w,
    h: (polaroidPhotoFx.fy1 - polaroidPhotoFx.fy0) * polaroid.h,
  }
}

/**
 * Dibuja la foto del polaroid (o su fallback) EN EL HUECO INCLINADO: el marco
 * va ligeramente rotado en el diseño papel, así que la foto gira con él.
 * La foto entra en cover-fit dentro del rect contenido (sin el bbox), centrado.
 */
export function polaroidPhotoDraw(
  polaroid: { x: number; y: number; w: number; h: number }
): { cx: number; cy: number; w: number; h: number; deg: number } {
  const { polaroidPhotoFx } = EDITORIAL_GEOMETRY.statement
  const cx = polaroid.x + ((polaroidPhotoFx.fx0 + polaroidPhotoFx.fx1) / 2) * polaroid.w
  const cy = polaroid.y + ((polaroidPhotoFx.fy0 + polaroidPhotoFx.fy1) / 2) * polaroid.h
  const bw = (polaroidPhotoFx.fx1 - polaroidPhotoFx.fx0) * polaroid.w
  const bh = (polaroidPhotoFx.fy1 - polaroidPhotoFx.fy0) * polaroid.h
  const th = (polaroidPhotoFx.deg * Math.PI) / 180
  const c = Math.cos(th)
  const s = Math.sin(th)
  // bbox de un rect W×H rotado th: bw = W·c + H·s, bh = W·s + H·c → despeje
  const W = (bw * c - bh * s) / (c * c - s * s)
  const H = (bh - W * s) / c
  return { cx, cy, w: W, h: H, deg: polaroidPhotoFx.deg }
}

/**
 * Split de una línea para el efecto "blanco sobre foto": devuelve cuántos chars
 * (code points) del PRINCIPIO quedan en negro y si hay sufijo sobre la foto.
 * El sufijo empieza en el primer char cuyo INICIO (≥ photoLeft−2) cruza la foto.
 * `sizes` = anchos POR CHAR (code point), en el mismo orden que la línea.
 */
export function splitForWhite(line: string, lineX: number, sizes: number[], photoLeft: number): { blackChars: number; hasWhite: boolean } {
  let start = lineX // inicio del char i (= lineX + suma de anchos anteriores)
  for (let i = 0; i < sizes.length; i++) {
    if (start >= photoLeft - 2) {
      return { blackChars: i, hasWhite: true }
    }
    start += sizes[i]
  }
  return { blackChars: line.length, hasWhite: false }
}