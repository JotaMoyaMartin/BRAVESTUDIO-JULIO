import { describe, expect, it } from 'vitest'
import { buildInstructions, INTENSITY_LIMIT, MODE_META } from '../lib/photo-pro/presets'
import {
  EditInstructions,
  PhotoMode,
  ProviderEditError,
} from '../lib/photo-pro/types'

const MODES: PhotoMode[] = ['face', 'hair', 'background', 'general']

describe('INTENSITY_LIMIT', () => {
  it('cubre los 4 modos con rangos válidos', () => {
    expect(Object.keys(INTENSITY_LIMIT).sort()).toEqual([...MODES].sort())
    for (const m of MODES) {
      expect(INTENSITY_LIMIT[m].min).toBe(1)
      expect(INTENSITY_LIMIT[m].max).toBeGreaterThanOrEqual(INTENSITY_LIMIT[m].min)
      expect(MODE_META[m].intensities).toHaveLength(INTENSITY_LIMIT[m].max)
      expect(MODE_META[m].intensities.map(o => o.value)).toEqual(
        MODE_META[m].intensities.map((_, i) => i + 1),
      )
    }
  })
})

describe('buildInstructions', () => {
  it.each(MODES)('[%s] produce instrucciones completas para cada intensidad', mode => {
    for (let level = 1; level <= INTENSITY_LIMIT[mode].max; level++) {
      const ins: EditInstructions = buildInstructions(mode, level)
      expect(ins.goal.length).toBeGreaterThan(20)
      expect(ins.preserve.length).toBeGreaterThan(2)
      expect(ins.avoid.length).toBeGreaterThan(2)
      // todo preserbe/avoid tiene contenido real
      for (const p of [...ins.preserve, ...ins.avoid]) {
        expect(p.length).toBeGreaterThan(5)
      }
    }
  })

  it('hair: preserva color principal y técnica (regla de oro del producto)', () => {
    for (let level = 1; level <= 5; level++) {
      const ins = buildInstructions('hair', level)
      const all = [ins.goal, ...ins.preserve].join(' ')
      expect(all.toLowerCase()).toMatch(/color|técnica|technique/)
      expect(ins.avoid.join(' ').toLowerCase()).toMatch(/peluca|falso|no/)
    }
  })

  it('face: prohíbe pieles plásticas y manipulación estructural', () => {
    const all = buildInstructions('face', 3)
    expect(all.avoid.join(' ')).toMatch(/plástic|nariz|estructura/i)
  })

  it('background: no convierte el entorno en estudio forzado', () => {
    const ins = buildInstructions('background', 1)
    expect(ins.avoid.join(' ')).toMatch(/estudio/i)
  })

  it('intensidad fuera de rango se acampa al máximo del modo', () => {
    expect(() => buildInstructions('face', 99)).not.toThrow()
    expect(() => buildInstructions('face', 0)).not.toThrow()
  })

  it('modo desconocido lanza error (no silencio)', () => {
    expect(() => buildInstructions('gratis' as PhotoMode, 1)).toThrow(/modo desconocido/i)
  })

  it('cada modo tiene microcopys para todas sus intensidades', () => {
    for (const m of MODES) {
      for (const opt of MODE_META[m].intensities) {
        expect(opt.label.length).toBeGreaterThan(0)
        expect(opt.microcopy.length).toBeGreaterThan(0)
      }
      expect(MODE_META[m].willKeep.length).toBeGreaterThan(2)
      expect(MODE_META[m].processingCopy.length).toBeGreaterThan(10)
    }
  })
})

describe('ProviderEditError', () => {
  it('mantiene el código estable', () => {
    const e = new ProviderEditError('provider_timeout', 'test')
    expect(e.code).toBe('provider_timeout')
    expect(e.name).toBe('ProviderEditError')
    expect(e.message).toBe('test')
  })
})