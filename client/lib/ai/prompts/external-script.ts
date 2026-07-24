/**
 * Interpretar un guion pegado entero (traído de fuera de la plataforma)
 * y estructurarlo en el formato BRÄVE para crear una tarjeta visual.
 *
 * Flujo:
 *   1. La CM pega el guion completo en un único cuadro (chat-style).
 *   2. /team/api/estrategia/ideas/manual-create llama a `parseExternalScript`.
 *   3. La IA devuelve title, type, service, hook, context, solution, cta,
 *      visual_idea, caption listos para insertar en content_ideas + content_items.
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

export interface ParsedScriptOutput {
  script: ParsedScript
}

export interface ParseScriptInput {
  rawText: string
  brandContext?: string
}

export function buildParseScriptPrompt(input: ParseScriptInput): string {
  const brandBlock = input.brandContext
    ? `\n\nContexto de la marca (para inferir servicio, pilar y tono):\n${input.brandContext}`
    : ''

  return `Eres un editor de guiones para salones de belleza y peluquería en España. Te pego un guion de contenido traído de fuera de la plataforma. Tu trabajo es estructurarlo en el formato BRÄVE para crear una tarjeta visual.

Texto pegado:
"""
${input.rawText}
"""
${brandBlock}

Interpreta el texto y rellena EXACTAMENTE este JSON sin texto adicional:
{
  "script": {
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
}

Reglas:
- Si el texto no separa claramente las secciones, infiérelas por el contenido.
- Si falta el CTA, propón uno conversacional coherente.
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

export async function parseExternalScript(input: ParseScriptInput): Promise<{ script: ParsedScript; mock: boolean }> {
  try {
    const raw = await serverGenerateAIContent(buildParseScriptPrompt(input))
    const parsed = extractJSON<ParsedScriptOutput>(raw)
    const VALID_TYPES: ('reel' | 'carrusel')[] = ['reel', 'carrusel']
    const VALID_OBJ = ['educacion', 'autoridad', 'inspiracion', 'venta', 'deseo', 'dolor', 'objecion', 'testimonio', 'caso_exito', 'viralidad']
    if (parsed?.script && typeof parsed.script.title === 'string') {
      const s = parsed.script
      return {
        script: {
          title: s.title || 'Guion externo',
          type: VALID_TYPES.includes(s.type) ? s.type : 'reel',
          service: s.service || '',
          pillar: s.pillar || 'Autoridad',
          objective: VALID_OBJ.includes(s.objective) ? s.objective : 'autoridad',
          hook_idea: s.hook_idea || '',
          hook: s.hook || '',
          context: s.context || '',
          solution: s.solution || '',
          cta: s.cta || '',
          visual_idea: s.visual_idea || '',
          caption: s.caption || '',
        },
        mock: false,
      }
    }
    return { script: parseMockScript(input), mock: true }
  } catch {
    return { script: parseMockScript(input), mock: true }
  }
}