// Generador del Banco de Ganchos (sección /banco-ganchos):
//   1. Guion completo a partir de UN gancho del banco de Jota —
//      estructura Gancho → Contexto → Desarrollo/Solución → Autoridad/ejemplo → CTA.
//   2. Variaciones del gancho: el gancho es un PATRÓN y la IA lo reescribe
//      para el servicio del salón (cientos de variantes sin repetirse).
//
// Reutiliza el cliente canónico (callLLM vía /api/ai/generate) y el extractor
// extractJSON — NO crea cliente ni extractor nuevos (regla CLAUDE.md §8).

import { generateAIContent, extractJSON } from '../client'
import { ReelOutput } from './reels'
import { GanchoCategoryId, ganchoCategoryName } from '@/lib/ganchos'
import { GANCHO_CATEGORY_META } from '@/lib/ganchos'

/** El guion generado usa la MISMA forma que el de Guiones → se guarda igual en
 *  biblioteca, se abre igual en Teleprompter y se edita igual en el editor. */
export type GanchoGuionOutput = ReelOutput

export interface GanchoGuionInput {
  gancho: string
  categoryId: GanchoCategoryId
  brandContext?: string
  /** Ganchos de guiones ya generados — la variación nueva no parte igual. */
  avoidHooks?: string[]
}

function categoryRules(categoryId: GanchoCategoryId): string {
  switch (categoryId) {
    case 'instantaneos':
      return 'Categoría INSTANTÁNEA: el objetivo es detener el scroll en 2 segundos. El gancho es un problema directo y personal ("Si te pasa X, probablemente haces Y"). El contexto debe hacer que la clienta se vea reflejada en el problema. La solución muestra cómo lo afronta una profesional sin tecnicismos innecesarios.'
    case 'consejos':
      return 'Categoría CONSEJOS/HACKS: el objetivo son GUARDADOS y compartidos. El gancho promete valor práctico (trucos, listas, fórmulas). La solución entrega exactamente lo prometido, en pasos concretos y aplicables en casa, y remata con el toque profesional que marca la diferencia sin convertirlo en clase magistral.'
    case 'principiantes':
      return 'Categoría EDUCATIVA PASO A PASO: el objetivo es ENSEÑAR y construir autoridad. El gancho simplifica algo que parece complejo. La solución explica Paso 1, Paso 2 (…): claro, ordenado, sin tecnicismos, mostrando criterio profesional. La clienta debe terminar pensando que esto solo lo sabe hacer bien quien se forma.'
    case 'narrativa':
      return 'Categoría NARRATIVA Y MENTALIDAD: el objetivo es CONEXIÓN y confianza. El gancho abre una historia personal. Aquí el "desarrollo" no es un tutorial: es una historia real (sin datos identificativos) con un aprendizaje concreto. Suena a confesión de la estilista en primera persona; el aprendizaje demuestra autoridad sin presumir.'
  }
}

export function buildGanchoGuionPrompt(input: GanchoGuionInput): string {
  const meta = GANCHO_CATEGORY_META.find(c => c.id === input.categoryId)
  const pattern = meta?.pattern || ''
  const avoidBlock = (input.avoidHooks?.length || 0) > 0
    ? `\nEN ESTA TANDA YA HAS GENERADO GUIONES ARRANCANDO DE ESTOS GANCHOS (cambia el ángulo interno del desarrollo, no repitas sus frases):\n${input.avoidHooks!.map(h => `- ${h}`).join('\n')}\n`
    : ''

  return `Eres un experto en contenido para salones de belleza. Vas a escribir un guion de Reel a partir de UN GANCHO ya elegido por la estilista. El gancho es la PRIMERA LÍNEA del vídeo, literal o casi literal (puedes ajustar 1-2 palabras para que suene natural hablando).

CATEGORÍA: ${ganchoCategoryName(input.categoryId)}
${categoryRules(input.categoryId)}

GANCHO ELEGIDO POR LA ESTILISTA (respétalo como primer plano del vídeo):
"${input.gancho}"
Patrón de esta categoría para tu referencia: ${pattern}${input.brandContext ? `\nCONTEXTO DEL SALÓN (personaliza servicios, voz y ejemplos con esto cuando aporte): ${input.brandContext}` : ''}${avoidBlock}

ESTRUCTURA OBLIGATORIA — sigue este orden exacto:

1. GANCHO (3-5 segundos): el gancho elegido, adaptado mínimamente para hablarlo.
2. CONTEXTO (5-10 segundos): identificación. La clienta debe verse reflejada en el problema o la situación. NO des la solución todavía.
3. DESARROLLO / SOLUCIÓN (20-30 segundos) — la parte MÁS IMPORTANTE:
   - Explica QUÉ haces, CÓMO lo haces y POR QUÉ queda así de bien.
   - Incluye AUTORIDAD O EJEMPLO: un caso real sin datos identificativos, tu criterio profesional o lo que haces distinto a lo habitual.
   - La clienta debe pensar: "Aquí saben lo que hacen."
4. CTA (3-5 segundos):
   - Conversacional: "Si estás pensando en este servicio, escríbeme y te ayudamos." / "Reserva tu diagnóstico y vemos tu caso."
   - PROHIBIDO: "Comenta COLOR", "Escribe INFO", "Sígueme para más" — nada de palabras clave.
${input.categoryId === 'narrativa' ? 'NOTA NARRATIVA: el guion suena a historia contada, no a anuncio. El CTA debe ser suave (puede invitar a opinar a la clienta o a venir a verlo).' : ''}

PRINCIPIOS BRÄVE: no vendemos servicios, vendemos confianza. Toda pieza aumenta autoridad, confianza y valor percibido.

Duración total: 35-45 segundos hablando natural.

Devuelve EXACTAMENTE este JSON sin texto adicional:
{
  "title": "Título corto y atractivo",
  "coverText": "Texto de portada (máx 8 palabras, impactante)",
  "script": {
    "hook": "Gancho hablado (1-2 frases)",
    "context": "Contexto (2-3 frases)",
    "solution": "Desarrollo/solución con QUÉ, CÓMO, POR QUÉ + autoridad o ejemplo (4-6 frases)",
    "cta": "CTA conversacional (1 frase)"
  },
  "visualIdea": "Idea visual natural para grabar (1-2 frases)",
  "captionWithHashtags": "Copy para Instagram de 4-6 líneas: primera línea = gancho que pare el scroll, después 2-3 frases desarrollando el valor (como lo escribiría una experta), y CTA conversacional final + 5 hashtags del sector belleza en español"
}`
}

const REGEN_VARIANTS = [
  { titleFn: (t: string) => t.toUpperCase().slice(0, 60), coverFn: () => 'Lo que nadie te explica' },
  { titleFn: (t: string) => `La verdad sobre: ${t.slice(0, 48)}`, coverFn: () => 'Esto te va a ahorrar disgustos' },
  { titleFn: (t: string) => `${t.slice(0, 52)} — hablo claro`, coverFn: () => 'Guárdalo para tu próxima cita' },
]

/** Fallback determinístico si la IA no está disponible — la app siempre
 *  muestra un guion válido (marcado como "ejemplo"). */
export function getMockGanchoGuion(input: GanchoGuionInput, tick = 0): GanchoGuionOutput {
  const v = REGEN_VARIANTS[Math.abs(tick) % REGEN_VARIANTS.length]
  const cat = input.categoryId
  const solutionByCat: Record<GanchoCategoryId, string> = {
    instantaneos: `${input.gancho} Lo comento aquí arriba: antes de tocar el cabello hago un diagnóstico. Analizo el estado de la fibra, el historial químico y lo que realmente necesita. Cada cabello tiene límites distintos, y por eso mi resultado dura y el de otras experiencias no.`,
    consejos: `${input.gancho} Lo aplico así: primero lo básico con criterio, luego el detalle que marca la diferencia. En mi salón esta rutina la combinamos con productos que de verdad hacen falta (no milagros). Ese equilibrio entre lo que hago yo y lo que cuidas en casa es lo que mantiene el resultado.`,
    principiantes: `${input.gancho} Paso 1: analizar tu tipo de cabello. Paso 2: elegir el proceso adecuado a ese análisis. Paso 3: el mantenimiento real para casa. Es sencillo si el orden es correcto — y por eso este trabajo bien hecho solo se consigue con criterio profesional.`,
    narrativa: `${input.gancho} Me lo enseñó una clienta: no se trata de convencer, se trata de asesorar bien. Desde entonces trabajo distinto — el diagnóstico antes que el brillo, el cabello antes que la tendencia.`,
  }
  const ctaByCat: Record<GanchoCategoryId, string> = {
    instantaneos: 'Si esto te suena, escríbeme y te ayudo a ponerle solución.',
    consejos: 'Si quieres una rutina hecha a tu medida, escríbeme y la vemos contigo.',
    principiantes: 'Si te interesa hacerlo bien desde el principio, reserva tu diagnóstico y empezamos.',
    narrativa: 'Si quieres una opinión honesta sobre tu cabello, escríbeme sin compromiso.',
  }
  return {
    title: v.titleFn(input.gancho[0].toUpperCase() + input.gancho.slice(1, 56)),
    coverText: v.coverFn(),
    script: {
      hook: input.gancho,
      context: cat === 'narrativa'
        ? 'Aviso: esto no lo suelo contar, pero creo que puede ayudarte si estás detrás del sillón o en el sillón.'
        : 'Si te está pasando, no te pasa solo a ti: cada semana llegan clientas al salón con exactamente esto.',
      solution: solutionByCat[cat],
      cta: ctaByCat[cat],
    },
    visualIdea: 'Grábate hablando a cámara en el salón, con luz natural; puedes mostrar el proceso o un antes/después rápido.',
    captionWithHashtags: `${input.gancho}\n\nTe cuento lo que hace la diferencia: diagnóstico, proceso correcto y mantenimiento real. Así el resultado dura y tu cabello lo agradece.\n\nSi tienes dudas, escríbeme y te asesoro sin compromiso. ✨\n\n#estilista #salonbelleza #cabellosano #consejosbelleza #cabelloprofesional`,
  }
}

export async function generateGanchoGuionChecked(
  input: GanchoGuionInput,
  opts?: { seed?: number }
): Promise<{ reel: GanchoGuionOutput; mock: boolean }> {
  try {
    const prompt = buildGanchoGuionPrompt(input)
    const raw = await generateAIContent(prompt)
    const parsed = extractJSON<GanchoGuionOutput>(raw)
    if (
      parsed &&
      typeof parsed.title === 'string' &&
      typeof parsed.coverText === 'string' &&
      parsed.script &&
      typeof parsed.script.hook === 'string' &&
      typeof parsed.script.context === 'string' &&
      typeof parsed.script.solution === 'string' &&
      typeof parsed.script.cta === 'string' &&
      typeof parsed.visualIdea === 'string' &&
      typeof parsed.captionWithHashtags === 'string'
    ) {
      return { reel: parsed, mock: false }
    }
  } catch {
    // fall through to mock
  }
  return { reel: getMockGanchoGuion(input, opts?.seed || 0), mock: true }
}

// ─── Variaciones del gancho (el gancho como patrón, no como frase fija) ───

export interface GanchoVariationInput {
  gancho: string
  categoryId: GanchoCategoryId
  brandContext?: string
}

export function buildGanchoVariationsPrompt(input: GanchoVariationInput): string {
  const meta = GANCHO_CATEGORY_META.find(c => c.id === input.categoryId)
  return `Eres un guionista de contenido para salones de belleza. ESTAS FRASES SON PATRONES, NO FRASES FIJAS.

Patrón de la categoría (${ganchoCategoryName(input.categoryId)}): ${meta?.pattern || ''}
Gancho original:
"${input.gancho}"
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

Escribe 3 NUEVAS versiones de ese gancho:
- Mismo patrón, mismas intención y emoción, PERO distinto tema, servicio o ángulo (no reordenar las palabras del original).
- Frases que suenen natural hablando a cámara; máximo 14 palabras cada una.
- Nada de clichés de IA ("no vas a creer esto", "el secreto mejor guardado"...).

Devuelve EXACTAMENTE este JSON sin texto adicional:
{
  "variants": ["versión 1", "versión 2", "versión 3"]
}`
}

/** Fallback simple por si la IA no responde: envoltorios honestos sobre el original. */
export function getMockGanchoVariations(input: GanchoVariationInput): string[] {
  const g = input.gancho.replace(/"/g, '')
  switch (input.categoryId) {
    case 'instantaneos':
      return [`Ojo: ${g}`, `${g} Y casi todas lo están haciendo mal.`, `La mayoría no sabe esto: ${g}`]
    case 'consejos':
      return [`${g} Te lo enseño en 20 segundos.`, `${g} El punto 2 es el que más se pasa por alto.`, `${g} Guárdalo que lo vas a usar esta semana.`]
    case 'principiantes':
      return [`${g} Empezando por lo básico, sin lios.`, `${g} Y funciona igual para tu tipo de pelo.`, `${g} Paso a paso, sin nada raro.`]
    case 'narrativa':
      return [`${g} Me tocó vivirla hace poco.`, `${g} Y me cambió la manera de trabajar.`, `${g} Spoiler: me lo enseñó una clienta.`]
  }
}

export async function generateGanchoVariations(input: GanchoVariationInput): Promise<{ variants: string[]; mock: boolean }> {
  try {
    const raw = await generateAIContent(buildGanchoVariationsPrompt(input))
    const parsed = extractJSON<{ variants: string[] }>(raw)
    const variants = (parsed?.variants || [])
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 8)
      .map(v => v.trim())
    if (variants.length >= 3) {
      return { variants: variants.slice(0, 3), mock: false }
    }
    if (variants.length > 0) {
      // Completar con mock si la IA devolvió menos de 3.
      return { variants: [...variants, ...getMockGanchoVariations(input).slice(0, 3 - variants.length)], mock: false }
    }
  } catch {
    // fall through to mock
  }
  return { variants: getMockGanchoVariations(input), mock: true }
}