/**
 * Editar Videos — lógica pura (testeable sin navegador).
 * Fases: transcripción en palabras → frases → detección (repetidos/muletillas/
 * silencios) → timeline de cortes → plan de captions/recursos con tiempos de salida.
 */

export interface EvWord { text: string; start: number; end: number; filler?: boolean }
export interface EvPhrase {
  id: string
  words: EvWord[]
  text: string
  start: number
  end: number
  cut: boolean
  tags: string[]
  dupOf?: string
}
export interface EvGap { start: number; end: number; cut: boolean }
export interface EvSpan { start: number; end: number }

export const SENTENCE_END = /[.!?…。]+["»)]?$/
export const MAX_WORDS_PER_PHRASE = 16
export const GAP_PHRASE_SPLIT = 0.6
export const GAP_CUT_MIN = 0.45
export const GAP_PAD = 0.06 // aire que se deja a cada lado de un silencio
export const SHORT_PHRASE_WORDS = 2

/** Agrupa palabras en frases por puntuación, huecos largos o longitud. */
export function groupPhrases(words: EvWord[]): EvPhrase[] {
  const phrases: EvPhrase[] = []
  let cur: EvWord[] = []
  for (let i = 0; i < words.length; i++) {
    cur.push(words[i])
    const w = words[i]
    const next = words[i + 1]
    const gapEnd = next ? next.start - w.end : Infinity
    const endsSentence = SENTENCE_END.test(w.text)
    const longGap = next && gapEnd > GAP_PHRASE_SPLIT
    if (endsSentence || longGap || cur.length >= MAX_WORDS_PER_PHRASE) {
      phrases.push(makePhrase(cur))
      cur = []
    }
  }
  if (cur.length > 0) phrases.push(makePhrase(cur))
  return phrases
}

function makePhrase(words: EvWord[]): EvPhrase {
  return {
    id: `p${Math.round(words[0].start * 1000)}`,
    words,
    text: words.map(w => w.text).join(' '),
    start: words[0].start,
    end: words[words.length - 1].end,
    cut: false,
    tags: [],
  }
}

export function normalizeTokens(text: string): string[] {
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
  return clean.split(/\s+/).filter(Boolean)
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  return inter / (a.size + b.size - inter || 1)
}

/** Muletillas de voz (ES): se cortan a nivel de palabra, quedan en captions. */
const FILLERS = new Set(['eh', 'ehm', 'em', 'emmm', 'mmm', 'mm', 'um', 'uhm', 'uh', 'ehm...'])

/** Marca palabras muletilla (ev, 'eh,' → filler). */
export function markFillers(phrases: EvPhrase[]): EvPhrase[] {
  for (const p of phrases) {
    for (const w of p.words) {
      const tok = w.text.toLowerCase().replace(/[^a-zñ]/g, '')
      if (FILLERS.has(tok)) w.filler = true
    }
  }
  return phrases
}

/** Marca frases repetidas: la 2ª (posterior) sale marcada para cortar. */
export function markRepeats(phrases: EvPhrase[]): EvPhrase[] {
  const MIN_TOKENS = 3
  const THRESHOLD = 0.65
  const out = phrases.map(p => ({ ...p, tags: [...p.tags] }))
  const toks = out.map(p => {
    const t = normalizeTokens(p.text)
    return new Set(t.length >= MIN_TOKENS ? t : [])
  })
  for (let i = 0; i < out.length; i++) {
    if (toks[i].size < MIN_TOKENS) continue
    for (let j = 0; j < i; j++) {
      if (toks[j].size < MIN_TOKENS) continue
      // frases vecinas de menos de 3 tokens no compiten; también: igualdad casi total
      if (jaccard(toks[i], toks[j]) >= THRESHOLD) {
        out[i].tags.push('repetido')
        out[i].dupOf = out[j].id
        break
      }
    }
  }
  return out
}

/** Silencios entre frases por encima del mínimo (y aire inicial/final). */
export function detectGaps(phrases: EvPhrase[], duration: number, min = GAP_CUT_MIN): EvGap[] {
  const gaps: EvGap[] = []
  if (phrases.length === 0) return duration > min ? [{ start: 0, end: duration, cut: true }] : []
  const first = phrases[0]
  const last = phrases[phrases.length - 1]
  if (first.start > min) gaps.push({ start: 0, end: first.start, cut: true })
  for (let i = 0; i + 1 < phrases.length; i++) {
    const a = phrases[i]
    const b = phrases[i + 1]
    const s = a.end + GAP_PAD
    const e = b.start - GAP_PAD
    if (e - s >= min) gaps.push({ start: s, end: e, cut: true })
  }
  if (duration - (last.end + GAP_PAD) > min) gaps.push({ start: last.end + GAP_PAD, end: duration, cut: true })
  return gaps
}

/** Timeline final: keeps = duración menos lo marcado para cortar (fusionando spans). */
export function buildKeeps(phrases: EvPhrase[], gaps: EvGap[], duration: number, wordCuts: EvSpan[] = []): EvSpan[] {
  const cuts: EvSpan[] = []
  const add = (s: number, e: number) => {
    if (e - s <= 0.08) return
    const last = cuts[cuts.length - 1]
    if (last && s <= last.end) last.end = Math.max(last.end, e)
    else cuts.push({ start: s, end: e })
  }
  const byStart = [
    ...phrases.filter(p => p.cut).map(p => ({ start: p.start, end: p.end })),
    ...gaps.filter(g => g.cut),
    ...wordCuts,
  ].sort((a, b) => a.start - b.start)
  for (const c of byStart) add(c.start, c.end)
  const keeps: EvSpan[] = []
  let t = 0
  for (const c of cuts) {
    if (c.start - t >= 0.12) keeps.push({ start: t, end: c.start })
    t = Math.max(t, c.end)
  }
  if (duration - t >= 0.12) keeps.push({ start: t, end: duration })
  return keeps
}

/** Mapea la palabra a tiempo de SALIDA (resta lo cortado antes de ella). */
export interface OutWord extends EvWord { outStart: number; outEnd: number }

/** Tiempo de SALIDA → tiempo del video ORIGINAL (para la preview del paso Estilo). */
export function mapOutToSrc(keeps: EvSpan[], outT: number): number {
  let cursor = 0
  for (const k of keeps) {
    const len = k.end - k.start
    if (outT < cursor + len) return k.start + (outT - cursor)
    cursor += len
  }
  const last = keeps[keeps.length - 1]
  return last ? last.end : outT
}

/** Tiempo del ORIGINAL → tiempo de SALIDA (para el player en vivo; clampa en cortes). */
export function mapSrcToOut(keeps: EvSpan[], srcT: number): number {
  let cursor = 0
  for (const k of keeps) {
    if (srcT < k.end) {
      if (srcT >= k.start) return cursor + (srcT - k.start)
      return cursor // dentro de un corte: pegado al final de la salida
    }
    cursor += k.end - k.start
  }
  return cursor
}

/** Compáctate los cortes (complemento de los keeps) — útil para el player en vivo. */
export function complementKeeps(keeps: EvSpan[], duration: number): EvSpan[] {
  const cuts: EvSpan[] = []
  let t = 0
  for (const k of keeps) {
    if (k.start - t >= 0.05) cuts.push({ start: t, end: k.start })
    t = Math.max(t, k.end)
  }
  if (duration - t >= 0.05) cuts.push({ start: t, end: duration })
  return cuts
}

// ---- energía RMS (cortar donde la voz ya calló) ----

/** Pista de energía del audio: RMS por ventana de ~20ms. */
export interface RmsTrack { step: number; values: Float32Array }

export function computeRmsTrack(pcm: Float32Array, sampleRate: number): RmsTrack {
  const step = Math.max(1, Math.round(0.02 * sampleRate))
  const n = Math.floor(pcm.length / step)
  const values = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = i * step; j < (i + 1) * step; j++) sum += pcm[j] * pcm[j]
    values[i] = Math.sqrt(sum / step)
  }
  return { step: step / sampleRate, values }
}

export function rmsAt(track: RmsTrack, t: number): number {
  const i = Math.round(t / track.step)
  const clamped = Math.max(0, Math.min(track.values.length - 1, i))
  return track.values[clamped] ?? 0
}

function quietestIn(track: RmsTrack, a: number, b: number, rev = false): number {
  if (b <= a) return a
  let best = rev ? b : a
  let bestV = rmsAt(track, best)
  if (rev) {
    for (let u = b - 0.01; u >= a; u -= 0.01) {
      const v = rmsAt(track, u)
      if (v < bestV) { bestV = v; best = u }
    }
  } else {
    for (let u = a + 0.01; u <= b; u += 0.01) {
      const v = rmsAt(track, u)
      if (v < bestV) { bestV = v; best = u }
    }
  }
  return best
}

/** Adapta los bordes de un hueco al punto más silencioso cercano (±0.5 s): el
 * borde inicial engancha donde la voz de la frase anterior ya calló (ronda hacia
 * delante) y el final justo antes de que entre la siguiente (ronda hacia atrás).
 * Así no se corta a media sílaba ni se pierde el aire natural. */
export function snapGapsToSilence(gaps: EvGap[], track: RmsTrack): EvGap[] {
  return gaps.map(g => {
    const s = quietestIn(track, g.start, Math.min(g.end, g.start + 0.5))
    const e = quietestIn(track, Math.max(g.start, g.end - 0.5), g.end, true)
    if (e - s < 0.1) return g
    return { start: s, end: e, cut: g.cut }
  })
}

export function buildOutWords(phrases: EvPhrase[], keeps: EvSpan[], wordCuts: EvSpan[] = []): OutWord[] {
  const kept = phrases.filter(p => !p.cut)
  const out: OutWord[] = []
  const fillersCut: { word: EvWord; join: number }[] = []
  for (const p of kept) {
    for (const w of p.words) {
      const cutNow = wordCuts.some(c => w.start >= c.start - 0.09 && w.end <= c.end + 0.09)
      const k = cutNow
        ? undefined
        : keeps.find(k => w.start >= k.start - 0.09 && w.end <= k.end + 0.09)
      if (!k) {
        // palabra cortada por wordCuts (muletilla): conserva su caption en el punto de unión
        if (cutNow) {
          const idx = keeps.findIndex(k2 => k2.start >= w.end)
          const join = idx === -1 ? mapSrcToOut(keeps, w.end) : keeps.slice(0, idx).reduce((s, c) => s + c.end - c.start, 0)
          fillersCut.push({ word: w, join })
        }
        continue
      }
      const idx = keeps.indexOf(k)
      const keptBefore = keeps.slice(0, idx).reduce((s, c) => s + (c.end - c.start), 0)
      const removedBefore = k.start - keptBefore
      out.push({ ...w, outStart: w.start - removedBefore, outEnd: w.end - removedBefore })
    }
  }
  // solo si hay aire tras la unión (si la siguiente palabra pisa, se descarta)
  for (const f of fillersCut) {
    if (f.join < 0) continue
    const next = out.find(o => o.outStart >= f.join - 0.02 && o.outStart < f.join + 0.05 + 0.001) ||
      out.filter(o => o.outStart > f.join).sort((a, b) => a.outStart - b.outStart)[0]
    if (next && next.outStart < f.join + 0.34) continue
    out.push({ ...f.word, outStart: f.join, outEnd: f.join + 0.3 })
  }
  out.sort((a, b) => a.outStart - b.outStart)
  return out
}

/** Preset de captions BRAVE: palabra a palabra, minusculas, blanca. */
export interface CaptionStyle { enabled: boolean; sizeRatio: number; yRatio: number; color: string }

export const DEFAULT_CAPTIONS: CaptionStyle = { enabled: true, sizeRatio: 0.054, yRatio: 0.65, color: 'white' }

/** Recursos quemables en el export. */
export interface EvResource {
  id: string
  kind: 'clip' | 'sticker' | 'text' | 'number'
  label: string
  // ventana en tiempo de SALIDA
  showStart: number
  showEnd: number
  // clip: momento del video ORIGINAL
  src?: { start: number; end: number }
  // sticker: asset pubblico / text: contenido
  text?: string
  pngPath?: string
  x?: number // px, default derecha
  y?: number
  w?: number // ancho del recurso en px del video final
}

export const RESOURCE_DUR = 2.4

/** Escapa texto para un filtro drawtext de ffmpeg. */
export function drawtextEscape(t: string): string {
  return t
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "\\\\'")
    .replace(/:/g, '\\\\:')
    .replace(/%/g, '\\\\%')
    .replace(/,/g, '\\\\,')
}

export interface FfmpegResourcePlan { args: string[]; inputs: string[] }

const CHERRY = '0x591427'
const CREAM = '0xFFFDF5'

/**
 * Construye el filter_complex completo (cortes + captions + recursos) en UNA pasada.
 * Captions y recursos escalan con la altura del video final.
 */
export function buildExportGraph(opts: {
  keeps: EvSpan[]
  duration: number
  videoW: number
  videoH: number
  captions: CaptionStyle
  outWords: OutWord[]
  resources: EvResource[]
  inputExt: string
  fonts?: { medium?: string; bold?: string }
}): { filter: string; inputs: string[]; videoOut: string; audioOut: string } {
  const { keeps, videoW, videoH, captions, outWords, resources } = opts
  const constFonts = opts.fonts ?? {}
  const parts: string[] = []
  let extraInputs = 0
  const inputNames: string[] = []
  let audioOut = 'outa'

  // 1 · cortes + concat
  keeps.forEach((k, i) => {
    parts.push(`[0:v]trim=start=${k.start.toFixed(3)}:end=${k.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`)
    parts.push(`[0:a]atrim=start=${k.start.toFixed(3)}:end=${k.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`)
  })
  parts.push(`${keeps.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${keeps.length}:v=1:a=1[outv][outa]`)

  // cadena de video: empieza en outv
  let cur = 'outv'

  // 2 · captions drawtext palabra a palabra (minusculas)
  if (captions.enabled && outWords.length > 0 && constFonts.medium) {
    const size = Math.round(videoH * captions.sizeRatio)
    const y = Math.round(videoH * captions.yRatio) - Math.round(size / 2)
    const chain = outWords.map(w => {
      const text = drawtextEscape(w.text.toLowerCase())
      const a = Math.max(0, w.outStart - 0.01).toFixed(2)
      const b = (w.outEnd + 0.02).toFixed(2)
      return `drawtext=fontfile=${constFonts.medium}:text='${text}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}:enable='between(t,${a},${b})'`
    }).join(',')
    parts.push(`[${cur}]${chain}[cap]`)
    cur = 'cap'
  }

  // 3 · recursos en orden — cada uno consume cur y produce etiqueta nueva
  resources.forEach((r, idx) => {
    const enable = `enable='between(t,${r.showStart.toFixed(2)},${r.showEnd.toFixed(2)})'`
    if (r.kind === 'clip') {
      if (!r.src || r.src.end - r.src.start < 0.4) return
      const inIdx = 1 + extraInputs
      extraInputs += 1
      inputNames.push(`input.${opts.inputExt}`)
      const w = r.w ?? Math.round(videoW * 0.26)
      parts.push(`[${inIdx}:v]trim=start=${r.src.start.toFixed(3)}:end=${r.src.end.toFixed(3)},setpts=PTS-STARTPTS,` +
        `scale=${w}:-2,pad=iw+12:ih+12:6:6:white[res${idx}]`)
      const x = r.x ?? videoW - w - 44
      const y = r.y ?? Math.round(videoH * 0.16)
      parts.push(`[${cur}][res${idx}]overlay=x=${x}:y=${y}:${enable}[rc${idx}]`)
      cur = `rc${idx}`
    } else if (r.kind === 'sticker') {
      if (!r.pngPath) return
      const inIdx = 1 + extraInputs
      extraInputs += 1
      const fname = `st${idx}.png`
      inputNames.push(fname)
      const w = r.w ?? Math.round(videoH * 0.13)
      parts.push(`[${inIdx}:v]scale=${w}:-1[res${idx}]`)
      const x = r.x ?? videoW - w - 44
      const y = r.y ?? Math.round(videoH * 0.16)
      parts.push(`[${cur}][res${idx}]overlay=x=${x}:y=${y}:${enable}[rc${idx}]`)
      cur = `rc${idx}`
    } else if (r.kind === 'text' && r.text && constFonts.bold) {
      const size = Math.round(videoH * 0.062)
      const t = drawtextEscape(r.text)
      parts.push(`[${cur}]drawtext=fontfile=${constFonts.bold}:text='${t}':fontsize=${size}:fontcolor=white:` +
        `box=1:boxcolor=${CHERRY}cc:boxborderw=28:x=(w-text_w)/2:y=${Math.round(videoH * 0.3)}:${enable}[rc${idx}]`)
      cur = `rc${idx}`
    } else if (r.kind === 'number' && r.text && constFonts.bold) {
      const size = Math.round(videoH / 3.2)
      const t = drawtextEscape(r.text)
      parts.push(`[${cur}]drawtext=fontfile=${constFonts.bold}:text='${t}':fontsize=${size}:fontcolor=${CREAM}:` +
        `x=64:y=${Math.round(videoH * 0.28)}:${enable}[rc${idx}]`)
      cur = `rc${idx}`
    }
  })

  return { filter: parts.join(';'), inputs: inputNames, videoOut: cur, audioOut }
}