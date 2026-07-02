import { generateAIContent, extractJSON } from '../client'

export interface StoryInput {
  service: string
  count: 1 | 2 | 3
  mode: 'text' | 'camera'
  detail?: string
  brandContext?: string
}

export interface SingleStory {
  number: number
  role: string
  text: string
  stickerSuggestion: string
  visualIdea: string
}

export interface StoriesOutput {
  stories: SingleStory[]
}

export interface QuestionBoxOutput {
  questions: string[]
}

export function buildStoriesPrompt(input: StoryInput): string {
  return `Eres un experto en Stories de Instagram para salones de belleza. Crea ${input.count} Story(ies) siguiendo EXACTAMENTE el manual oficial BRÄVE Content.

SERVICIO REALIZADO: ${input.service}
${input.detail ? `DETALLE ADICIONAL: ${input.detail}` : ''}
MODO: ${input.mode === 'camera' ? 'Guion para grabar a cámara (conversacional)' : 'Texto para copiar y pegar'}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

METODOLOGÍA OBLIGATORIA:
- Story 1: PROBLEMA/IDENTIFICACIÓN - Conseguir atención. Usar problema real, frase de clienta, duda frecuente o curiosidad.
- Story 2 (si aplica): AUTORIDAD - La estilista demuestra su criterio profesional. Explica qué detectó, analizó y decidió. Debe explicar QUÉ haces, CÓMO lo haces y POR QUÉ lo haces.
- Story 3 (si aplica): RESULTADO + ACCIÓN - Muestra el beneficio final + CTA conversacional.

CTA: NUNCA dependas de palabras clave ni automatizaciones.
CTAs válidos: "Si estás pensando en hacerte este servicio, escríbeme y te ayudo." / "Reserva tu diagnóstico y analizamos tu caso." / "Si tienes dudas, escríbeme y te asesoramos."
PROHIBIDO: "Escribe RUBIO", "Comenta BALAYAGE", "Escribe INFO", o cualquier CTA basado en palabras clave.

IMPORTANTE: No construyas la historia alrededor del servicio. Constrúyela alrededor de la clienta.
Las ideas visuales deben ser NATURALES: selfie, espejo, resultado en movimiento, mano tocando cabello, etc.

PRINCIPIOS BRÄVE: No vendemos servicios, vendemos confianza. No vendemos color, vendemos seguridad. El proceso vende. El resultado atrae. El proceso convence.

Devuelve EXACTAMENTE este JSON:
{
  "stories": [
    {
      "number": 1,
      "role": "Problema/Identificación",
      "text": "Texto de la story",
      "stickerSuggestion": "Sticker recomendado (encuesta, pregunta, emoji, etc.)",
      "visualIdea": "Idea visual natural"
    }
  ]
}`
}

export function getMockStories(input: StoryInput): StoriesOutput {
  const storyTemplates: SingleStory[] = [
    {
      number: 1,
      role: 'Problema / Identificación',
      text: input.mode === 'camera'
        ? `¿Llevas tiempo queriendo hacerte un ${input.service} pero no sabes si es para ti? Hoy quiero contarte algo que puede cambiarte la idea completamente.`
        : `¿Tu ${input.service} no está durandote lo que debería? Puede que no sea culpa del producto. 👇`,
      stickerSuggestion: 'Encuesta: "¿Has pensado en hacerte un ' + input.service + '?" Sí / No sé',
      visualIdea: 'Selfie natural en el salón o mirando a cámara con buena luz',
    },
    {
      number: 2,
      role: 'Autoridad',
      text: input.mode === 'camera'
        ? `Cuando esta clienta vino, lo primero que hice fue analizar su cabello. No empecé con el producto. Empecé por entender qué necesitaba realmente. Y eso lo cambia todo.`
        : `Antes de empezar cualquier ${input.service}, siempre analizo el estado del cabello, la historia de tratamientos y el resultado que la clienta quiere conseguir. Cada persona necesita una solución diferente.`,
      stickerSuggestion: 'Emoji de diamante o estrella para destacar el valor',
      visualIdea: 'Vídeo o foto del proceso de trabajo, lavacabezas, o manos trabajando el cabello',
    },
    {
      number: 3,
      role: 'Resultado + Acción',
      text: input.mode === 'camera'
        ? `El resultado habla solo. Más brillo, más movimiento, más natural. Si llevas tiempo pensando en hacerte algo así, escríbeme. Cuéntame qué quieres y vemos qué opción encaja contigo.`
        : `Más luz. Más naturalidad. Menos mantenimiento. ✨ Si quieres algo así, escríbeme y te cuento cómo podemos conseguirlo.`,
      stickerSuggestion: 'Caja de preguntas: "¿Qué quieres mejorar de tu cabello?"',
      visualIdea: 'Foto o vídeo del resultado final. Movimiento del cabello. Clienta feliz (de espaldas o de espaldas).',
    },
  ]

  return {
    stories: storyTemplates.slice(0, input.count),
  }
}

export function getMockQuestions(topic: string): QuestionBoxOutput {
  const questionMap: Record<string, string[]> = {
    rubios: [
      '¿Por qué mi rubio se vuelve amarillo tan rápido?',
      '¿Cada cuánto tiempo necesito retocar mi rubio?',
      '¿Qué champú debo usar para mantener mi rubio bonito?',
      '¿Es verdad que el rubio daña mucho el cabello?',
      '¿Puedo pasar de oscuro a rubio en una sola sesión?',
      '¿Cómo puedo mantener mi rubio bonito en verano?',
      '¿Qué diferencia hay entre balayage y mechas?',
      '¿Cada cuánto debo usar la mascarilla matizadora?',
      '¿Por qué mi rubio pierde brillo tan rápido?',
      '¿Qué puedo hacer si mi rubio queda con tono verdoso?',
    ],
    balayage: [
      '¿Qué es exactamente el balayage?',
      '¿Cuánto dura un balayage normalmente?',
      '¿El balayage funciona para todos los tipos de cabello?',
      '¿Cuánto tiempo tarda en hacerse un balayage?',
      '¿Necesito mucho mantenimiento con el balayage?',
      '¿Puedo hacerme balayage si tengo el cabello muy oscuro?',
      '¿Cómo cuido el balayage en casa?',
      '¿El balayage daña mucho el cabello?',
      '¿Con qué frecuencia debo retocarlo?',
      '¿Qué productos me recomiendas para el balayage?',
    ],
    default: [
      '¿Cada cuánto debería cortarme las puntas?',
      '¿Es necesario usar protector térmico siempre?',
      '¿Cómo sé si mi cabello necesita hidratación o proteína?',
      '¿Por qué se me abre el cabello aunque lo cuide?',
      '¿Qué rutina recomiendas para cabello teñido?',
      '¿Cada cuánto debería hacerme un tratamiento?',
      '¿Por qué mi color dura tan poco?',
      '¿Qué puedo hacer si mi cabello se rompe mucho?',
      '¿Cómo evito el encrespamiento en días de humedad?',
      '¿Qué champú es mejor para mi tipo de cabello?',
      '¿Puedo teñir el cabello si está muy dañado?',
      '¿Cuándo es el momento de hacer un cambio de look?',
      '¿Cómo cuido el cabello en verano?',
      '¿Por qué el cabello pierde brillo con el tiempo?',
      '¿Qué diferencia hay entre hidratación y nutrición?',
    ],
  }

  const key = topic.toLowerCase()
  const questions = questionMap[key] || questionMap.default

  return { questions }
}

/** LLM-backed Stories generation with mock fallback. */
export async function generateStories(input: StoryInput): Promise<StoriesOutput> {
  try {
    const raw = await generateAIContent(buildStoriesPrompt(input))
    const parsed = extractJSON<StoriesOutput>(raw)
    if (
      parsed &&
      Array.isArray(parsed.stories) &&
      parsed.stories.length > 0 &&
      parsed.stories.every(
        s =>
          s &&
          typeof s.number === 'number' &&
          typeof s.role === 'string' &&
          typeof s.text === 'string' &&
          typeof s.stickerSuggestion === 'string' &&
          typeof s.visualIdea === 'string'
      )
    ) {
      return parsed
    }
  } catch {
    // fall through to mock
  }
  return getMockStories(input)
}

// ── Question Box ───────────────────────────────────────────────────

export function buildQuestionsPrompt(input: { topic: string; brandContext?: string }): string {
  return `Eres un experto en contenido para salones de belleza en Instagram. Genera preguntas naturales que las clientas hacen frecuentemente sobre el tema indicado.

TEMA: ${input.topic}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

Devuelve 8-10 preguntas reales que las clientas se hacen sobre este tema. Las preguntas deben sonar naturales, como algo que una clienta escribiría en un DM o preguntaría en persona. Evita preguntas demasiado técnicas.

Devuelve EXACTAMENTE este JSON:
{
  "questions": [
    "¿Pregunta 1?",
    "¿Pregunta 2?",
    ...
  ]
}`
}

export function buildAnswerPrompt(input: {
  question: string
  mode: 'written' | 'camera'
  brandContext?: string
}): string {
  const modeInstruction =
    input.mode === 'written'
      ? `FORMATO: Texto para copiar y pegar en Instagram (Story o caption). Usa emojis con naturalidad, tono conversacional cercano, máximo 3-4 líneas. Incluye un CTA suave al final como "escríbeme y te asesoro" o "cuéntame en DM".`
      : `FORMATO: Guion para grabar hablando a cámara. Puntos clave en lenguaje hablado, natural, cercano. Máximo 4-5 puntos breves que la estilista pueda decir mirando a la cámara. Incluye apertura gancho + desarrollo + cierre con CTA.`

  return `Eres una estilista experta respondiendo una pregunta de clienta para una Story de Instagram.

PREGUNTA DE LA CLIENTA: ${input.question}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

${modeInstruction}

Responde directamente, como si le estuvieras hablando a la clienta. No digas "como estilista" ni introduzcas la respuesta. Ve al grano.`
}

/** LLM-backed question generation with mock fallback. */
export async function generateQuestions(input: {
  topic: string
  brandContext?: string
}): Promise<QuestionBoxOutput> {
  try {
    const raw = await generateAIContent(buildQuestionsPrompt(input))
    const parsed = extractJSON<QuestionBoxOutput>(raw)
    if (
      parsed &&
      Array.isArray(parsed.questions) &&
      parsed.questions.length > 0 &&
      parsed.questions.every(q => typeof q === 'string' && q.trim().length > 0)
    ) {
      return parsed
    }
  } catch {
    // fall through to mock
  }
  return getMockQuestions(input.topic)
}

/** LLM-backed answer generation with mock fallback. */
export async function generateQuestionAnswer(input: {
  question: string
  mode: 'written' | 'camera'
  brandContext?: string
}): Promise<string> {
  try {
    const raw = await generateAIContent(buildAnswerPrompt(input))
    if (raw && raw.trim().length > 0) {
      return raw.trim()
    }
  } catch {
    // fall through to mock
  }
  return getMockAnswer(input.question, input.mode)
}

function getMockAnswer(question: string, mode: 'written' | 'camera'): string {
  const cleanQ = question.replace(/^¿/, '').replace(/\?$/, '')
  if (mode === 'written') {
    return `Buena pregunta. ${cleanQ} es algo que me preguntan mucho en el salón. 💕 La clave está en entender tu tipo de cabello y sus necesidades específicas. En mi salón siempre hago un diagnóstico previo para darte la recomendación más adecuada para ti. Si quieres que hablemos sobre tu caso concreto, escríbeme. 💌`
  }
  return `Punto 1: "Me preguntan mucho esto y quiero contarte algo importante."\nPunto 2: "Cada cabello es diferente. Lo que funciona para una clienta puede no funcionar para otra."\nPunto 3: "Por eso siempre hago un diagnóstico antes de recomendar cualquier tratamiento."\nPunto 4: "Si tienes esta duda, escríbeme por DM y vemos tu caso concreto. 💕"`
}
