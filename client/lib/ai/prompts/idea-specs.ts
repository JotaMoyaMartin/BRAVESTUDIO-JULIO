/**
 * Ideas de reels — módulo puro + generación browser (misma ruta /api/ai/generate
 * que generateReel). Server vive en prompts/ideas.ts (que re-exporta esto).
 */
import { generateAIContent, extractJSON } from '../client'

export type IdeaType = 'reel'

export interface IdeaItem {
  title: string
  type: IdeaType
  pillar: string        // uno de los pilares de strategy_json.pilares_contenido
  objective: string     // 'educacion' | 'autoridad' | 'inspiracion' | 'venta' | 'deseo' | 'dolor' | 'objecion' | 'testimonio' | 'caso_exito' | 'viralidad'
  service: string       // uno de brand_profiles.main_services o service_to_promote
  hook_idea: string     // gancho breve (3-8 palabras) siguiendo el manual BRÄVE
}

export interface IdeasOutput {
  ideas: IdeaItem[]
}

export interface IdeasInput {
  brandContext: string            // texto plano: salón, servicios, clienta ideal, tono, pilares…
  count: number                   // cuántas ideas proponer
  completedTitles?: string[]      // títulos ya completados por la clienta (para no repetir)
  confirmedTitles?: string[]      // títulos ya confirmados en el plan actual
}

const VALID_OBJECTIVES = [
  'educacion', 'autoridad', 'inspiracion', 'venta', 'deseo',
  'dolor', 'objecion', 'testimonio', 'caso_exito', 'viralidad',
]

/**
 * Prompt que pide a la IA ideas siguiendo el manual BRÄVE.
 * - Sin guion completo, solo el ángulo (hook_idea).
 * - Respeta el tono de la marca y los pilares ya definidos en la estrategia.
 * - Evita repetir títulos ya completados/confirmados.
 */
export function buildIdeasPrompt(input: IdeasInput): string {
  const completedBlock = (input.completedTitles?.length || 0) > 0
    ? `\n\nTítulos ya completados por la clienta (NO los repitas ni los reformules de forma demasiado parecida):\n${input.completedTitles!.map(t => `- ${t}`).join('\n')}`
    : ''
  const confirmedBlock = (input.confirmedTitles?.length || 0) > 0
    ? `\n\nTítulos ya confirmados en el plan actual (NO los repitas):\n${input.confirmedTitles!.map(t => `- ${t}`).join('\n')}`
    : ''

  return `Eres un estratega de contenido experto para salones de belleza y peluquería en España. Vas a proponer ${input.count} ideas de contenido para una estilista premium.

Contexto de la marca (USAR MI MARCA):
${input.brandContext}
${completedBlock}${confirmedBlock}

Reglas del manual BRÄVE:
- El gancho (hook_idea) está basado en dolor, error, falso mito, deseo u objeción — PROHIBIDO usar frases hechas como "No vas a creer esto", "El secreto mejor guardado", "Tienes que ver esto".
- Balancea los pilares de contenido definidos en la estrategia (no te centres solo en uno).
- TODAS las ideas deben ser de tipo "reel". NUNCA generes "carrusel" ni "story".
- Cada título debe ser concreto y específico del salón/servicio de esta estilista (no genérico).
- En hook_idea: 3 a 8 palabras, ángulo breve (no es el guion, solo el ángulo del gancho).

Devuelve EXACTAMENTE este JSON sin texto adicional:
{
  "ideas": [
    {
      "title": "título concreto de la pieza",
      "type": "reel",
      "pillar": "nombre del pilar (de los definidos en la estrategia)",
      "objective": "educacion" | "autoridad" | "inspiracion" | "venta" | "deseo" | "dolor" | "objecion" | "testimonio" | "caso_exito" | "viralidad",
      "service": "nombre del servicio",
      "hook_idea": "gancho breve de 3-8 palabras"
    }
  ]
}

Genera exactamente ${input.count} ideas. Todas en español.`
}

/**
 * Normaliza la salida cruda de la IA a IdeaItem[] válido (o null si no sirve).
 * Compartido por la generación server (team) y browser (sección Guiones).
 */
export function normaliseIdeasOutput(parsed: IdeasOutput | null, input: IdeasInput): IdeaItem[] | null {
  if (
    parsed &&
    Array.isArray(parsed.ideas) &&
    parsed.ideas.length > 0 &&
    parsed.ideas.every(it =>
      it &&
      typeof it.title === 'string' &&
      typeof it.hook_idea === 'string' &&
      it.type === 'reel' &&
      typeof it.pillar === 'string' &&
      typeof it.service === 'string'
    )
  ) {
    return parsed.ideas.map(it => ({
      title: it.title,
      type: 'reel' as IdeaType,
      pillar: it.pillar,
      objective: VALID_OBJECTIVES.includes(it.objective) ? it.objective : 'autoridad',
      service: it.service,
      hook_idea: it.hook_idea,
    }))
  }
  return null
}

/**
 * Mock determinista de fallback cuando la IA no está configurada o falla.
 * Genera `count` ideas rotando entre pilares y tipos.
 */
export function generateMockIdeas(input: IdeasInput): IdeaItem[] {
  const pillars = ['Autoridad', 'Educación', 'Inspiración', 'Transformación', 'Testimonio']
  const objectives = ['autoridad', 'educacion', 'inspiracion', 'caso_exito', 'testimonio'] as const
  const services = ['Balayage', 'Corte', 'Color', 'Keratina', 'Tratamiento']

  const templates: string[] = [
    'El error más común al lavar el pelo en casa',
    'Por qué tu rubio se vuelve naranja (y cómo evitarlo)',
    'Lo que analizamos antes de un balayage',
    'El antes y después que más me ha emocionado este mes',
    'Lo que nadie te explica sobre el keratina antes de hacerlo',
    'Mitos del color que están dañando tu pelo',
    'Tu rutina de cuidado en casa paso a paso',
    'Esta clienta dudaba — así quedó después',
    'Las 5 preguntas que debes hacer antes de reservar',
    'Tendencias de color 2026 que arrasan',
    'Cómo elijo el tono perfecto para tu piel',
    'Por qué un corte bien hecho dura más',
  ]

  const used = new Set([...(input.completedTitles || []), ...(input.confirmedTitles || [])])
  const ideas: IdeaItem[] = []
  let i = 0
  while (ideas.length < input.count && i < templates.length * 3) {
    const tpl = templates[i % templates.length]
    if (!used.has(tpl)) {
      ideas.push({
        title: tpl,
        type: 'reel' as IdeaType,
        pillar: pillars[i % pillars.length],
        objective: objectives[i % objectives.length],
        service: services[i % services.length],
        hook_idea: 'El error que repetías sin saberlo',
      })
    }
    i++
  }
  return ideas
}

/**
 * Versión BROWSER (sección Guiones): mismo patrón que generateReel —
 * fetch a /api/ai/generate y fallback mock local si no está configurada.
 */
export async function generateReelIdeas(input: IdeasInput): Promise<{ ideas: IdeaItem[]; mock: boolean }> {
  try {
    const raw = await generateAIContent(buildIdeasPrompt(input))
    const parsed = extractJSON<IdeasOutput>(raw)
    const ideas = normaliseIdeasOutput(parsed, input)
    if (ideas) return { ideas, mock: false }
    return { ideas: generateMockIdeas(input), mock: true }
  } catch {
    return { ideas: generateMockIdeas(input), mock: true }
  }
}