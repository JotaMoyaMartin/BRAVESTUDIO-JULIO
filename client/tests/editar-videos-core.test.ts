import { describe, it, expect } from 'vitest'
import {
  groupPhrases, markRepeats, markFillers, detectGaps, buildKeeps, buildOutWords,
  mapOutToSrc, mapSrcToOut, complementKeeps, drawtextEscape, buildExportGraph,
  computeRmsTrack, rmsAt, snapGapsToSilence,
  type EvWord, type EvPhrase,
} from '@/lib/editar-videos/core'

const W = (text: string, start: number, end: number): EvWord => ({ text, start, end })

const words = (pairs: [string, number, number][]): EvWord[] => pairs.map(([t, s, e]) => W(t, s, e))

describe('groupPhrases', () => {
  it('separa por puntuación de fin de frase', () => {
    const ps = groupPhrases(words([
      ['Hola', 0, 0.3], ['mundo.', 0.3, 0.7],
      ['Segunda', 1.0, 1.3], ['frase.', 1.3, 1.6],
    ]))
    expect(ps).toHaveLength(2)
    expect(ps[0].text).toBe('Hola mundo.')
    expect(ps[1].start).toBe(1.0)
  })

  it('separa por hueco largo (> 0.6s) aunque no haya puntuación', () => {
    const ps = groupPhrases(words([
      ['uno', 0, 0.2], ['dos', 1.2, 1.4],
    ]))
    expect(ps).toHaveLength(2)
  })

  it('split por longitud: máximo 16 palabras', () => {
    const pairs: [string, number, number][] = []
    for (let i = 0; i < 40; i++) pairs.push([`p${i}`, i * 0.2, i * 0.2 + 0.1])
    const ps = groupPhrases(words(pairs))
    const sizes = ps.map(p => p.words.length)
    expect(Math.max(...sizes)).toBeLessThanOrEqual(16)
    expect(ps).toHaveLength(3) // 16 + 16 + 8
  })
})

describe('markRepeats', () => {
  it('marca la ocurrencia POSTERIOR de una frase repetida', () => {
    const base: EvWord[] = words([
      ['Esto', 0, 0.2], ['es', 0.2, 0.4], ['genial.', 0.4, 0.8],
      ['Esto', 2.0, 2.2], ['es', 2.2, 2.4], ['genial.', 2.4, 2.8],
    ])
    const ps = markRepeats(groupPhrases(base))
    expect(ps[0].tags).toEqual([])
    expect(ps[1].tags).toContain('repetido')
    expect(ps[1].dupOf).toBe(ps[0].id)
  })

  it('frases cortas (<3 tokens) no compiten', () => {
    const base: EvWord[] = words([
      ['Sí.', 0, 0.2],
      ['Sí.', 2.0, 2.2],
    ])
    const ps = markRepeats(groupPhrases(base))
    expect(ps[1].tags).toEqual([])
  })
})

describe('detectGaps', () => {
  it('detecta silencio entre frases y aire inicial/final', () => {
    const ps: EvPhrase[] = [
      { id: 'a', words: [], text: 'a', start: 1.4, end: 2.0, cut: false, tags: [] },
      { id: 'b', words: [], text: 'b', start: 3.2, end: 4.0, cut: false, tags: [] },
    ]
    const gaps = detectGaps(ps, 7.5)
    // aire inicial 0→1.4
    expect(gaps[0]).toMatchObject({ start: 0, end: 1.4 })
    // interior: 2.0+0.06 → 3.2-0.06
    expect(gaps[1]).toMatchObject({ start: 2.06, end: 3.14 })
    // final: 4.06 → 7.5
    expect(gaps[2]).toMatchObject({ start: 4.06, end: 7.5 })
    expect(gaps.every(g => g.cut)).toBe(true)
  })

  it('hueco pequeño no se marca', () => {
    const ps: EvPhrase[] = [
      { id: 'a', words: [], text: 'a', start: 0, end: 1, cut: false, tags: [] },
      { id: 'b', words: [], text: 'b', start: 1.2, end: 2, cut: false, tags: [] },
    ]
    expect(detectGaps(ps, 2)).toHaveLength(0)
  })
})

describe('buildKeeps', () => {
  it('resta frases y gaps cortados, fusionando spans', () => {
    const ps: EvPhrase[] = [
      { id: 'a', words: [], text: 'a', start: 0, end: 1, cut: false, tags: [] },
      { id: 'b', words: [], text: 'b', start: 1.5, end: 2.5, cut: true, tags: [] },
      { id: 'c', words: [], text: 'c', start: 3.3, end: 4.3, cut: false, tags: [] },
    ]
    const gaps = detectGaps(ps, 5)
    const keeps = buildKeeps(ps, gaps, 5)
    // mantiene 0→1.5 (frase a); el corte de b se fusiona con el gap b→c; fuera también el aire final
    expect(keeps).toHaveLength(2)
    expect(keeps[0]).toEqual({ start: 0, end: 1.5 })
    expect(keeps[1].start).toBeCloseTo(3.24)
    expect(keeps[1].end).toBeCloseTo(4.36)
  })
})

describe('buildOutWords', () => {
  it('mapea tiempos de salida restando lo eliminado antes', () => {
    const ps: EvPhrase[] = [
      { id: 'a', words: words([['hola', 0, 0.5]]), text: 'hola', start: 0, end: 0.5, cut: false, tags: [] },
      { id: 'b', words: words([['xxx', 0.6, 1.2]]), text: 'xxx', start: 0.6, end: 1.2, cut: true, tags: [] },
      { id: 'c', words: words([['fin', 1.3, 1.8]]), text: 'fin', start: 1.3, end: 1.8, cut: false, tags: [] },
    ]
    const keeps = buildKeeps(ps, [], 2)
    const out = buildOutWords(ps, keeps)
    const fin = out.find(o => o.text === 'fin')
    expect(fin).toBeDefined()
    // 'fin' empieza en 1.3 pero lo cortado antes (0.6→1.2 + gap) lo adelanta
    expect(fin!.outStart).toBeLessThan(1.3)
    expect(fin!.outEnd).toBeGreaterThan(0)
  })
})

describe('mapOutToSrc', () => {
  it('recorre los keeps y clampa en cortes', () => {
    const keeps = [{ start: 10, end: 12 }, { start: 20, end: 23 }]
    expect(mapOutToSrc(keeps, 0)).toBe(10)
    expect(mapOutToSrc(keeps, 1.5)).toBe(11.5)
    expect(mapOutToSrc(keeps, 2.5)).toBe(20.5) // 2s de keep1 + 0.5 en keep2
    expect(mapOutToSrc(keeps, 99)).toBe(23)
  })
})

describe('mapSrcToOut', () => {
  it('inverso de mapOutToSrc: recorre keeps, clampa en cortes', () => {
    const keeps = [{ start: 10, end: 12 }, { start: 20, end: 23 }]
    expect(mapSrcToOut(keeps, 10)).toBe(0)
    expect(mapSrcToOut(keeps, 11.5)).toBe(1.5)
    expect(mapSrcToOut(keeps, 20.5)).toBe(2.5)
    expect(mapSrcToOut(keeps, 15)).toBe(2) // dentro del corte → final del keep 1
    expect(mapSrcToOut(keeps, 100)).toBe(5)
  })
})

describe('complementKeeps', () => {
  it('devuelve los cortes como complemento de los keeps', () => {
    const keeps = [{ start: 2, end: 5 }, { start: 8, end: 10 }]
    const cuts = complementKeeps(keeps, 12)
    expect(cuts).toEqual([{ start: 0, end: 2 }, { start: 5, end: 8 }, { start: 10, end: 12 }])
  })
})

describe('markFillers + cortes a nivel palabra', () => {
  it('marca palabras de relleno', () => {
    const ps = groupPhrases(words([
      ['Eh,', 0, 0.3], ['hola', 0.4, 0.7], ['mundo.', 0.7, 1.0],
      ['mmm', 1.2, 1.6],
    ]))
    const marked = markFillers(ps)
    expect(marked[0].words[0].filler).toBe(true)
    expect(marked[0].words[1].filler).toBeUndefined()
  })

  it('buildKeeps respeta wordCuts', () => {
    const ps: EvPhrase[] = [
      { id: 'a', words: [], text: 'a larga que se conserva', start: 0, end: 2, cut: false, tags: [] },
    ]
    const keeps = buildKeeps(ps, [], 4, [{ start: 0.9, end: 1.1 }])
    expect(keeps).toHaveLength(2)
    expect(keeps[0].start).toBe(0)
    expect(keeps[0].end).toBeCloseTo(0.9)
    expect(keeps[1].start).toBeCloseTo(1.1)
  })

  it('buildOutWords conserva el caption de la muletilla en la unión si hay aire', () => {
    const phrase: EvPhrase = {
      id: 'a',
      words: [
        W('esto', 0, 0.5),
        W('eh,', 1.0, 1.3),
        W('fin', 1.9, 2.4),
      ],
      text: 'esto eh, fin', start: 0, end: 2.4, cut: false, tags: [],
    }
    const wordCuts = [{ start: 0.97, end: 1.33 }]
    const keeps = buildKeeps([phrase], [], 4, wordCuts)
    const ow = buildOutWords([phrase], keeps, wordCuts)
    const esto = ow.find(o => o.text === 'esto')
    const eh = ow.find(o => o.text === 'eh,')
    const fin = ow.find(o => o.text === 'fin')
    expect(esto!.outStart).toBe(0)
    // 'eh' se corta de la voz pero queda como caption en la unión (salida 0.97)
    expect(eh).toBeDefined()
    expect(Math.abs(eh!.outStart - 0.97)).toBeLessThanOrEqual(0.1)
    // 'fin' sale adelantado por lo cortado
    expect(fin!.outStart).toBeLessThan(1.9)
  })

  it('el caption de muletilla se descarta si la siguiente palabra pisa la unión', () => {
    const phrase: EvPhrase = {
      id: 'a',
      words: [
        W('uno', 0, 0.5),
        W('eh', 0.6, 0.9),
        W('dos', 1.0, 1.5),
      ],
      text: 'uno eh dos', start: 0, end: 1.5, cut: false, tags: [],
    }
    const wordCuts = [{ start: 0.57, end: 0.93 }]
    const keeps = buildKeeps([phrase], [], 3, wordCuts)
    const ow = buildOutWords([phrase], keeps, wordCuts)
    expect(ow.find(o => o.text === 'eh')).toBeUndefined()
    expect(ow.map(o => o.text)).toEqual(['uno', 'dos'])
  })
})

describe('drawtextEscape', () => {
  it('escapa caracteres peligrosos del filtro', () => {
    const out = drawtextEscape("a'b:c%d,e\\f")
    for (const ch of ["'", ':', '%', ',', '\\\\']) {
      expect(out.includes(ch)).toBe(true)
    }
  })
})

describe('buildExportGraph', () => {
  const keeps = [{ start: 0, end: 2 }, { start: 2.5, end: 4 }]
  const captions = { enabled: true, sizeRatio: 0.054, yRatio: 0.65, color: 'white' }
  const fonts = { medium: 'font-medium.ttf', bold: 'font-bold.ttf' }

  it('encadena cortes + concat + captions', () => {
    const outWords = [
      { text: 'hola', start: 0, end: 0.5, outStart: 0, outEnd: 0.5 },
      { text: 'fin', start: 2.6, end: 3.0, outStart: 2.1, outEnd: 2.5 },
    ]
    const g = buildExportGraph({
      keeps, duration: 4, videoW: 1080, videoH: 1920, captions, outWords,
      resources: [], inputExt: 'mp4', fonts,
    })
    expect(g.filter).toContain('concat=n=2:v=1:a=1[outv][outa]')
    expect(g.filter).toContain('drawtext=fontfile=font-medium.ttf')
    expect(g.filter).toContain("enable='between(t,")
    expect(g.videoOut).toBe('cap') // captions aplicados, sin recursos
  })

  it('captions desactivadas → videoOut es outv directo', () => {
    const g = buildExportGraph({
      keeps, duration: 4, videoW: 1080, videoH: 1920,
      captions: { ...captions, enabled: false },
      outWords: [], resources: [], inputExt: 'mp4', fonts,
    })
    expect(g.videoOut).toBe('outv')
    expect(g.filter).not.toContain('drawtext')
  })

  it('recursos sticker y texto encadenan etiquetas y piden inputs', () => {
    const g = buildExportGraph({
      keeps, duration: 4, videoW: 1080, videoH: 1920,
      captions: { ...captions, enabled: false }, outWords: [],
      resources: [
        { id: 'r1', kind: 'sticker', label: 'st', showStart: 0.5, showEnd: 2, pngPath: 'x.png' },
        { id: 'r2', kind: 'text', label: 'tx', showStart: 1, showEnd: 3, text: 'HOLA' },
      ],
      inputExt: 'mp4', fonts,
    })
    expect(g.inputs).toEqual(['st0.png'])
    expect(g.filter).toContain("[1:v]scale=")
    expect(g.filter).toContain("drawtext=fontfile=font-bold.ttf")
    expect(g.filter).toContain('[rc1]')
    expect(g.videoOut).toBe('rc1')
  })

  it('clip pide input.${ext} y overlay', () => {
    const g = buildExportGraph({
      keeps, duration: 4, videoW: 1080, videoH: 1920,
      captions: { ...captions, enabled: false }, outWords: [],
      resources: [
        { id: 'r1', kind: 'clip', label: 'c', showStart: 1, showEnd: 2, src: { start: 10, end: 12 } },
      ],
      inputExt: 'mp4', fonts,
    })
    expect(g.inputs).toEqual(['input.mp4'])
    expect(g.filter).toContain('[1:v]trim=start=10.000')
    expect(g.filter).toContain('overlay')
    expect(g.videoOut).toBe('rc0')
  })
})

describe('computeRmsTrack', () => {
  it('ventanas de 20ms y RMS elevado en la parte hablada', () => {
    // 1 s a 1kHz de sample rate: silencio 0→0.5, voz 0.5→1.0
    const sr = 1000
    const pcm = new Float32Array(sr)
    for (let i = Math.floor(sr * 0.5); i < sr; i++) pcm[i] = 0.5
    const track = computeRmsTrack(pcm, sr)
    expect(track.step).toBeCloseTo(0.02, 5)
    expect(track.values.length).toBe(50)
    expect(rmsAt(track, 0.25)).toBe(0)
    expect(rmsAt(track, 0.75)).toBeCloseTo(0.5)
  })
})

describe('snapGapsToSilence', () => {
  it('mueve los bordes del hueco hacia el valle de silencio', () => {
    // RMS bajo en 2.3→2.7 (indices 115..135), voz fuera — 200 ventanas cubren 0→3.98 s
    const track: ReturnType<typeof computeRmsTrack> = { step: 0.02, values: new Float32Array(200) }
    for (let i = 0; i < 200; i++) {
      const t = i * 0.02
      track.values[i] = t >= 2.3 && t <= 2.7 ? 0.01 : 0.8
    }
    const g = { start: 2.0, end: 3.0, cut: true }
    const [s] = snapGapsToSilence([g], track)
    expect(s.start).toBeGreaterThanOrEqual(2.29)
    expect(s.start).toBeLessThanOrEqual(2.32)
    expect(s.end).toBeLessThanOrEqual(2.72)
    expect(s.end).toBeGreaterThanOrEqual(2.68)
  })

  it('hueco imposible de ajustar se conserva', () => {
    const track = { step: 0.02, values: new Float32Array(10) }
    const g = { start: 0.05, end: 0.08, cut: true }
    expect(snapGapsToSilence([g], track)).toEqual([g])
  })
})