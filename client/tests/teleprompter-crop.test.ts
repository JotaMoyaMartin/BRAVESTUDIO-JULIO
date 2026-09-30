import { describe, expect, it } from 'vitest'
import { coverCrop } from '@/components/teleprompter/useCameraRecorder'

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