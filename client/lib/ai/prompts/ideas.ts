/**
 * Ideas para el Plan de Contenidos estratégico de clientas premium (SERVER).
 *
 * Flujo:
 *   1. La CM/admin en el Modo Equipo pulsa "Generar ideas con IA".
 *   2. El route handler /team/api/estrategia/ideas/generate llama a `generateIdeas`
 *      con el brand context de la clienta (de `brand_profiles.strategy_json`) y los
 *      títulos ya completados (para no repetir).
 *   3. La IA devuelve `count` ideas con título, tipo, pilar, objetivo, servicio y hook.
 *   4. El handler las inserta en `content_ideas` con status='propuesta'.
 *
 * La parte pura (tipos, prompt, mock, normalización) y la versión BROWSER
 * (sección Guiones) viven en `./idea-specs` — este módulo solo añade la
 * generación server-side.
 */
import { serverGenerateAIContent } from '../server-generate'
import { extractJSON } from '../extract'
import { IdeaItem, IdeasInput, IdeasOutput, buildIdeasPrompt, generateMockIdeas, normaliseIdeasOutput } from './idea-specs'

export type { IdeaItem, IdeaType, IdeasInput, IdeasOutput } from './idea-specs'
export { buildIdeasPrompt, generateMockIdeas, normaliseIdeasOutput } from './idea-specs'

/** Genera ideas llamando a la IA server-side; mock si no está configurada o falla. */
export async function generateIdeas(input: IdeasInput): Promise<{ ideas: IdeaItem[]; mock: boolean }> {
  try {
    const raw = await serverGenerateAIContent(buildIdeasPrompt(input))
    const parsed = extractJSON<IdeasOutput>(raw)
    const ideas = normaliseIdeasOutput(parsed, input)
    if (ideas) return { ideas, mock: false }
    return { ideas: generateMockIdeas(input), mock: true }
  } catch {
    return { ideas: generateMockIdeas(input), mock: true }
  }
}