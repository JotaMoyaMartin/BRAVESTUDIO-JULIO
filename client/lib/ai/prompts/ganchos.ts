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
  /** Rotación del ángulo del desarrollo: guiones del mismo gancho distinto. */
  angleIndex?: number
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

/** Ángulos de desarrollo (se rotan por tanda para que 2 guiones del mismo
 *  gancho no sean gemelos — petición Jota 5-oct: "salen todos parecidos"). */
const SOLUTION_ANGLES: string[] = [
  'Una clienta concreta con una situación específica (inventada, sin datos reales): cómo llegó, qué le pasaba, qué hiciste y cómo terminó. La historia manda, la técnica entra de refilón.',
  'Tu método paso a paso CON DETALLES OPERATIVOS: qué haces primero, cuánto tarda, qué productos/procesos reales usas (matiz, porcentaje de oxidante, plancha, baño de agua, tiempo de pose...) y qué cambiarías si el caso fuera distinto. Todo dicho sin dar clase.',
  'El ERROR común que ves en otras casas o en internet — y qué haces tú al contrario. Contraste: "lo que se suele hacer" vs "lo que hago yo", con la consecuencia práctica de cada camino.',
  'Un ANTES y DESPUÉS narrado: cómo se va transformando el cabello a lo largo del proceso (semana a semana o fase a fase) y qué señal le indica a la clienta que va bien.',
  'Una CONVERSACIÓN REAL contada con sus palabras: lo que la clienta te preguntó o pidió (sin datos identificativos) y cómo se lo explicaste con una analogía del día a día.',
]

/** Elige el ángulo del desarrollo: la rotación determinística por tick evita
 *  guiones gemelos cuando se regenera o se piden varios del mismo gancho. */
function angleForTick(tick?: number): string {
  if (tick === undefined) return ''
  return `ÁNGULO DEL DESARROLLO (obligatorio este enfoque, distinto a otros guiones): ${SOLUTION_ANGLES[Math.abs(tick) % SOLUTION_ANGLES.length]}\n`
}

export function buildGanchoGuionPrompt(input: GanchoGuionInput): string {
  const meta = GANCHO_CATEGORY_META.find(c => c.id === input.categoryId)
  const pattern = meta?.pattern || ''
  const avoidBlock = (input.avoidHooks?.length || 0) > 0
    ? `\nEN ESTA TANDA YA HAS GENERADO GUIONES ARRANCANDO DE ESTOS GANCHOS (cambia el ángulo interno del desarrollo, no repitas sus frases):\n${input.avoidHooks!.map(h => `- ${h}`).join('\n')}\n`
    : ''

  return `Eres un experto en contenido para salones de belleza, con oído para las palabras que suenan a persona de verdad y NO a plantilla. Vas a escribir un guion de Reel a partir de UN GANCHO ya elegido por la estilista. El gancho es la PRIMERA LÍNEA del vídeo, literal o casi literal (puedes ajustar 1-2 palabras para que suene natural hablando).

CATEGORÍA: ${ganchoCategoryName(input.categoryId)}
${categoryRules(input.categoryId)}

GANCHO ELEGIDO POR LA ESTILISTA (respétalo como primer plano del vídeo):
"${input.gancho}"
Patrón de esta categoría para tu referencia: ${pattern}${input.brandContext ? `\nCONTEXTO DEL SALÓN (usa SIEMPRE sus servicios reales en los ejemplos y la voz de la estilista): ${input.brandContext}` : ''}${avoidBlock}${angleForTick(input.angleIndex)}

REGLAS ANTI-GENÉRICO (lo más importante, incumplir esto arruina el guion):
- CERO frases plantilla. PROHIBIDAS (y parecidas): "El secreto está en...", "el protocolo correcto...", "La confianza es la base", "No es solo un corte, es una experiencia", "cada cabello cuenta una historia", "Cuidamos cada detalle", "Resultados que hablan por sí solos".
- El desarrollo (solution) DEBE traer al menos 2 detalles CONCRETOS: cifras ("15 minutos", "2 sesiones", "porcentaje de oxidante"), pasos con nombre real de salón (matizado, porras, baño de color, porra, plancha, matiz, baño de aceite...) o una situación concreta con su minihistoria.
- Sonará a habla hablada: frases cortas, muletillas ocasionales ("mira", "te lo digo por experiencia"), segunda persona (tú). Sin aula, sin jerga científica.
- Nada de "muchas clientas me lo preguntan" si lo puedes sustituir por una escena concreta.

ESTRUCTURA OBLIGATORIA — sigue este orden exacto:

1. GANCHO (3-5 segundos): el gancho elegido, adaptado mínimamente para hablarlo.
2. CONTEXTO (5-10 segundos): una escena concreta e identificable (la clienta que se lo pregunta, el pelo que se ve). NO des la solución todavía.
3. DESARROLLO / SOLUCIÓN (20-30 segundos) — la parte MÁS IMPORTANTE:
   - Explica QUÉ haces, CÓMO lo haces y POR QUÉ queda así de bien.
   - Incluye AUTORIDAD O EJEMPLO con el ángulo indicado arriba (si no hay ángulo: elige tú el más natural): un caso, tu criterio o lo que haces distinto.
   - La clienta debe pensar: "Aquí saben lo que hacen."
4. CTA (3-5 segundos):
   - Conversacional: "Si estás pensando en este servicio, escríbeme y te ayudamos." / "Reserva tu diagnóstico y vemos tu caso."
   - PROHIBIDO: "Comenta COLOR", "Escribe INFO", "Sígueme para más" — nada de palabras clave.
${input.categoryId === 'narrativa' ? 'NOTA NARRATIVA: el guion suena a historia contada, no a anuncio. El CTA debe ser suave (puede invitar a opinar a la clienta o a venir a verlo).' : ''}

PRINCIPIOS BRÄVE: no vendemos servicios, vendemos confianza. Toda pieza aumenta autoridad, confianza y valor percibido.

Duración total: 35-45 segundos hablando natural.

Devuelve EXACTAMENTE este JSON sin texto adicional:
{
  "title": "Título corto y atractivo, con palabras distintas a las del gancho",
  "coverText": "Texto de portada (máx 8 palabras, impactante)",
  "script": {
    "hook": "Gancho hablado (1-2 frases)",
    "context": "Contexto: escena concreta (2-3 frases)",
    "solution": "Desarrollo/solución con QUÉ, CÓMO, POR QUÉ + autoridad o ejemplo, con al menos 2 detalles concretos (4-6 frases)",
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
    const prompt = buildGanchoGuionPrompt({ ...input, angleIndex: input.angleIndex ?? opts?.seed })
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
${input.brandContext ? `SERVICIOS Y CONTEXTO DEL SALÓN (cada versión debe apoyarse en uno distinto): ${input.brandContext}` : ''}

Escribe 3 NUEVAS versiones de ese gancho:
- Mismo patrón, misma intención y emoción, PERO cada una cambia el TEMA: versión 1 sobre color/queratina/liso, versión 2 sobre corte/estilo de pelo, versión 3 sobre cuidado/mantenimiento (o tres situaciones de clienta distintas: la que lo dejó para tarde, la que se lo hizo en casa, la que viene con el pelo maltratado).
- Mencionan algo concreto del servicio (el problema específico o el momento), no frases huecas.
- Frases que suenen natural hablando a cámara; máximo 14 palabras cada una.
- Nada de clichés de IA ("no vas a creer esto", "el secreto mejor guardado", "la verdad sobre...").

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