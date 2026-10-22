// Tests de carruseles premium — SOLO helpers puros de lib/carruseles/prompts.ts
// (rotación, normalización, parseo de copy y prompt de slide). Sin API, sin
// storage, sin proveedor de imagen. Verificados contra el estilo real
// 'editorial-hair-luxe' (rotation lengths 2/3/4/5/6 en styles.ts).

import { describe, expect, it } from 'vitest'
import {
  buildSlidePrompt,
  ctaTextFor,
  DEMO_PROPOSAL,
  normalizeSlideVisuals,
  parseCopyProposal,
  rotationFor,
} from '@/lib/carruseles/prompts'
import { getStyle } from '@/lib/carruseles/styles'
import type { CopySlide, StyleConfig, VisualType } from '@/lib/carruseles/types'

const style = getStyle('editorial-hair-luxe')!

describe('rotationFor (rotación fotográfica anti-repetición)', () => {
  it('cuando la rotación del estilo cubre el total, devuelve la secuencia EXACTA', () => {
    // editorial-hair-luxe tiene una entry {length:4, [lifestyle, macro, hands, hero]}.
    expect(rotationFor(style, 4)).toEqual(['lifestyle', 'macro_detail', 'hands_process', 'hero_result'])
  })

  it('con una sola secuencia de 4 pedida para 6 → fallback del ciclo, sin repetir', () => {
    const soloCuatro: StyleConfig = {
      ...style,
      photoDirection: {
        types: style.photoDirection.types,
        rotation: [{ length: 4, sequence: ['lifestyle', 'macro_detail', 'hands_process', 'hero_result'] }],
      },
    }
    const seq = rotationFor(soloCuatro, 6)
    expect(seq).toHaveLength(6)
    expect(new Set(seq).size).toBe(6) // sin repetir
    expect(seq).toEqual(['lifestyle', 'macro_detail', 'hands_process', 'tools', 'extensions_material', 'product'])
  })

  it('total 7 con el estilo real: ninguna secuencia encaja → el fallback cicla sin crashear', () => {
    const seq = rotationFor(style, 7)
    expect(seq).toHaveLength(7)
    expect(new Set(seq).size).toBe(7) // el ciclo base (7 tipos) llena todo el carrusel único
  })
})

describe('normalizeSlideVisuals (recoloca inválidos y duplicados)', () => {
  it('un visual inválido se recoloca por la rotación del estilo', () => {
    const slides: CopySlide[] = [
      { n: 1, role: 'hook', text: 'uno', visual: 'perrito' as unknown as VisualType },
    ]
    const out = normalizeSlideVisuals(slides, style)
    expect(out[0].visual).toBe('lifestyle') // 1er encadre de la rotación
  })

  it('duplicados se recolocan SIN repetir (segunda lifestyle → hero_result)', () => {
    const slides: CopySlide[] = [
      { n: 1, role: 'hook', text: 'uno', visual: 'lifestyle' },
      { n: 2, role: 'desarrollo', text: 'dos', visual: 'lifestyle' },
    ]
    const out = normalizeSlideVisuals(slides, style)
    expect(new Set(out.map(s => s.visual)).size).toBe(2)
    expect(out[0].visual).toBe('lifestyle')
    expect(out[1].visual).toBe('hero_result') // rotación length-2: [lifestyle, hero_result]
  })
})

describe('parseCopyProposal (JSON con fences y saneo de la propuesta)', () => {
  it('(a) acepta JSON cercado en ```json con prosa alrededor', () => {
    const json = JSON.stringify({
      slides: [
        { n: 1, role: 'hook', text: 'Más claro no siempre significa más bonito.', support: 'luz vs color', visual: 'lifestyle' },
        { n: 2, role: 'desarrollo', text: 'AQUÍ ESTÁ LA DIFERENCIA.', visual: 'macro_detail' },
        { n: 3, role: 'cta', text: 'Reserva tu valoración.', visual: 'hero_result' },
      ],
      cta: 'Reserva tu valoración.',
      caption: 'Pie editorial de la publicación.',
    })
    const raw = `Claro, aquí tienes la propuesta:\n\n\`\`\`json\n${json}\n\`\`\`\n\nUn saludo.`
    const out = parseCopyProposal(raw, style, 'auto')
    expect(out.slides.map(s => s.text)).toEqual([
      'Más claro no siempre significa más bonito.',
      'AQUÍ ESTÁ LA DIFERENCIA.',
      'Reserva tu valoración.',
    ])
  })

  it('(b) visual inválido y roles vacíos se normalizan (primer hook, última cta + hero)', () => {
    const raw = JSON.stringify({
      slides: [
        { n: 1, text: 'primero', visual: 'perrito' }, // visual basura → recolocado
        { n: 2, text: 'medio' }, // sin role ni visual → desarrollo + lifestyle
        { n: 3, text: 'último', visual: 'before_after' },
      ],
    })
    const out = parseCopyProposal(raw, style, 'auto')
    expect(out.slides.map(s => s.role)).toEqual(['hook', 'desarrollo', 'cta'])
    expect(out.slides[0].visual).toBe('lifestyle')
    expect(out.slides[1].visual).toBe('macro_detail') // lifestyle repetido → rotación length-3
    expect(out.slides[2].visual).toBe('hero_result') // la última SIEMPRE lleva el hero
    expect(new Set(out.slides.map(s => s.visual)).size).toBe(3)
  })

  it('(c) recorta slides cuando slideCount numérico es menor que lo propuesto', () => {
    const raw = JSON.stringify({
      slides: [
        { n: 1, text: 'uno', visual: 'lifestyle' },
        { n: 2, text: 'dos', visual: 'macro_detail' },
        { n: 3, text: 'tres', visual: 'hands_process' },
        { n: 4, text: 'cuatro', visual: 'tools' },
        { n: 5, text: 'cinco', visual: 'hero_result' },
      ],
    })
    const out = parseCopyProposal(raw, style, 3)
    expect(out.slides).toHaveLength(3)
    expect(out.slides.map(s => s.text)).toEqual(['uno', 'dos', 'tres'])
    expect(out.slides[0].role).toBe('hook')
    expect(out.slides[2].role).toBe('cta')
  })

  it('(d) si tras filtrar textos vacíos no queda NINGUNA slide → copy_parse_failed', () => {
    const vacios = JSON.stringify({ slides: [{ n: 1, text: '   ' }, { n: 2, text: '' }] })
    expect(() => parseCopyProposal(vacios, style, 'auto')).toThrow('copy_parse_failed')
    expect(() => parseCopyProposal('esto no es json', style, 'auto')).toThrow('copy_parse_failed')
    expect(() => parseCopyProposal(JSON.stringify({ slides: [] }), style, 'auto')).toThrow('copy_parse_failed')
  })

  it('(e) caption y cta son strings saneados (vacíos → "" y undefined)', () => {
    const out = parseCopyProposal(
      JSON.stringify({
        slides: [{ n: 1, text: 'solo' }],
        cta: 'Escríbenos.',
        caption: 'Caption de pie.',
      }),
      style,
      'auto',
    )
    expect(out.cta).toBe('Escríbenos.')
    expect(out.caption).toBe('Caption de pie.')

    const sinDecoracion = parseCopyProposal(
      JSON.stringify({ slides: [{ n: 1, text: 'solo' }] }),
      style,
      'auto',
    )
    expect(sinDecoracion.cta).toBe('')
    expect(sinDecoracion.caption).toBeUndefined()
  })
})

describe('buildSlidePrompt (prompt de imagen de UNA slide)', () => {
  it('incluye el STYLE SYSTEM completo del estilo', () => {
    const p = buildSlidePrompt({
      style,
      slide: { text: 'un texto', visual: 'lifestyle' },
      index: 0,
      total: 5,
    })
    expect(p).toContain(style.imagePromptBase)
  })

  // Carrusel 2.0 (21-oct-2026): la IA genera SOLO la foto; el texto va en capas
  // HTML editables. El texto de la slide entra como contexto, nunca para pintarlo.
  it('pide una foto SIN texto y usa el texto de la slide solo como contexto', () => {
    const plain = buildSlidePrompt({
      style,
      slide: { text: 'Más claro no siempre significa más bonito.', visual: 'lifestyle' },
      index: 0,
      total: 5,
    })
    expect(plain).toContain('Más claro no siempre significa más bonito.')
    expect(plain).toContain('never write it in the image')
    expect(plain).toContain('Absolutely NO text')
    expect(plain).not.toContain('EXACT TEXT TO RENDER')

    const marked = buildSlidePrompt({
      style,
      slide: { text: 'NO ES SOLO **longitud.**', visual: 'lifestyle' },
      index: 1,
      total: 5,
    })
    expect(marked).not.toContain('**longitud')
  })

  it('la firma ya no se dibuja en la imagen (va en la capa de texto)', () => {
    const p = buildSlidePrompt({
      style,
      slide: { text: 'un texto', visual: 'lifestyle' },
      index: 0,
      total: 5,
      signature: { on: true, text: '@mi\nsalon <b>' },
    })
    expect(p).not.toContain('SIGNATURE')
    expect(p).not.toContain('<b>')
  })

  it('nunca contiene la palabra "undefined" (con y sin signature/soporte)', () => {
    const completo = buildSlidePrompt({
      style,
      slide: { text: 'TEXTO CLARO', support: 'puntas · cuerpo', visual: 'macro_detail' },
      index: 2,
      total: 5,
      signature: { on: false, text: '' },
      ctaLine: null,
      omitCta: true,
    })
    expect(completo).toContain('TEXTO CLARO')
    expect(completo).toContain('puntas · cuerpo')
    expect(completo).not.toContain('undefined')

    const minimal = buildSlidePrompt({
      style,
      slide: { text: 'otro', visual: 'tools' },
      index: 0,
      total: 1,
    })
    expect(minimal).not.toContain('undefined')
  })
})

describe('ctaTextFor (CTA por modo)', () => {
  it('comenta_palabra integra la PALABRA en el CTA', () => {
    expect(ctaTextFor('comenta_palabra', 'DULCE')).toContain('DULCE')
  })

  it('sin_cta devuelve cadena vacía', () => {
    expect(ctaTextFor('sin_cta')).toBe('')
  })
})

describe('DEMO_PROPOSAL (propuesta demo honesta, sin IA)', () => {
  it('5 slides, sin visual repetido, hook primero y cta al final', () => {
    expect(DEMO_PROPOSAL.slides).toHaveLength(5)
    expect(new Set(DEMO_PROPOSAL.slides.map(s => s.visual)).size).toBe(5)
    expect(DEMO_PROPOSAL.slides[0].role).toBe('hook')
    expect(DEMO_PROPOSAL.slides[DEMO_PROPOSAL.slides.length - 1].role).toBe('cta')
    expect(DEMO_PROPOSAL.cta.length).toBeGreaterThan(0)
  })
})