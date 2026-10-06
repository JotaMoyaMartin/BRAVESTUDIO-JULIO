// Tests de los helpers puros de la cámara de Foto Inspo (lib/camera/camera.ts).
// Estilo de teleprompter-crop.test.ts: vitest node, números dentro → números fuera.
import { describe, expect, it, vi } from 'vitest'
import {
  clampZoom,
  classifyLens,
  FOTOINSPO_LENS_KEY,
  FOTOINSPO_QUALITY_KEY,
  isDoubleTap,
  isTouchDevice,
  listBackLenses,
  mapUiZoomToConstraint,
  PHOTO_JPEG_QUALITY,
  pinchToZoom,
  pointerDistance,
  readStoredLens,
  readStoredQuality,
  readZoomRange,
  uiZoomFromSettings,
  writeStoredLens,
  writeStoredQuality,
  zoomedCoverRect,
  zoomMaxFromRange,
  ZOOM_MAX,
  type ZoomRange,
} from '@/lib/camera/camera'
import { coverCrop } from '@/components/teleprompter/useCameraRecorder'

// ── classifyLens ─────────────────────────────────────────────────

describe('classifyLens', () => {
  it('clasifica ultra wide en inglés, español y por decimal', () => {
    expect(classifyLens('Back Ultra Wide Camera')).toBe(0.5)
    expect(classifyLens('Trasera Super Gran Angular')).toBe(0.5)
    expect(classifyLens('Gran Angular')).toBe(1) // a secas es la principal
    expect(classifyLens('camera2 ultra-wide')).toBe(0.5)
    expect(classifyLens('0.5x camera')).toBe(0.5)
    expect(classifyLens('0,45x')).toBe(0.5)
    expect(classifyLens('0,67x')).toBeNull() // no clásificable → no chip falso
  })

  it('clasifica telefoto y no confunde el Nx de un decimal', () => {
    expect(classifyLens('Telephoto Camera')).toBe(2)
    expect(classifyLens('2x Zoom')).toBe(2)
    expect(classifyLens('2.5x Tele')).toBe(2)
    // "0.5x" NO puede aterrizar aquí: el "5x" del decimal es una trampa.
    expect(classifyLens('0.5x camera')).not.toBe(2)
    expect(classifyLens('Periscope lens')).toBe(2)
  })

  it('clasifica wide/back/trasera/1x', () => {
    expect(classifyLens('Back Camera')).toBe(1)
    expect(classifyLens('Cámara trasera')).toBe(1)
    expect(classifyLens('Wide Camera')).toBe(1)
    expect(classifyLens('1x')).toBe(1)
  })

  it('devuelve null en vacío, frontal y labels opacos', () => {
    expect(classifyLens('')).toBeNull()
    expect(classifyLens('Front Camera')).toBeNull()
    expect(classifyLens('user')).toBeNull()
    expect(classifyLens('camera2, facing back, orientation 90')).toBeNull() // sin tokens → null
  })
})

// ── listBackLenses ───────────────────────────────────────────────

interface FakeDevice {
  kind?: string
  deviceId?: string
  label?: string
}
function dev(id: string, label: string): FakeDevice {
  return { kind: 'videoinput', deviceId: id, label }
}

describe('listBackLenses', () => {
  it('arma chips 0.5/1/2 ordenados y deduplicados por factor', () => {
    const lenses = listBackLenses([
      dev('t', 'Back Telephoto Camera'),
      dev('w', 'Back Camera'),
      dev('u', 'Back Ultra Wide'),
      dev('u2', 'Back Ultra Wide Camera'), // duplicado de factor
    ])
    expect(lenses.map(l => l.factor)).toEqual([0.5, 1, 2])
    expect(lenses.map(l => l.id)).toEqual(['u', 'w', 't'])
  })

  it('excluye frontales y sin clasificar', () => {
    const lenses = listBackLenses([
      dev('u', 'Front Camera'),
      dev('u2', 'frontal'),
      dev('v', ''),
      dev('v2', 'camera2, facing back'),
    ])
    expect(lenses).toEqual([])
  })

  it('iPhone: una sola trasera → largo 1 (chips ocultos)', () => {
    const lenses = listBackLenses([
      dev('b', 'Back Camera'),
      dev('f', 'Front Camera'),
      dev('m', 'audio-in'),
    ])
    expect(lenses).toHaveLength(1)
  })

  it('labels vacíos (Firefox / in-app) → vacío', () => {
    expect(listBackLenses([dev('a', ''), dev('b', '')])).toEqual([])
    expect(listBackLenses([])).toEqual([])
  })
})

// ── zoomedCoverRect ──────────────────────────────────────────────

describe('zoomedCoverRect', () => {
  it('con zoom 1 es bit-idéntico al coverCrop 9:16', () => {
    expect(zoomedCoverRect(1280, 720, 1080, 1920, 1)).toEqual(coverCrop(1280, 720, 1080, 1920))
    expect(zoomedCoverRect(1080, 1440, 1080, 1920, 1)).toEqual(coverCrop(1080, 1440, 1080, 1920))
  })

  it('con zoom 2 recorta a la mitad del cover-rect, mismo centro', () => {
    const base = coverCrop(1280, 720, 1080, 1920)
    const z2 = zoomedCoverRect(1280, 720, 1080, 1920, 2)
    expect(z2.sw).toBeCloseTo(base.sw / 2)
    expect(z2.sh).toBeCloseTo(base.sh / 2)
    expect(z2.sx).toBeCloseTo(base.sx + base.sw / 4)
    expect(z2.sy).toBeCloseTo(base.sy + base.sh / 4)
  })

  it('el rect siempre vive dentro del frame (matriz de tamaños)', () => {
    const sizes: [number, number][] = [
      [1280, 720],
      [1920, 1080],
      [3840, 2160],
      [720, 1280],
      [1080, 1440], // 4:3 portrait (Safari)
      [1440, 1080],
      [640, 480],
    ]
    for (const [vw, vh] of sizes) {
      for (const zoom of [1, 1.5, 2, 4]) {
        const r = zoomedCoverRect(vw, vh, 1080, 1920, zoom)
        expect(r.sx).toBeGreaterThanOrEqual(0)
        expect(r.sy).toBeGreaterThanOrEqual(0)
        expect(r.sx + r.sw).toBeLessThanOrEqual(vw + 0.001)
        expect(r.sy + r.sh).toBeLessThanOrEqual(vh + 0.001)
        expect(r.sw / r.sh).toBeCloseTo(1080 / 1920, 2) // mantiene 9:16
      }
    }
  })

  it('clampa zoom > ZOOM_MAX', () => {
    expect(zoomedCoverRect(1280, 720, 1080, 1920, 99)).toEqual(zoomedCoverRect(1280, 720, 1080, 1920, ZOOM_MAX))
  })
})

// ── pinch / clamp / double-tap ───────────────────────────────────

describe('pinch', () => {
  it('pointerDistance es la hipotenusa', () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('el ratio de distancias multiplica el zoom actual', () => {
    expect(pinchToZoom(100, 150, 1)).toBe(1.5) // se abre → acerca
    expect(pinchToZoom(150, 100, 1.5)).toBe(1) // se cierra → aleja
    expect(pinchToZoom(100, 99, 2)).toBeCloseTo(2 * 0.99)
  })

  it('clampa en 1 y en max, y ignora dedos solapados', () => {
    expect(pinchToZoom(150, 40, 1)).toBe(1)
    expect(pinchToZoom(100, 900, 1)).toBe(ZOOM_MAX)
    expect(pinchToZoom(5, 50, 2)).toBe(2) // prev ≤8px: sin cambio
    expect(pinchToZoom(50, 5, 2)).toBe(2)
  })

  it('isDoubleTap respeta el gap', () => {
    expect(isDoubleTap(250, 0)).toBe(false)
    expect(isDoubleTap(1250, 1000)).toBe(true)
    expect(isDoubleTap(1250, 1000, 200)).toBe(false)
  })

  it('clampZoom limita 1..max', () => {
    expect(clampZoom(0.5)).toBe(1)
    expect(clampZoom(9)).toBe(ZOOM_MAX)
  })
})

// ── capabilities: zoom constraint + torch ────────────────────────

describe('readZoomRange / zoomMaxFromRange / map / uiZoom', () => {
  it('rango válido o null', () => {
    expect(readZoomRange({ zoom: { min: 1, max: 6 } })).toEqual({ min: 1, max: 6 })
    expect(readZoomRange({ zoom: { min: 100, max: 400 } })).toEqual({ min: 100, max: 400 })
    expect(readZoomRange(undefined)).toBeNull()
    expect(readZoomRange({ zoom: { min: 4, max: 4 } })).toBeNull() // rango degenerado
  })

  it('zoomMaxFromRange: factor puro vs porcentual, con techo', () => {
    expect(zoomMaxFromRange({ min: 1, max: 6 })).toBe(6)
    expect(zoomMaxFromRange({ min: 100, max: 400 })).toBe(4)
    expect(zoomMaxFromRange({ min: 1, max: 30 })).toBe(8)
  })

  it('mapUiZoomToConstraint: modo factor y modo porcentaje', () => {
    const factor: ZoomRange = { min: 1, max: 6 }
    expect(mapUiZoomToConstraint(2, factor)).toBe(2)
    expect(mapUiZoomToConstraint(1, factor)).toBe(1)
    const percent: ZoomRange = { min: 100, max: 400 }
    expect(mapUiZoomToConstraint(1, percent)).toBe(100)
    expect(mapUiZoomToConstraint(4, percent)).toBe(400)
    expect(mapUiZoomToConstraint(9, percent)).toBe(400) // clamp al max del rango
  })

  it('uiZoomFromSettings traduce el settings del track', () => {
    expect(uiZoomFromSettings(200, { min: 100, max: 400 })).toBe(2)
    expect(uiZoomFromSettings(2, { min: 1, max: 6 })).toBe(2)
    expect(uiZoomFromSettings(undefined, { min: 1, max: 6 })).toBeNull()
    expect(uiZoomFromSettings(5000, { min: 100, max: 400 })).toBe(4) // clamp
  })
})

// ── entorno: touch + storage ─────────────────────────────────────

function withGlobals(
  globals: {
    navigator?: unknown
    window?: unknown
  },
  run: () => void,
) {
  vi.stubGlobal('navigator', globals.navigator)
  vi.stubGlobal('window', globals.window)
  try {
    run()
  } finally {
    vi.unstubAllGlobals()
  }
}

describe('isTouchDevice', () => {
  it('true por maxTouchPoints o pointer coarse', () => {
    withGlobals({ navigator: { maxTouchPoints: 3 } }, () => {
      expect(isTouchDevice()).toBe(true)
    })
    const matchMedia = () => ({ matches: true })
    withGlobals(
      {
        navigator: { maxTouchPoints: 0 },
        window: { matchMedia },
      },
      () => {
        expect(isTouchDevice()).toBe(true)
      },
    )
  })

  it('false sin globals (SSR) ni touch', () => {
    expect(isTouchDevice()).toBe(false)
    withGlobals(
      {
        navigator: { maxTouchPoints: 0 },
        window: { matchMedia: () => ({ matches: false }) },
      },
      () => {
        expect(isTouchDevice()).toBe(false)
      },
    )
  })
})

describe('preferencias persistidas (try/catch)', () => {
  function fakeStore(initial: Record<string, string> = {}) {
    const map: Record<string, string> = { ...initial }
    return {
      getItem: (k: string) => (k in map ? map[k] : null),
      setItem: (k: string, v: string) => {
        map[k] = v
      },
      removeItem: (k: string) => {
        delete map[k]
      },
    }
  }

  it('guarda y lee calidad', () => {
    const win = { localStorage: fakeStore() }
    withGlobals({ window: win }, () => {
      expect(readStoredQuality()).toBe('hd')
      writeStoredQuality('uhd')
      expect(readStoredQuality()).toBe('uhd')
      expect(window.localStorage.getItem(FOTOINSPO_QUALITY_KEY)).toBe('uhd')
    })
  })

  it('guarda y borra lente', () => {
    const win = { localStorage: fakeStore() }
    withGlobals({ window: win }, () => {
      expect(readStoredLens()).toBeNull()
      writeStoredLens('dev-1')
      expect(readStoredLens()).toBe('dev-1')
      writeStoredLens(null)
      expect(readStoredLens()).toBeNull()
      expect(window.localStorage.getItem(FOTOINSPO_LENS_KEY)).toBeNull()
    })
  })

  it('SSR y storage bloqueado → defaults sin lanzar', () => {
    expect(readStoredQuality()).toBe('hd') // sin window
    withGlobals(
      {
        window: {
          localStorage: {
            getItem: () => {
              throw new Error('storage bloqueado')
            },
            setItem: () => {
              throw new Error('storage bloqueado')
            },
          },
        },
      },
      () => {
        expect(readStoredQuality()).toBe('hd')
        expect(() => writeStoredQuality('uhd')).not.toThrow()
        expect(readStoredLens()).toBeNull()
        expect(() => writeStoredLens('x')).not.toThrow()
      },
    )
  })
})

it('constantes del producto', () => {
  expect(PHOTO_JPEG_QUALITY).toBe(0.95)
})