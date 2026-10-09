/**
 * NORMALIZACIÓN DE FOTO EN EL CLIENTE (browser-only).
 *
 * La foto original puede ser HEIC (iPhone), JPG de 8 MPX o PNG enorme.
 * La normalizamos ANTES de subir: JPEG con lado mayor ≤1600px, calidad 92.
 * Ventajas: formato que el proveedor entiende, subida rápida, coste contenido
 * y <img> siempre visible. La edición se aplica SIEMPRE sobre esta versión.
 */

export const MAX_DIM = 1600

/** Puro y testable: escala manteniendo aspecto hacia un lado mayor ≤ maxDim. */
export function fitDimensions(w: number, h: number, maxDim = MAX_DIM): { width: number; height: number } {
  if (!w || !h) throw new Error('dimensiones inválidas')
  const scale = Math.min(1, maxDim / Math.max(w, h))
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

export interface NormalizedPhoto {
  blob: Blob
  width: number
  height: number
  /** La normalización re-codificó el archivo (siempre JPEG al final). */
}

/**
 * Convierte cualquier archivo que el navegador sepa decodificar (HEIC en
 * Safari, JPG, PNG, WebP) a JPEG ≤1600px. Lanza `decode_failed` si no puede,
 * y de UI pediremos un formato corriente.
 */
export async function normalizePhotoFile(file: File, maxDim = MAX_DIM): Promise<NormalizedPhoto> {
  let sourceWidth = 0
  let sourceHeight = 0
  let bitmap: ImageBitmap | null = null
  let fallbackImg: HTMLImageElement | null = null

  if (typeof createImageBitmap === 'function') {
    try {
      bitmap = await createImageBitmap(file)
      sourceWidth = bitmap.width
      sourceHeight = bitmap.height
    } catch {
      /* cae al fallback de <img> */
    }
  }

  if (!bitmap) {
    fallbackImg = await loadViaImgElement(file)
    sourceWidth = fallbackImg.naturalWidth
    sourceHeight = fallbackImg.naturalHeight
  }

  const { width, height } = fitDimensions(sourceWidth, sourceHeight, maxDim)
  const blob = await drawToJpeg(bitmap, fallbackImg, width, height)

  if (bitmap) bitmap.close()
  if (fallbackImg) releaseUrl(fallbackImg)

  if (!blob) throw new Error('decode_failed')
  return { blob, width, height }
}

function loadViaImgElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      releaseUrl(img)
      reject(new Error('decode_failed'))
    }
    img.src = url
  })
}

function releaseUrl(img: HTMLImageElement) {
  if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src)
}

interface DrawableBitmap {
  width: number
  height: number
  close?: () => void
}

async function drawToJpeg(
  bitmap: ImageBitmap | null,
  fallbackImg: HTMLImageElement | null,
  width: number,
  height: number,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap ? (bitmap as unknown as CanvasImageSource) : fallbackImg!, 0, 0, width, height)
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.92))
}