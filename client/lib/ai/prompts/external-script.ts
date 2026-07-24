/**
 * Interpretar uno o varios guiones pegados (traídos de fuera de la plataforma)
 * y estructurarlos en el formato BRÄVE para crear tarjetas visuales.
 *
 * Flujo:
 *   1. La CM pega uno o varios guiones en un único cuadro.
 *   2. /team/api/estrategia/ideas/manual-create llama a `parseExternalScript`.
 *   3. La IA devuelve un array de scripts con title, type, service, hook,
 *      context, solution, cta, visual_idea, caption.
 *   4. Se crea una idea + content_item por cada guion detectado.
 */
import { serverGenerateAIContent } from '../server-generate'
import { extractJSON } from '../client'

export interface ParsedScript {
  title: string
  type: 'reel' | 'carrusel'
  service: string
  pillar: string
  objective: string
  hook_idea: string
  hook: string
  context: string
  solution: string
  cta: string
  visual_idea: string
  caption: string
}

export interface ParsedScriptsOutput {
  scripts: ParsedScript[]
}

export interface ParseScriptInput {
  rawText: string
  brandContext?: string
}

export function buildParseScriptPrompt(input: ParseScriptInput): string {
  const brandBlock = input.brandContext
    ? `\n\nContexto de la marca (para inferir servicio, pilar y tono):\n${input.brandContext}`
    : ''

  return `Eres un editor de guiones para salones de belleza y peluquería en España. Te pego uno o varios guiones de contenido traídos de fuera de la plataforma. Tu trabajo es estructurarlos en el formato BRÄVE y devolver UNA tarjeta por cada guion o idea distinta que detectes en el texto.

Texto pegado:
"""
${input.rawText}
"""
${brandBlock}

Detecta cuántos guiones o ideas de contenido diferentes hay en el texto. Cada guion/idea independiente debe convertirse en su propia tarjeta. Si hay separadores como "GUION 1", "IDEA 2", "---", "##", números, o saltos de bloque claros, úsalos para dividir. Si solo hay un guion, devuelve un array con un elemento.

Responde EXACTAMENTE con este JSON sin texto adicional:
{
  "scripts": [
    {
      "title": "título concreto y específico de la pieza (máx 8 palabras)",
      "type": "reel" | "carrusel",
      "service": "nombre del servicio principal (ej: Balayage, Corte, Color, Keratina...)",
      "pillar": "pilar de contenido (Autoridad, Educación, Inspiración, Transformación, Testimonio...)",
      "objective": "educacion" | "autoridad" | "inspiracion" | "venta" | "deseo" | "dolor" | "objecion" | "testimonio" | "caso_exito" | "viralidad",
      "hook_idea": "gancho breve de 3-8 palabras",
      "hook": "las primeras frases del guion (gancho)",
      "context": "el desarrollo del problema o situación",
      "solution": "la explicación de qué, cómo y por qué",
      "cta": "la llamada a la acción conversacional",
      "visual_idea": "cómo grabarlo o el plano visual (si se infiere del texto)",
      "caption": "copy para Instagram con hashtags (si aplica, si no, generarlo breve)"
    }
  ]
}

Reglas:
- Devuelve un array "scripts" con tantas tarjetas como guiones/ideas distintos detectes.
- Si el texto no separa claramente las secciones de un guion, infiérelas por el contenido.
- Si falta el CTA en algún guion, propón uno conversacional coherente.
- El caption: si no viene en el texto, generas uno breve con 3-5 hashtags.
- type: si hay varios pasos/planchas, será "carrusel"; si es monólogo o narración, "reel".
- Todo en español.`
}

export function parseMockScript(input: ParseScriptInput): ParsedScript {
  const text = input.rawText.trim()
  const firstLine = text.split('\n').find(l => l.trim())?.slice(0, 60) || 'Guion externo'
  return {
    title: firstLine,
    type: 'reel',
    service: '',
    pillar: 'Autoridad',
    objective: 'autoridad',
    hook_idea: '',
    hook: text,
    context: '',
    solution: '',
    cta: '',
    visual_idea: '',
    caption: '',
  }
}

function sanitizeScript(s: Partial<ParsedScript>): ParsedScript {
  const VALID_TYPES: ('reel' | 'carrusel')[] = ['reel', 'carrusel']
  const VALID_OBJ = ['educacion', 'autoridad', 'inspiracion', 'venta', 'deseo', 'dolor', 'objecion', 'testimonio', 'caso_exito', 'viralidad']
  return {
    title: s.title || 'Guion externo',
    type: VALID_TYPES.includes(s.type as 'reel' | 'carrusel') ? s.type as 'reel' | 'carrusel' : 'reel',
    service: s.service || '',
    pillar: s.pillar || 'Autoridad',
    objective: VALID_OBJ.includes(s.objective as string) ? s.objective as ParsedScript['objective'] : 'autoridad',
    hook_idea: s.hook_idea || '',
    hook: s.hook || '',
    context: s.context || '',
    solution: s.solution || '',
    cta: s.cta || '',
    visual_idea: s.visual_idea || '',
    caption: s.caption || '',
  }
}

export async function parseExternalScript(input: ParseScriptInput): Promise<{ scripts: ParsedScript[]; mock: boolean }> {
  try {
    const raw = await serverGenerateAIContent(buildParseScriptPrompt(input))
    const parsed = extractJSON<ParsedScriptsOutput | { script: ParsedScript }>(raw)

    // Accept either { scripts: [...] } or legacy { script: {...} }
    if (parsed) {
      if (Array.isArray((parsed as ParsedScriptsOutput).scripts)) {
        const scripts = (parsed as ParsedScriptsOutput).scripts
          .filter(s => s && typeof s.title === 'string')
          .map(s => sanitizeScript(s))
        if (scripts.length > 0) return { scripts, mock: false }
      }
      if ((parsed as { script: ParsedScript }).script && typeof (parsed as { script: ParsedScript }).script.title === 'string') {
        return { scripts: [sanitizeScript((parsed as { script: ParsedScript }).script)], mock: false }
      }
    }
    return { scripts: [parseMockScript(input)], mock: true }
  } catch {
    return { scripts: [parseMockScript(input)], mock: true }
  }
}