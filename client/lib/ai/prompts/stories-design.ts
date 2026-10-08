/**
 * STORIES DISEÑO — IA v2 (rework mini-Canva).
 *
 * Dos generadores, ambos con contexto de marca:
 *  1) reescritura de UN bloque (con modos de tono: más corto/directo/
 *     elegante/vendedor/educativo) — devuelve TEXTO PLANO.
 *  2) adaptación de TODA la SECUENCIA con continuidad (gancho → explicación
 *     → solución → CTA): 1 generación que devuelve JSON {slots} — se parsea
 *     con extractJSON canónico. Nada de clientes nuevos (regla §7 repo).
 *
 * La IA nunca rompe los constraints del diseño: maxLength se clampa SIEMPRE
 * en cliente; maxLines se valida y el resultado puede truncarse por líneas.
 */
import { generateAIContent } from '../client'
import { extractJSON } from '../extract'
import { BrandFullContextInput } from '../brand-context'

export type RewriteMode = 'short' | 'direct' | 'elegant' | 'selling' | 'educational'

export interface StoriesDesignRewriteInput {
  /** Texto esbozo de la plantilla. */
  text: string
  /** Máximo de caracteres del elemento (el diseño manda). */
  maxLength: number
  /** Máximo de líneas del elemento (opcional). */
  maxLines?: number
  /** Qué es el elemento dentro de la plantilla (para el tono). */
  kind: 'gancho' | 'cuerpo' | 'cierre' | 'opcion'
  /** Modo de tono pedido desde el panel de propiedades. */
  mode?: RewriteMode
  /** Sugerencia del propósito (aiConfig.purpose). */
  purpose?: string
  name?: string
  brand?: BrandFullContextInput | null
}

const MODE_RULES: Record<RewriteMode, string> = {
  short: 'Versión MÁS CORTA: conserva solo la idea esencial. Cada palabra cuenta.',
  direct: 'Versión MÁS DIRECTA: frase clara, sin rodeos ni adornos; como mandar un mensaje a una clienta.',
  elegant: 'Versión MÁS ELEGANTE: vocabulario cuidado y refinado, evocador, sin caer en cursilería ni jerga de perfume.',
  selling: 'Versión MÁS VENDEDORA: subraya el beneficio para la clienta y empuja a pedir cita, sin sonar a comercial de TV.',
  educational: 'Versión MÁS EDUCATIVA: explica el porqué técnico en lenguaje de clienta (sin tecnicismos innecesarios).',
}

const KIND_LABEL: Record<StoriesDesignRewriteInput['kind'], string> = {
  gancho: 'el gancho grande de la portada',
  cuerpo: 'un párrafo de apoyo',
  cierre: 'la frase de cierre que empuja a actuar',
  opcion: 'una opción de una encuesta',
}

/** Bloque de marca en texto plano (compacto, para el prompt). */
function brandBlock(brand?: BrandFullContextInput | null): string {
  if (!brand) return '(sin ficha de marca — escribe genérico pero creíble de salón)'
  const lines: string[] = []
  if (brand.salon_name) lines.push(`Salón: ${brand.salon_name}`)
  if (brand.main_services?.length) lines.push(`Servicios: ${brand.main_services.slice(0, 6).join(', ')}`)
  if (brand.service_to_promote) lines.push(`Servicio a promocionar ahora: ${brand.service_to_promote}`)
  if (brand.optimized_summary) lines.push(brand.optimized_summary.slice(0, 1200))
  return lines.length > 0 ? lines.join('\n') : '(sin ficha de marca — escribe genérico pero creíble de salón)'
}

export function buildStoriesDesignPrompt(input: StoriesDesignRewriteInput): string {
  const isShort = input.maxLength <= 60
  const lines: string[] = [
    `Reescribe el texto de UN bloque de una Story de Instagram para una estilista. No es un guion ni un carrusel: es UNA pieza de texto que va suelta sobre el diseño.`,
    ``,
    `MARCA DEL SALÓN:`,
    brandBlock(input.brand),
    ``,
    `QUÉ ES ESTE BLOQUE: ${KIND_LABEL[input.kind]}`,
  ]
  if (input.purpose) lines.push(`PROPÓSITO EN LA SECUENCIA: ${input.purpose}`)
  lines.push(
    `TEXTO ACTUAL (esbozo): """${input.text}"""`,
    ``,
    `REGLAS:`,
    `1. Máximo ${input.maxLength} caracteres — el diseño manda. ${isShort ? 'Cuenta cada espacio: mejor dos palabras precisas que 61 caracteres.' : ''}`,
    `2. Español de España, natural, como hablaría la estilista con una clienta frente al espejo. Directo, con criterio profesional, sin jerga técnica innecesaria.`,
    `3. Aterriza el esbozo al salón concreto cuando la marca lo permita (servicios, manera de trabajar). Si el esbozo menciona "tú" (a la clienta), mantenlo — la story habla A la seguidora.`,
    `4. PROHIBIDO: empezar con "¡Hola!", "Eres", "En el mundo de", "Como experta". Prohibido emojis que no estaban en el esbozo. Prohibido hashtags. Prohibido comillas al principio o al final.`,
    `5. Nunca prometas cosas que un salón real no haría (no "en 4 horas" inventado a lo loco: usa las referencias del esbozo).`,
  )
  if (input.mode) lines.push(`6. MODO PEDIDO: ${MODE_RULES[input.mode]}`)
  lines.push(``, `Devuelve SOLO el texto final, sin explicaciones, sin comillas, sin JSON.`)
  return lines.join('\n')
}

/** Trunca un texto por LÍNEAS (para constraints.maxLines) — puro. */
export function clampLines(text: string, maxLines?: number): string {
  if (!maxLines || maxLines <= 0) return text
  const out = text
    .split('\n')
    .flatMap(l => {
      // heurística: reempaquetar por palabras si el párrafo excede ~68 chars/línea
      if (l.length <= 72) return [l]
      const words = l.split(' ')
      const rows: string[] = []
      let cur = ''
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > 72) { if (cur) rows.push(cur.trim()); cur = w } else cur = `${cur} ${w}`.trim()
      }
      if (cur) rows.push(cur.trim())
      return rows
    })
  return out.slice(0, maxLines).join('\n')
}

/** Reescribe con IA (un modo de tono). Falla → null (el editor mantiene el esbozo). */
export async function rewriteWithAI(input: StoriesDesignRewriteInput): Promise<string | null> {
  try {
    const out = await generateAIContent(buildStoriesDesignPrompt(input))
    const text = clampLines(out.trim().replace(/^["'«]|["'»]$/g, '').slice(0, input.maxLength), input.maxLines)
    return text.length >= 2 ? text : null
  } catch {
    return null
  }
}

/* ── ADAPTACIÓN DE SECUENCIA ── */

export interface SequenceSlot {
  id: string
  text: string
  maxLength: number
  maxLines?: number
  kind: 'gancho' | 'cuerpo' | 'cierre' | 'opcion'
  purpose?: string
}

export interface SequenceAdaptInput {
  /** Nombre de la plantilla (contexto de la secuencia). */
  templateTitle: string
  /** Slots de TODA la secuencia, en orden de historias. */
  slides: { index: number; name: string; purpose: string; slots: SequenceSlot[] }[]
  brand?: BrandFullContextInput | null
}

export function buildSequenceAdaptPrompt(input: SequenceAdaptInput): string {
  const slidesDesc = input.slides.map(s => {
    const slots = s.slots.map(sl => `    - id "${sl.id}" (${sl.kind}${sl.purpose ? `, ${sl.purpose}` : ''}): máximo ${sl.maxLength} caracteres${sl.maxLines ? `, máximo ${sl.maxLines} líneas` : ''}. TEXTO ACTUAL: """${sl.text}"""`).join('\n')
    return `  Historia ${s.index}${s.name ? ` (${s.name})` : ''} — rol en la secuencia: ${s.purpose}\n${slots}`
  }).join('\n')

  return `Adapta TODA una secuencia de stories de Instagram (una plantilla professional) para una estilista concreta. Las historias deben leerse como UNA secuencia con continuidad: ${'la 1'} engancha, las intermedias explican y resuelven, la última empuja a la acción.

MARCA DEL SALÓN:
${brandBlock(input.brand)}

PLANTILLA: ${input.templateTitle}

SLOTS A RELLENAR (respeta los ids EXACTOS):
${slidesDesc}

REGLAS:
1. Devuelve un JSON con esta forma EXACTA: {"slots": {"<id>": "<texto>", ...}}. UNA entrada por slot, con los ids tal cual están arriba.
2. Cada texto respeta el máximo de caracteres de SU slot (el diseño manda) — cuenta en serio.
3. Continuidad: no repitas la misma idea en dos historias; los ganchos abren, el cuerpo desarrolla, el cierre cita/agenda. Nada de empezar varias con la misma palabra.
4. Español de España, voz de estilista experta frente al espejo: natural, con criterio, sin jerga, sin sonar a anuncio.
5. PROHIBIDO: "¡Hola!", empezar con "Eres", "En el mundo de", "Como experta"; emojis; hashtags; comillas al principio o final.
6. Usa las sugerencias y servicios de la marca si encajan; si falta marca, escribe genérico pero creíble de salón.

Devuelve SOLO el JSON.`
}

/** Adapta la secuencia entera. Falla o incompleto → null (se mantienen los esbozos). */
export async function adaptSequenceWithAI(input: SequenceAdaptInput): Promise<Record<string, string> | null> {
  try {
    const out = await generateAIContent(buildSequenceAdaptPrompt(input))
    const parsed = extractJSON<{ slots?: Record<string, string> }>(out)
    if (!parsed?.slots || typeof parsed.slots !== 'object') return null
    const wanted = new Map<string, SequenceSlot>()
    for (const s of input.slides) for (const sl of s.slots) wanted.set(sl.id, sl)
    const result: Record<string, string> = {}
    for (const [id, raw] of Object.entries(parsed.slots)) {
      const wl = wanted.get(id)
      if (!wl || typeof raw !== 'string') continue
      const text = clampLines(raw.trim().replace(/^["'«]|["'»]$/g, ''), wl.maxLines).slice(0, wl.maxLength)
      if (text.length >= 2) result[id] = text
    }
    return Object.keys(result).length > 0 ? result : null
  } catch {
    return null
  }
}