import { describe, expect, it } from 'vitest'
import { REC_SIZES, computeRecordSize, coverCrop } from '@/components/teleprompter/useCameraRecorder'

// Recorte vertical 9:16: la cámara da 4:3 (u otra proporción) y el vídeo se
// guarda rellenando 720×1280 con el recorte centrado (lo que se ve en pantalla).

describe('coverCrop', () => {
  const TW = 720
  const TH = 1280

  it('cámara 4:3 → recorta los lados, altura completa', () => {
    const c = coverCrop(1024, 768, TW, TH)
    expect(c.sh).toBe(768)
    expect(c.sw).toBeCloseTo(768 * (9 / 16))
    expect(c.sx).toBeCloseTo((1024 - 768 * (9 / 16)) / 2)
    expect(c.sy).toBe(0)
  })

  it('vídeo cuadrado → recorta la altura, ancho completo no cabe', () => {
    const c = coverCrop(1080, 1080, TW, TH)
    expect(c.sw).toBeCloseTo(1080 * (9 / 16))
    expect(c.sh).toBe(1080)
    expect(c.sy).toBe(0)
  })

  it('vídeo más estrecho que 9:16 → recorta arriba y abajo', () => {
    const c = coverCrop(720, 1600, TW, TH)
    expect(c.sw).toBe(720)
    expect(c.sh).toBe(1280)
    expect(c.sx).toBe(0)
    expect(c.sy).toBe(160)
  })

  it('apaisado 16:9 → recorta los lados', () => {
    const c = coverCrop(1920, 1080, TW, TH)
    expect(c.sw).toBeCloseTo(1080 * (9 / 16))
    expect(c.sh).toBe(1080)
    expect(c.sy).toBe(0)
  })

  it('la región cabe siempre dentro del vídeo', () => {
    for (const [vw, vh] of [[640, 480], [1280, 720], [960, 1280], [4000, 3000]]) {
      const c = coverCrop(vw, vh, TW, TH)
      expect(c.sw).toBeLessThanOrEqual(vw)
      expect(c.sh).toBeLessThanOrEqual(vh)
      expect(c.sx).toBeGreaterThanOrEqual(0)
      expect(c.sy).toBeGreaterThanOrEqual(0)
      expect(c.sx + c.sw).toBeLessThanOrEqual(vw)
      expect(c.sy + c.sh).toBeLessThanOrEqual(vh)
    }
  })
})

// Tamaño REAL de grabación: nunca upscale fake (un 4K etiquetado sobre cámara
// 720p salía borroso) y nunca por encima del objetivo de la calidad elegida.
describe('computeRecordSize', () => {
  it('cámara 1080p apaisada → HD exacto 720×1280', () => {
    expect(computeRecordSize(1920, 1080, 'hd')).toEqual({ w: 720, h: 1280 })
  })

  it('cámara 4K apaisada → píxeles reales del crop 9:16 (sin inflado)', () => {
    const size = computeRecordSize(3840, 2160, 'uhd')
    expect(size.w).toBe(1215)
    expect(size.h).toBe(2160)
    expect(size.h).toBeGreaterThanOrEqual(REC_SIZES.hd.h)
  })

  it('cámara 720p con 4K elegido → NO infla: graba HD (calidad real, no etiqueta)', () => {
    const size = computeRecordSize(1280, 720, 'uhd')
    expect(size.w).toBeLessThanOrEqual(REC_SIZES.uhd.w)
    expect(size.h).toBeLessThanOrEqual(REC_SIZES.uhd.h)
    expect(size.h).toBeLessThanOrEqual(1280) // nada de 3840 upscale
  })

  it('cámara baja (480p con HD) → upscale acotado, nunca por encima del target', () => {
    const size = computeRecordSize(640, 480, 'hd')
    expect(size.w).toBeLessThanOrEqual(REC_SIZES.hd.w)
    expect(size.h).toBeLessThanOrEqual(REC_SIZES.hd.h)
  })

  it('conserva la proporción 9:16 en todos los casos', () => {
    for (const [vw, vh] of [[640, 480], [1280, 720], [1920, 1080], [3840, 2160]]) {
      for (const q of ['hd', 'uhd'] as const) {
        const s = computeRecordSize(vw, vh, q)
        expect(s.w / s.h).toBeCloseTo(9 / 16, 1)
        expect(s.w).toBeGreaterThan(0)
        expect(s.h).toBeGreaterThan(0)
      }
    }
  })

  it('sin vídeo (0×0) → cae a HD sensato', () => {
    expect(computeRecordSize(0, 0, 'hd')).toEqual({ w: 720, h: 1280 })
    expect(computeRecordSize(0, 0, 'uhd')).toEqual({ w: 720, h: 1280 })
  })
})