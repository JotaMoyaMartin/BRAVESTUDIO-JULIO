import { describe, it, expect } from 'vitest'
import { wrapText, fitFontSize, measureBlockHeight, pickLayout, listItems, MAX_SLIDE_CHARS } from '@/lib/carousel/text'
import { longestLine } from '@/lib/carousel/render'
import { CAROUSEL_FAMILIES, getFamily, brandMarkText } from '@/lib/carousel/templates'
import { exportFileName } from '@/lib/carousel/render'

// Medida sintética: cada carácter mide `size * 0.5` px (determinista).
const measure = (text: string, size: number) => text.length * size * 0.5

describe('wrapText', () => {
  it('respeta saltos de línea del autor', () => {
    const lines = wrapText('primera\nsegunda', 1000, 40, 600, measure)
    expect(lines).toEqual(['primera', 'segunda'])
  })

  it('envuelve palabras que no caben en el ancho', () => {
    // "hola mundo" a 40px mide 200px con la medida sintética (10 chars × 20px)
    const lines = wrapText('hola mundo', 150, 40, 600, measure)
    expect(lines.length).toBe(2)
    expect(lines[0]).toBe('hola')
    expect(lines[1]).toBe('mundo')
  })

  it('no rompe una palabra que excede el ancho por sí sola', () => {
    const lines = wrapText('supercalifragilisticoespialidoso', 100, 40, 600, measure)
    expect(lines).toEqual(['supercalifragilisticoespialidoso'])
  })

  it('colapsa líneas vacías a strings vacíos', () => {
    const lines = wrapText('a\n\nb', 1000, 40, 600, measure)
    expect(lines).toEqual(['a', '', 'b'])
  })
})

describe('fitFontSize', () => {
  it('devuelve startSize si el texto cabe de fábrica', () => {
    const size = fitFontSize({ text: 'Hola', maxW: 800, maxH: 600, lineHeight: 1.2, startSize: 72, minSize: 36, weight: 600, measure })
    expect(size).toBe(72)
  })

  it('reduce el tamaño hasta que el bloque cabe en maxH', () => {
    const long = 'palabra '.repeat(20).trim() // texto largo
    const size = fitFontSize({ text: long, maxW: 800, maxH: 200, lineHeight: 1.3, startSize: 72, minSize: 36, weight: 600, measure })
    expect(size).toBeLessThan(72)
    expect(size).toBeGreaterThanOrEqual(36)
    const h = measureBlockHeight(long, 800, size, 600, 1.3, measure)
    expect(h).toBeLessThanOrEqual(200)
  })

  it('nunca baja de minSize aunque el texto sea interminable', () => {
    const huge = 'texto '.repeat(2000)
    const size = fitFontSize({ text: huge, maxW: 400, maxH: 100, lineHeight: 1.2, startSize: 72, minSize: 30, weight: 600, measure })
    expect(size).toBe(30)
  })
})

describe('pickLayout', () => {
  const total5 = 5
  it('primera slide sin foto → cover, con foto → cover-photo', () => {
    expect(pickLayout(0, total5, { family: 'minimal', hasPhoto: false, text: 'hola' })).toBe('cover')
    expect(pickLayout(0, total5, { family: 'beauty', hasPhoto: true, text: 'hola' })).toBe('cover-photo')
  })

  it('última slide → cta aunque haya foto', () => {
    expect(pickLayout(4, total5, { family: 'bold', hasPhoto: true, text: 'hola' })).toBe('cta')
  })

  it('slide medio con foto → text-photo', () => {
    expect(pickLayout(2, total5, { family: 'minimal', hasPhoto: true, text: 'hola' })).toBe('text-photo')
  })

  it('texto con saltos → list', () => {
    expect(pickLayout(1, total5, { family: 'minimal', hasPhoto: false, text: 'a\nb\nc' })).toBe('list')
  })

  it('texto plano → text', () => {
    expect(pickLayout(1, total5, { family: 'minimal', hasPhoto: false, text: 'sin saltos' })).toBe('text')
  })
})

describe('listItems', () => {
  it('extrae líneas no vacías y quita viñetas', () => {
    expect(listItems('- punto uno\n• punto dos\n· punto tres\n\npunto cuatro')).toEqual([
      'punto uno',
      'punto dos',
      'punto tres',
      'punto cuatro',
    ])
  })
})

describe('longestLine', () => {
  it('devuelve la línea más larga', () => {
    expect(longestLine('corta\nla más larga de todas\nmedia')).toBe('la más larga de todas')
    expect(longestLine('solo')).toBe('solo')
  })
})

describe('MAX_SLIDE_CHARS', () => {
  it('limita la densidad para lectura móvil', () => {
    expect(MAX_SLIDE_CHARS).toBeLessThanOrEqual(280)
  })
})

describe('CAROUSEL_FAMILIES', () => {
  it('define 3 familias base (2 paletas c/u) + Editorial (1 paleta, diseño papel)', () => {
    expect(CAROUSEL_FAMILIES.map(f => f.id)).toEqual(['minimal', 'beauty', 'bold', 'editorial'])
    for (const f of CAROUSEL_FAMILIES) {
      const min = f.id === 'editorial' ? 1 : 2
      expect(f.palettes.length).toBeGreaterThanOrEqual(min)
      for (const p of f.palettes) {
        expect(p.bg).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(p.ink).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(p.accent).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    }
  })

  it('getFamily resuelve por id y cae a minimal', () => {
    expect(getFamily('bold').name).toBe('Bold')
    expect(getFamily('minimal').name).toBe('Minimal')
    // familia inválida → primera familia (no rompe el render)
    expect(getFamily('desconocida' as 'minimal').id).toBe('minimal')
  })

  it('brandMarkText usa el salón o cae a BRÄVE', () => {
    expect(brandMarkText('Salón Ana')).toBe('Salón Ana')
    expect(brandMarkText(null)).toBe('BRÄVE')
    expect(brandMarkText('   ')).toBe('BRÄVE')
  })
})

describe('exportFileName', () => {
  const fn = (i: number, total: number) => exportFileName(i, total)
  it('nombra portada/slide/final en orden', () => {
    expect(fn(0, 5)).toBe('01-portada.jpg')
    expect(fn(2, 5)).toBe('03-slide.jpg')
    expect(fn(4, 5)).toBe('05-final.jpg')
    expect(fn(0, 3)).toBe('01-portada.jpg')
    expect(fn(2, 3)).toBe('03-final.jpg')
  })

  it('un solo slide es portada y final a la vez → portada gana', () => {
    expect(fn(0, 1)).toBe('01-portada.jpg')
  })
})