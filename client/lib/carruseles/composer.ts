/**
 * CARRUSEL 2.0 — composición editable (21-oct-2026).
 *
 * Cada slide = FONDO (foto IA sin texto · foto propia · banco · color de marca)
 *            + CAPAS DE TEXTO en HTML colocadas según una COMPOSICIÓN.
 * El texto ya no lo dibuja la IA: se corrige, se mueve y cambia de letra sin
 * regenerar la imagen. La descarga exporta exactamente lo que se ve.
 *
 * Todo es data: añadir una tipografía o una composición = añadir un objeto.
 */
import type { SlideRole, VisualType } from './types'
import { pickBancoPhoto } from '../banco-ia'

// ── Galería de tipografías (pares titular + texto) ───────────────────────────

export type FontPairId = 'editorial' | 'revista' | 'moderna' | 'titular' | 'impacto' | 'clasica' | 'firma' | 'grotesk' | 'silencio' | 'silencio-firma' | 'poster'

export interface FontSpec {
  family: string
  weight: number
  /** Mayúsculas solo donde la letra lo pide (Bebas). */
  upper?: boolean
  tracking?: string
  /** Ancho de la letra (Archivo admite 62–125 %). */
  stretch?: string
  lineHeight: number
  /** Ajuste óptico: unas letras «miden» más que otras a igual tamaño. */
  sizeFactor: number
}

export interface FontPair {
  id: FontPairId
  name: string
  /** Para qué funciona, en una frase de estilista. */
  hint: string
  title: FontSpec
  body: FontSpec
  /** Letra de los acentos **así** dentro del titular. */
  accent: { family: string; weight: number; italic: boolean }
}

const F = {
  dmserif: 'var(--font-dmserif), "DM Serif Display", Georgia, serif',
  fraunces: 'var(--font-fraunces), Fraunces, Georgia, serif',
  montserrat: 'var(--font-montserrat), Montserrat, system-ui, sans-serif',
  poppins: 'var(--font-poppins), Poppins, system-ui, sans-serif',
  bebas: 'var(--font-bebas), "Bebas Neue", Impact, sans-serif',
  archivo: 'var(--font-archivo), "Archivo Black", Impact, sans-serif',
  yellowtail: 'var(--font-yellowtail), Yellowtail, cursive',
  grotesk: 'var(--font-grotesk), "Space Grotesk", system-ui, sans-serif',
  instrument: 'var(--font-instrument), "Instrument Serif", Georgia, serif',
  pinyon: 'var(--font-pinyon), "Pinyon Script", cursive',
  archivoWide: 'var(--font-archivo-wide), Archivo, system-ui, sans-serif',
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'editorial', name: 'Editorial', hint: 'Lujo de revista: serif con texto fino',
    title: { family: F.dmserif, weight: 400, lineHeight: 1.02, sizeFactor: 1.05, tracking: '-0.01em' },
    body: { family: F.montserrat, weight: 500, lineHeight: 1.35, sizeFactor: 1 },
    accent: { family: F.dmserif, weight: 400, italic: true },
  },
  {
    id: 'revista', name: 'Revista', hint: 'Serif cálida y cercana',
    title: { family: F.fraunces, weight: 600, lineHeight: 1.04, sizeFactor: 1, tracking: '-0.015em' },
    body: { family: F.poppins, weight: 400, lineHeight: 1.4, sizeFactor: 1 },
    accent: { family: F.fraunces, weight: 500, italic: true },
  },
  {
    id: 'moderna', name: 'Moderna', hint: 'Limpia, actual y muy legible',
    title: { family: F.montserrat, weight: 700, lineHeight: 1.05, sizeFactor: 0.92, tracking: '-0.02em' },
    body: { family: F.montserrat, weight: 500, lineHeight: 1.38, sizeFactor: 1 },
    accent: { family: F.dmserif, weight: 400, italic: true },
  },
  {
    id: 'titular', name: 'Titular', hint: 'Alta y estrecha: impacto en el primer vistazo',
    title: { family: F.bebas, weight: 400, upper: true, lineHeight: 0.95, sizeFactor: 1.32, tracking: '0.005em' },
    body: { family: F.poppins, weight: 500, lineHeight: 1.38, sizeFactor: 1 },
    accent: { family: F.dmserif, weight: 400, italic: true },
  },
  {
    id: 'impacto', name: 'Impacto', hint: 'Gruesa y rotunda, para frases cortas',
    title: { family: F.archivo, weight: 400, lineHeight: 1.02, sizeFactor: 0.86, tracking: '-0.02em' },
    body: { family: F.poppins, weight: 500, lineHeight: 1.38, sizeFactor: 1 },
    accent: { family: F.dmserif, weight: 400, italic: true },
  },
  {
    id: 'clasica', name: 'Clásica BRÄVE', hint: 'Redonda y amable, la de la app',
    title: { family: F.poppins, weight: 600, lineHeight: 1.08, sizeFactor: 0.92, tracking: '-0.015em' },
    body: { family: F.poppins, weight: 400, lineHeight: 1.4, sizeFactor: 1 },
    accent: { family: F.poppins, weight: 600, italic: false },
  },
  {
    id: 'firma', name: 'Firma', hint: 'Serif elegante con acento manuscrito',
    title: { family: F.dmserif, weight: 400, lineHeight: 1.04, sizeFactor: 1.02 },
    body: { family: F.poppins, weight: 400, lineHeight: 1.4, sizeFactor: 1 },
    accent: { family: F.yellowtail, weight: 400, italic: false },
  },
  {
    id: 'grotesk', name: 'Grotesca', hint: 'Geométrica con carácter, toque moderno',
    title: { family: F.grotesk, weight: 700, lineHeight: 1.02, sizeFactor: 0.95, tracking: '-0.03em' },
    body: { family: F.grotesk, weight: 400, lineHeight: 1.38, sizeFactor: 1 },
    accent: { family: F.dmserif, weight: 400, italic: true },
  },
  // Referencia: carruseles de salón con serif estrecha centrada y texto fino (oct-2026).
  {
    id: 'silencio', name: 'Silencio', hint: 'Serif estrecha y cursiva: calma de salón de autor',
    title: { family: F.instrument, weight: 400, lineHeight: 0.98, sizeFactor: 1.22, tracking: '-0.01em' },
    body: { family: F.montserrat, weight: 400, lineHeight: 1.4, sizeFactor: 1 },
    accent: { family: F.instrument, weight: 400, italic: true },
  },
  {
    id: 'silencio-firma', name: 'Silencio firma', hint: 'La misma calma, con una palabra manuscrita',
    title: { family: F.instrument, weight: 400, lineHeight: 0.98, sizeFactor: 1.22, tracking: '-0.01em' },
    body: { family: F.montserrat, weight: 400, lineHeight: 1.4, sizeFactor: 1 },
    accent: { family: F.pinyon, weight: 400, italic: false },
  },
  // Referencia: portada tipo póster con nombre partido en dos bloques (oct-2026).
  {
    id: 'poster', name: 'Póster', hint: 'Palo seco ancha y gruesa: portada de revista',
    title: { family: F.archivoWide, weight: 800, upper: true, stretch: '125%', lineHeight: 0.92, sizeFactor: 0.9, tracking: '-0.035em' },
    body: { family: F.montserrat, weight: 700, upper: true, lineHeight: 1.18, sizeFactor: 1 },
    accent: { family: F.archivoWide, weight: 800, italic: false },
  },
]

export function fontPair(id: string | undefined): FontPair {
  return FONT_PAIRS.find(p => p.id === id) || FONT_PAIRS[0]
}

// ── Composiciones (dónde va el texto) ────────────────────────────────────────

export type LayoutId = 'abajo' | 'arriba' | 'centro' | 'revista' | 'tarjeta' | 'lateral' | 'silencio' | 'marco' | 'recorte'

export const LAYOUTS: Array<{ id: LayoutId; name: string; hint: string }> = [
  { id: 'abajo', name: 'Abajo', hint: 'Titular sobre la parte baja de la foto' },
  { id: 'arriba', name: 'Arriba', hint: 'Texto arriba, la foto respira abajo' },
  { id: 'centro', name: 'Centro', hint: 'Frase grande en el centro' },
  { id: 'revista', name: 'Revista', hint: 'Número y etiqueta arriba, titular abajo' },
  { id: 'tarjeta', name: 'Tarjeta', hint: 'Texto dentro de una placa crema: máxima lectura' },
  { id: 'lateral', name: 'Lateral', hint: 'Columna de texto a la izquierda' },
  { id: 'silencio', name: 'Silencio', hint: 'Etiqueta, frase y texto fino centrados en mitad de la foto' },
  { id: 'marco', name: 'Póster', hint: 'Foto enmarcada en papel y titular partido en las esquinas' },
  { id: 'recorte', name: 'Recortes', hint: 'Personas recortadas sobre color liso, titular encima' },
]

// ── Diseño de una slide ──────────────────────────────────────────────────────

export type SlideBg =
  | { kind: 'photo'; src: string; source: 'ia' | 'propia' | 'banco' }
  | { kind: 'color'; color: string }

export interface SlideDesign {
  layout: LayoutId
  fontPair: FontPairId
  /** Multiplicador de tamaño del titular (0.7–1.4). */
  scale: number
  /** claro = texto blanco · oscuro = texto burdeos/tinta. */
  tone: 'claro' | 'oscuro'
  /** Velo sobre la foto para que el texto se lea (0–0.7). */
  overlay: number
  bg: SlideBg
  /** Etiqueta pequeña opcional (revista, silencio, tarjeta): «Balayage», «Verdad nº 2»… */
  label?: string
  /** Frase final en mayúsculas pequeñas (silencio) o línea de firma (póster). */
  note?: string
  /** Recortes (PNG sin fondo) de la composición «recorte»: 1 a 3. */
  cutouts?: string[]
  /** Color del velo («r,g,b»). Sin él: negro cálido o crema según el tono. */
  tint?: string
}

export const BRAND_COLORS: Array<{ name: string; color: string; tone: 'claro' | 'oscuro' }> = [
  { name: 'Burdeos', color: '#591427', tone: 'claro' },
  { name: 'Cereza', color: '#7A1832', tone: 'claro' },
  { name: 'Crema', color: '#FFF7EE', tone: 'oscuro' },
  { name: 'Mantequilla', color: '#FFF1B5', tone: 'oscuro' },
  { name: 'Rosa empolvado', color: '#F3DCE1', tone: 'oscuro' },
  { name: 'Tinta', color: '#2B1A1F', tone: 'claro' },
  { name: 'Topo', color: '#9C8B7A', tone: 'claro' },
  { name: 'Arena', color: '#D9CDBE', tone: 'oscuro' },
]

/** Cómo compone cada estilo visual (por id de lib/carruseles/styles.ts). */
interface StyleComposition {
  fontPair: FontPairId
  tone: 'claro' | 'oscuro'
  overlay: number
  layoutFor: (role: SlideRole, index: number) => LayoutId
  /** Fondo de color para ciertos roles. */
  colorFor?: (role: SlideRole, index: number) => string | null
  /** Velo más fuerte para ciertos roles (portada y cierre). */
  overlayFor?: (role: SlideRole, index: number) => number | null
  /** Color del velo («r,g,b»). */
  tint?: string
}

const COMPOSITIONS: Record<string, StyleComposition> = {
  'editorial-hair-luxe': {
    fontPair: 'editorial', tone: 'claro', overlay: 0.32,
    layoutFor: (role, i) => role === 'hook' ? 'abajo' : role === 'cta' ? 'tarjeta' : role === 'cierre' ? 'centro' : (i % 2 ? 'revista' : 'lateral'),
  },
  'estudio-limpio': {
    fontPair: 'moderna', tone: 'oscuro', overlay: 0.55,
    layoutFor: (role, i) => role === 'hook' ? 'arriba' : role === 'cta' ? 'tarjeta' : role === 'cierre' ? 'centro' : (i % 2 ? 'arriba' : 'revista'),
  },
  // Jota (28-oct): el burdeos liso «queda pobre». Portada y cierre van con
  // foto de salón y velo burdeos (estética granate aprobada el 27-oct).
  'brave-burdeos': {
    fontPair: 'titular', tone: 'claro', overlay: 0.42, tint: '64,6,24',
    layoutFor: (role, i) => role === 'hook' ? 'centro' : role === 'cta' ? 'centro' : (i % 2 ? 'abajo' : 'revista'),
    overlayFor: (role) => (role === 'hook' || role === 'cta' ? 0.68 : null),
  },
  'silencio-autor': {
    fontPair: 'silencio-firma', tone: 'claro', overlay: 0.3,
    layoutFor: () => 'silencio',
  },
  'poster-portada': {
    fontPair: 'poster', tone: 'claro', overlay: 0,
    layoutFor: (role, i) => role === 'hook' || role === 'cta' ? 'marco' : (i % 2 ? 'marco' : 'tarjeta'),
  },
}

/** Etiqueta inicial por estilo: «Verdad nº 2», «Nº 03»… */
export function defaultLabel(styleId: string, role: SlideRole, index: number): string | undefined {
  if (styleId === 'silencio-autor') return role === 'hook' ? 'Verdad nº ' + (index + 1) : undefined
  return undefined
}

export function compositionFor(styleId: string): StyleComposition {
  return COMPOSITIONS[styleId] || COMPOSITIONS['editorial-hair-luxe']
}

// ── Banco de fotos de la app (fondos sin IA) por tipo de encuadre ───────────

export const BANK_BY_VISUAL: Partial<Record<VisualType, string[]>> = {
  // Plan B si el banco BRÄVE estuviera vacío (las fotos de /landing son solo de la portada).
  hero_result: ['/foto-inspo/selfie-espejo-look.jpg', '/foto-inspo/pose-brazos-cruzados.jpg'],
  lifestyle: ['/foto-inspo/pose-brazos-cruzados.jpg', '/foto-inspo/selfie-bien-del-dia.jpg'],
  hands_process: ['/foto-inspo/selfie-en-plena-faena.jpg'],
  tools: ['/foto-inspo/tijeras-al-aire.jpg', '/foto-inspo/detalle-tijeras-camara.jpg', '/foto-inspo/pose-herramientas-brazos.jpg'],
  product: ['/foto-inspo/detalle-tarjeta.jpg', '/foto-inspo/pose-plancha.jpg'],
  salon_env: ['/foto-inspo/pose-sillon-trabajo.jpg'],
}

/**
 * Foto del banco para una slide: primero el banco BRÄVE (por tema del texto o
 * encuadre, sin repetir), y si está vacío, las fotos antiguas por encuadre.
 */
export function bankPhotoFor(visual: VisualType, index: number, opts: { text?: string; seed?: string; avoid?: string[] } = {}): string {
  const ia = pickBancoPhoto({ text: opts.text, visual, seed: `${opts.seed ?? ''}:${visual}:${index}`, avoid: opts.avoid })
  if (ia) return ia
  const list = BANK_BY_VISUAL[visual] || BANK_BY_VISUAL.hero_result!
  return list[index % list.length]
}

/** Diseño inicial de la slide según su estilo y su papel en el carrusel. */
export function defaultDesign(args: {
  styleId: string
  role: SlideRole
  index: number
  visual: VisualType
  imageUrl?: string
  /** Texto de la slide + tema: elige la foto del banco que encaja. */
  text?: string
  seed?: string
  avoid?: string[]
}): SlideDesign {
  const c = compositionFor(args.styleId)
  const color = c.colorFor?.(args.role, args.index) ?? null
  const bg: SlideBg = color
    ? { kind: 'color', color }
    : args.imageUrl
      ? { kind: 'photo', src: args.imageUrl, source: 'ia' }
      : { kind: 'photo', src: bankPhotoFor(args.visual, args.index, { text: args.text, seed: args.seed, avoid: args.avoid }), source: 'banco' }
  const layout = c.layoutFor(args.role, args.index)
  return {
    layout,
    fontPair: c.fontPair,
    scale: 1,
    tone: color ? (BRAND_COLORS.find(b => b.color === color)?.tone ?? 'claro') : c.tone,
    overlay: color ? 0 : layout === 'tarjeta' ? 0.12 : (c.overlayFor?.(args.role, args.index) ?? c.overlay),
    bg,
    label: defaultLabel(args.styleId, args.role, args.index),
    ...(c.tint ? { tint: c.tint } : {}),
  }
}

/** Parte el titular del póster en dos bloques: «arriba | abajo» o por la mitad. */
export function splitPoster(text: string): [string, string] {
  const clean = text.replace(/\*\*/g, '').trim()
  if (clean.includes('|')) {
    const [a, ...b] = clean.split('|')
    return [a.trim(), b.join(' ').trim()]
  }
  const words = clean.split(/\s+/)
  if (words.length < 2) return [clean, '']
  let best = 1, diff = Infinity
  for (let k = 1; k < words.length; k++) {
    const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length)
    if (d < diff) { diff = d; best = k }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')]
}

/** Tamaño base del titular (en cqw del lienzo) según la longitud del texto. */
export function titleSizeCqw(text: string, pair: FontPair, scale: number): number {
  const len = text.replace(/\*\*/g, '').length
  const base = len <= 32 ? 10 : len <= 60 ? 8.2 : len <= 100 ? 6.8 : len <= 160 ? 5.6 : 4.8
  return +(base * pair.title.sizeFactor * scale).toFixed(2)
}

/** Separa «texto **acento** texto» en trozos para pintar los acentos. */
export function splitAccents(text: string): Array<{ t: string; accent: boolean }> {
  const out: Array<{ t: string; accent: boolean }> = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), accent: false })
    out.push({ t: m[1], accent: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: text.slice(last), accent: false })
  return out.length ? out : [{ t: text, accent: false }]
}
