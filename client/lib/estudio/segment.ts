/**
 * Recorte de la persona EN EL MÓVIL (MediaPipe, sin IA de pago).
 * Modelo y motor servidos desde /public/mediapipe: se descargan solo la
 * primera vez que alguien toca «Fondo» (~30 MB) y el navegador los guarda.
 */
import type { ImageSegmenter } from '@mediapipe/tasks-vision'

let segmenterPromise: Promise<ImageSegmenter> | null = null

function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/mediapipe/selfie_multiclass.tflite', delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      })
    })().catch(err => {
      segmenterPromise = null
      throw err
    })
  }
  return segmenterPromise
}

/**
 * Máscara de la persona (pelo incluido) como canvas en escala de grises con
 * alfa: opaco = persona. Se calcula sobre una copia de ≤1024 px.
 */
export async function personMask(img: HTMLImageElement): Promise<HTMLCanvasElement> {
  const seg = await getSegmenter()
  const s = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * s)
  const h = Math.round(img.naturalHeight * s)
  const src = document.createElement('canvas')
  src.width = w
  src.height = h
  src.getContext('2d')!.drawImage(img, 0, 0, w, h)

  const result = seg.segment(src)
  try {
    // Categoría 0 = fondo; la persona es 1 − confianza de fondo.
    const bg = result.confidenceMasks![0]
    const data = bg.getAsFloat32Array()
    const mw = bg.width, mh = bg.height
    const raw = document.createElement('canvas')
    raw.width = mw
    raw.height = mh
    const rc = raw.getContext('2d')!
    const out = rc.createImageData(mw, mh)
    for (let i = 0; i < data.length; i++) {
      // Curva suave: borde limpio sin perder mechones finos.
      const p = 1 - data[i]
      const a = Math.max(0, Math.min(1, (p - 0.25) / 0.5))
      out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = 255
      out.data[i * 4 + 3] = Math.round(a * 255)
    }
    rc.putImageData(out, 0, 0)
    // Escalado + leve desenfoque para suavizar el borde.
    const mask = document.createElement('canvas')
    mask.width = w
    mask.height = h
    const mc = mask.getContext('2d')!
    mc.imageSmoothingQuality = 'high'
    mc.filter = 'blur(1.5px)'
    mc.drawImage(raw, 0, 0, w, h)
    mc.filter = 'none'
    return mask
  } finally {
    result.close()
  }
}
