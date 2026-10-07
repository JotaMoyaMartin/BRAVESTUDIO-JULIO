/**
 * STORIES DISEÑO — reescritura de textos de plantilla con la marca (Fase 2).
 *
 * No genera historias nuevas desde cero (para eso está stories.ts): adapta el
 * texto esbozo de un elemento de plantilla ('ai') a la marca del salón,
 * respetando el límite de caracteres del elemento y el estilo BRÄVE.
 * Devuelve TEXTO PLANO (sin JSON) — el editor lo inserta tal cual.
 */
import { generateAIContent } from '../client'
import { BrandFullContextInput } from '../brand-context'

export interface StoriesDesignRewriteInput {
  /** Texto esbozo de la plantilla. */
  text: string
  /** Máximo de caracteres del elemento (el diseño manda). */
  maxLength: number
  /** Qué es el elemento dentro de la plantilla (para el tono). */
  kind: 'gancho' | 'cuerpo' | 'cierre' | 'opcion'
  name?: string
  brand?: BrandFullContextInput | null
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
  return `Reescribe el texto de UN bloque de una Story de Instagram para una estilista. No es un guion ni un carrusel: es UNA pieza de texto que va suelta sobre el diseño.

MARCA DEL SALÓN:
${brandBlock(input.brand)}

QUÉ ES ESTE BLOQUE: ${input.kind === 'gancho' ? 'el gancho grande de la portada' : input.kind === 'cierre' ? 'la frase de cierre que empuja a actuar' : input.kind === 'opcion' ? 'una opción de una encuesta' : 'un párrafo de apoyo'}
TEXTO ACTUAL (esbozo): """${input.text}"""

REGLAS:
1. Máximo ${input.maxLength} caracteres — el diseño manda. ${isShort ? 'Cuenta cada espacio: mejor dos palabras precisas que 61 caracteres.' : ''}
2. Español de España, natural, como hablaría la estilista con una clienta frente al espejo. Directo, con criterio profesional, sin jerga técnica innecesaria.
3. Aterriza el esbozo al salón concreto cuando la marca lo permita (servicios, manera de trabajar). Si el esbozo menciona "tú" (a la clienta), mantenlo — la story habla A la seguidora.
4. PROHIBIDO: empezar con "¡Hola!", "Eres", "En el mundo de", "Como experta". Prohibido emojis que no estaban en el esbozo. Prohibido hashtags. Prohibido comillas al principio o al final.
5. Nunca prometas cosas que un salón real no haría (no "en 4 horas" inventado a lo loco: usa las referencias del esbozo).

Devuelve SOLO el texto final, sin explicaciones, sin comillas, sin JSON.`
}

/** Reescribe con IA. Falla → devuelve null (el editor mantiene el esbozo). */
export async function rewriteWithAI(input: StoriesDesignRewriteInput): Promise<string | null> {
  try {
    const out = await generateAIContent(buildStoriesDesignPrompt(input))
    const text = out.trim().replace(/^["'«]|["'»]$/g, '').slice(0, input.maxLength)
    return text.length >= 2 ? text : null
  } catch {
    return null
  }
}