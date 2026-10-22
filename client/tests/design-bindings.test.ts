// Tests del saneo de la calibración de Diseños (lib/integrations/canva/sanitize.ts):
// zoneStyle de las bindings, paths de assets de plantilla y aspecto.
// Regla: la allowlist es estricta — lo inválido se descarta, nunca crash.

import { describe, expect, it } from 'vitest'
import {
  asAspectValue,
  asTemplateAssetPathList,
  asZoneStyle,
  isTemplateAssetPath,
  templateAssetPage,
} from '@/lib/integrations/canva/sanitize'

describe('asZoneStyle (allowlist del estilo de zona)', () => {
  it('conserva todas las claves válidas (forma de la plantilla demo)', () => {
    const style = asZoneStyle({
      fontFamily: 'var(--font-dmserif), "Georgia", serif',
      fontSize: '3.7cqw',
      color: '#f5f5ef',
      bg: 'transparent',
      fontWeight: '400',
      fontStyle: 'italic',
      textAlign: 'center',
      letterSpacing: '1px',
      lineHeight: 1.2,
    })
    expect(style).toEqual({
      fontFamily: 'var(--font-dmserif), "Georgia", serif',
      fontSize: '3.7cqw',
      color: '#f5f5ef',
      bg: 'transparent',
      fontWeight: '400',
      fontStyle: 'italic',
      textAlign: 'center',
      letterSpacing: '1px',
      lineHeight: 1.2,
    })
  })

  it('descarta claves desconocidas (copia solo la allowlist)', () => {
    const style = asZoneStyle({
      color: '#ffffff',
      'background-image': 'url(https://evil.test/x.png)',
      position: 'absolute',
      z: 99,
    })
    expect(style).toEqual({ color: '#ffffff' })
  })

  it('descarta valores con formato incorrecto clave a clave', () => {
    const style = asZoneStyle({
      fontFamily: 'serif; background: url(x)',
      fontSize: '10px',       // no cqw
      color: 'url(evil)',     // no hex ni palabra CSS
      bg: '#ff00ff00ff',      // hex de longitud rara
      fontWeight: '900',      // fuera de 400-800
      fontStyle: 'oblique',
      textAlign: 'left',      // solo start/center/end
      letterSpacing: '-1px',  // spec: px positivo
      lineHeight: 5,          // > 3
      minHeight: '10px',
    })
    expect(style).toBeNull()
  })

  it('objeto vacío o inválido → null (el campo se omite)', () => {
    expect(asZoneStyle({})).toBeNull()
    expect(asZoneStyle(null)).toBeNull()
    expect(asZoneStyle('rojo')).toBeNull()
    expect(asZoneStyle(['400'])).toBeNull()
  })

  it('lineHeight no finito / borde → controlado', () => {
    expect(asZoneStyle({ lineHeight: 3 })?.lineHeight).toBe(3)
    expect(asZoneStyle({ lineHeight: 0 })).toBeNull()
    expect(asZoneStyle({ lineHeight: Number.NaN })).toBeNull()
  })
})

describe('paths de assets de plantilla (bucket design-exports)', () => {
  it('acepta los paths que produce el pipeline (preview/bare/photo)', () => {
    expect(isTemplateAssetPath('templates/DAF7yYQ7/bare-p1-abc.png')).toBe(true)
    expect(isTemplateAssetPath('templates/DAF7yYQ7/photo-p2-def.jpg')).toBe(true)
    expect(isTemplateAssetPath('templates/DAF7yYQ7/preview-abc.png')).toBe(true)
    expect(templateAssetPage('templates/DAF7yYQ7/bare-p12-abc.png')).toBe(12)
    expect(templateAssetPage('templates/DAF7yYQ7/preview-abc.png')).toBeNull()
  })

  it('rechaza otros buckets, traversal y basura', () => {
    expect(isTemplateAssetPath('design-uploads/u/x.png')).toBe(false)
    expect(isTemplateAssetPath('templates/DAF7yYQ7/../../secreto.png')).toBe(false)
    expect(isTemplateAssetPath('templates/DAF7yYQ7/x.png.txt')).toBe(false)
    expect(isTemplateAssetPath(null)).toBe(false)
    expect(isTemplateAssetPath('templates/DAF7yYQ7/')).toBe(false)
  })
})

describe('asTemplateAssetPathList (source.bg_paths posicional)', () => {
  it('acepta array posicional con huecos vacíos', () => {
    const paths = asTemplateAssetPathList(['templates/DAF/bare-p1-a.png', '', 'templates/DAF/bare-p3-b.png'])
    expect(paths).toEqual(['templates/DAF/bare-p1-a.png', '', 'templates/DAF/bare-p3-b.png'])
  })

  it('rechaza arrays con paths de otro bucket o no-arrays', () => {
    expect(asTemplateAssetPathList(['templates/DAF/bare-p1-a.png', 'u/otro/x.png'])).toBeNull()
    expect(asTemplateAssetPathList('templates/DAF/bare-p1-a.png')).toBeNull()
    expect(asTemplateAssetPathList([])).toBeNull()
    expect(asTemplateAssetPathList(new Array(61).fill('templates/DAF/bare-p1-a.png'))).toBeNull()
  })
})

describe('asAspectValue (normalización a "W / H")', () => {
  it('normaliza las tres formas de escribirlo', () => {
    expect(asAspectValue('4 / 5')).toBe('4 / 5')
    expect(asAspectValue('4:5')).toBe('4 / 5')
    expect(asAspectValue(' 9/16 ')).toBe('9 / 16')
    expect(asAspectValue('1 / 1')).toBe('1 / 1')
  })

  it('rechaza lo que no es un ratio de dos números enteros', () => {
    expect(asAspectValue('0 / 5')).toBeNull()
    expect(asAspectValue('4')).toBeNull()
    expect(asAspectValue('abc')).toBeNull()
    expect(asAspectValue('4 / 5 / 2')).toBeNull()
    expect(asAspectValue('')).toBeNull()
    expect(asAspectValue(1.4)).toBeNull()
  })
})