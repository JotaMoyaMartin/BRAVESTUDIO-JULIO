// Helpers puros del renderer de carruseles: ajuste de texto y selección de layout.
// Testables sin canvas (la medida se inyecta) — patrón lib/home-today.ts.

import { CarouselFamily, SlideLayout } from './types'

export type Measure = (text: string, size: number, weight: number) => number

/** Divide en líneas usando la medida real; respeta saltos de línea del autor. */
export function wrapText(text: string, maxWidth: number, size: number, weight: number, measure: Measure): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (measure(candidate, size, weight) <= maxWidth || !current) {
        current = candidate
      } else {
        lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

/** Altura del bloque de texto envuelto. */
export function measureBlockHeight(text: string, maxWidth: number, size: number, weight: number, lineHeight: number, measure: Measure): number {
  return wrapText(text, maxWidth, size, weight, measure).length * size * lineHeight
}

/** Mayor tamaño de fuente (por pasos de 2px) con el que el bloque cabe en maxH. */
export function fitFontSize(opts: {
  text: string
  maxW: number
  maxH: number
  lineHeight: number
  startSize: number
  minSize: number
  weight: number
  measure: Measure
}): number {
  for (let size = opts.startSize; size >= opts.minSize; size -= 2) {
    const h = measureBlockHeight(opts.text, opts.maxW, size, opts.weight, opts.lineHeight, opts.measure)
    if (h <= opts.maxH) return size
  }
  return opts.minSize
}

/**
 * Layout automático por slide — la usuaria NUNCA elige layout slide a slide.
 * Determinista: portada → primera; CTA → última; foto disponible → layout con foto;
 * texto con saltos → lista.
 */
export function pickLayout(
  index0: number,
  total: number,
  opts: { family: CarouselFamily; hasPhoto: boolean; text: string },
): SlideLayout {
  const isFirst = index0 === 0
  const isLast = index0 === total - 1
  if (isFirst) return opts.hasPhoto ? 'cover-photo' : 'cover'
  if (isLast) return 'cta'
  if (opts.hasPhoto) return 'text-photo'
  if (opts.text.includes('\n')) return 'list'
  return 'text'
}

/** Den guard al contenido: una idea principal por slide, lectura móvil. */
export const MAX_SLIDE_CHARS = 240

/** Extrae los "bloques" de una lista (líneas no vacías). */
export function listItems(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim().replace(/^[-•·*]\s*/, ''))
    .filter(Boolean)
}