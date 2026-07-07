import { serviceLabel } from './reels'
import { generateAIContent, extractJSON } from '../client'

export interface PlannerInput {
  duration: '1week' | '1month'
  postsPerWeek: 2 | 3 | 4 | 5
  format: 'reels' | 'carrusels' | 'mixed'
  objective: 'autoridad' | 'reservas' | 'visibilidad'
  services: string[]
  freeText?: string
  startDate?: string
  brandContext?: string
}

export interface PlannerItem {
  id: string
  type: 'reel' | 'carrusel'
  title: string
  service: string
  objective: string
  suggestedDay: string
  suggestedDate?: string
  hookIdea: string
  format: string
}

export interface PlannerOutput {
  items: PlannerItem[]
  summary: string
}

const DEFAULT_DAYS: Record<number, string[]> = {
  2: ['Martes', 'Jueves'],
  3: ['Martes', 'Jueves', 'Domingo'],
  4: ['Martes', 'Miércoles', 'Jueves', 'Domingo'],
  5: ['Martes', 'Miércoles', 'Jueves', 'Sábado', 'Domingo'],
}

// 10 unique templates per type per objective — enough for any plan without repeats
const REEL_TEMPLATES: Record<string, string[]> = {
  autoridad: [
    'El error más común con [EL] (y cómo evitarlo)',
    'La verdad sobre [EL] que ninguna estilista te cuenta',
    'Por qué [EL] no [DURA] lo suficiente',
    'Lo que analizo antes de hacer [EL]',
    'Mi diagnóstico cuando alguien llega con [EL] dañado',
    'Lo que nadie te explica sobre [EL] antes de hacértelo',
    'Esto es lo que marca la diferencia en [EL]',
    'Por qué [EL] no [QUEDA] como en las fotos',
    'El protocolo que uso siempre antes de hacer [EL]',
    'Lo que cambió cuando empecé a hacer [EL] de esta manera',
  ],
  reservas: [
    'Esta clienta llegó con [EL] en mal estado — mira lo que pasó después',
    'Así quedó [EL] de esta clienta que llevaba meses esperando',
    'Transformación completa: de [EL] dañado a resultados increíbles',
    'Por qué esta clienta lleva años confiando en mí para [EL]',
    '"No pensé que pudiera quedarme así de bien" — esto pasó con [EL]',
    'Cuando [EL] se hace bien, el resultado habla solo',
    'Esta clienta dudaba. Después de hacerse [EL], ya no duda.',
    'Así se ve [EL] cuando se hace con el proceso correcto',
    'El antes y después de [EL] que más me ha emocionado este mes',
    'Le propuse [UN] diferente y así quedó — el resultado lo dice todo',
  ],
  visibilidad: [
    'Las tendencias de [EL] que arrasan este año',
    'Todo lo que la gente pregunta sobre [EL]',
    'Cosas sobre [EL] que probablemente no sabías',
    '¿Cuánto [DURA] realmente [EL]? La respuesta te sorprende',
    'Si estás pensando en hacerte [UN], esto te interesa',
    '¿[EL] o no? Esto te ayudará a decidir',
    'Preguntas frecuentes sobre [EL] — las respondo todas',
    'Lo que deberías saber sobre [EL] antes de reservar cita',
    '5 cosas que debes preguntar antes de hacerte [UN]',
    'Guarda este vídeo si estás pensando en hacerte [UN]',
  ],
}

const CAROUSEL_TEMPLATES: Record<string, string[]> = {
  autoridad: [
    '5 señales de que necesitas [UN] profesional',
    'Todo lo que debes saber antes de hacerte [UN]',
    'Mitos y verdades sobre [EL]',
    '3 errores que arruinan el resultado de [EL]',
    'Guía completa de cuidado de [EL]',
    'Lo que diferencia [UN] bien hecho de uno mediocre',
    'El proceso paso a paso de [EL] en mi salón',
    'Preguntas que deberías hacerle a tu estilista sobre [EL]',
    'Por qué [EL] no siempre [QUEDA] igual (y qué hacer al respecto)',
    'Cómo mantener [EL] en casa para que [DURA] más',
  ],
  reservas: [
    'Antes y después: transformación real con [EL]',
    '¿Es esto lo que buscas con [EL]?',
    'Resultados reales de [EL] en mi salón',
    '¿Por qué mis clientas eligen hacerse [EL] conmigo?',
    'El proceso completo de [EL]: de principio a fin',
    'Lo que consigues cuando [EL] se hace bien',
    'Estas clientas ya se hicieron [UN] — sus resultados',
    'Así luce [EL] cuando el diagnóstico es correcto',
    '¿Llevas tiempo pensando en [EL]? Esto te convencerá',
    'Reserva cita para [EL]: esto es lo que te espera',
  ],
  visibilidad: [
    'Tipos de [EL]: ¿cuál es el tuyo?',
    '[EL] según tu tipo de cabello',
    'Guarda este post: todo sobre [EL]',
    '¿Te haces [EL] o no? Te ayudo a decidir',
    'Lo que más me preguntan sobre [EL]',
    'El glosario de [EL] que nadie te había explicado',
    'Tendencias de [EL] que verás en todos los feeds este año',
    'Inspírate: ideas de [EL] para este mes',
    '[EL] para cada tipo de cabello — guía práctica',
    '¿Cuánto cuesta realmente [EL]? Todo lo que incluye',
  ],
}

// Templates for free-text custom topics (not known services).
// Use [T] as a raw topic insertion — no articles needed.
const CUSTOM_REEL_TEMPLATES: Record<string, string[]> = {
  autoridad: [
    'Lo que las estilistas saben sobre [T] y nadie te ha contado',
    'El error más común cuando hablamos de [T]',
    'Mi opinión profesional sobre [T] — sin filtros',
    'Lo que deberías saber sobre [T] antes de tu próxima cita',
    'Desmontando mitos sobre [T]',
    'Por qué [T] importa más de lo que crees',
    'Esto es lo que hago cuando una clienta me pregunta por [T]',
    'La verdad sobre [T] que nadie quiere decirte',
    '¿[T]? Esto es lo que te recomendaría yo',
    'Lo que cambió en mi salón cuando empecé a hablar de [T]',
  ],
  reservas: [
    'Esta clienta llegó con dudas sobre [T] — mira cómo terminó',
    'Así ayudo a mis clientas que tienen preguntas sobre [T]',
    'Cuando una clienta me habla de [T], esto es lo que hago',
    'Transformación real: una clienta que vino por [T]',
    'Por qué mis clientas confían en mí cuando hablamos de [T]',
    'Lo que pasa cuando se aborda [T] desde el principio',
    'Una clienta me preguntó por [T] y esto fue lo que le dije',
    'Así se ve el resultado cuando se trata bien [T]',
    'El antes y el después de entender [T] correctamente',
    'Esto es lo que consigues cuando trabajamos [T] juntas',
  ],
  visibilidad: [
    '¿Qué es exactamente [T]? Te lo explico en 60 segundos',
    'Todo lo que me preguntan sobre [T]',
    '5 cosas que no sabías sobre [T]',
    '[T]: lo que deberías preguntar antes de reservar cita',
    'Guarda este vídeo si tienes dudas sobre [T]',
    'Lo que nadie te cuenta sobre [T]',
    '¿[T] sí o no? Te ayudo a decidir',
    'Preguntas frecuentes sobre [T] — las respondo todas',
    'Por qué cada vez se habla más de [T] en el mundo de la peluquería',
    'Todo lo que necesitas saber sobre [T] en menos de un minuto',
  ],
}

const CUSTOM_CAROUSEL_TEMPLATES: Record<string, string[]> = {
  autoridad: [
    '5 cosas que debes saber sobre [T]',
    'Mitos y verdades sobre [T]',
    'Guía completa sobre [T] para clientas',
    'Lo que diferencia un buen resultado con [T] de uno mediocre',
    '3 errores comunes relacionados con [T]',
    'Preguntas que deberías hacerle a tu estilista sobre [T]',
    'El proceso correcto cuando hablamos de [T]',
    'Por qué [T] no siempre da los mismos resultados',
    'Cómo abordar [T] correctamente en el salón',
    'Lo que marca la diferencia cuando se trabaja [T]',
  ],
  reservas: [
    'Antes y después: transformación relacionada con [T]',
    '¿Es esto lo que buscas con [T]?',
    'Resultados reales en mi salón trabajando [T]',
    '¿Por qué mis clientas confían en mí para [T]?',
    'El proceso completo cuando trabajo [T]: de principio a fin',
    'Lo que consigues cuando se aborda [T] bien',
    '¿Llevas tiempo pensando en [T]? Esto te convencerá',
    'Reserva cita para hablar de [T]: esto es lo que te espera',
    'Lo que cambia cuando se trata [T] correctamente',
    'Estas clientas vinieron por [T] — sus resultados',
  ],
  visibilidad: [
    'Todo sobre [T]: la guía que nadie había hecho',
    'Guarda este post: respuestas sobre [T]',
    'Lo que más me preguntan sobre [T]',
    '¿[T] o no? Te ayudo a tomar la decisión',
    '[T] explicado de forma sencilla',
    'Tendencias relacionadas con [T] este año',
    'Inspírate: ideas sobre [T] para este mes',
    'El glosario de [T] que nadie te había explicado',
    'Por qué [T] está en boca de todos en peluquería',
    '¿Cuánto influye [T] en el resultado final? La respuesta te sorprende',
  ],
}

const KNOWN_SERVICES = new Set([
  'rubios', 'canas', 'alisados', 'balayage', 'mechas',
  'tratamientos', 'corte', 'color', 'keratina', 'decoloración',
  'extensiones', 'peinados', 'general',
])

function isKnownService(topic: string): boolean {
  return KNOWN_SERVICES.has(topic.toLowerCase().trim())
}

function applyLabel(template: string, service: string): string {
  // If it's a known service, use article-based replacements
  if (isKnownService(service)) {
    const l = serviceLabel(service)
    return template
      .replace(/\[EL\]/g, l.el)
      .replace(/\[UN\]/g, l.un)
      .replace(/\[DURA\]/g, l.dura)
      .replace(/\[QUEDA\]/g, l.queda)
      .replace(/\[ESFACIL\]/g, l.esFacil)
  }
  // For free-text custom topics, use [T] templates — no article needed
  return template.replace(/\[T\]/g, service.toLowerCase())
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateMockPlan(input: PlannerInput): PlannerOutput {
  const weeks = input.duration === '1week' ? 1 : 4
  const total = weeks * input.postsPerWeek
  const items: PlannerItem[] = []
  const days = DEFAULT_DAYS[input.postsPerWeek]

  const startDate = input.startDate ? new Date(input.startDate) : new Date()

  const customTopic = input.freeText?.trim()
  const topicPool = customTopic ? [customTopic] : input.services

  // Pick template set: custom topics use [T] templates, known services use article-based ones
  const obj = input.objective
  const usingCustomTopic = !!(customTopic && !isKnownService(customTopic))
  const reelPool = usingCustomTopic
    ? (CUSTOM_REEL_TEMPLATES[obj] || CUSTOM_REEL_TEMPLATES.autoridad)
    : (REEL_TEMPLATES[obj] || REEL_TEMPLATES.autoridad)
  const carruselPool = usingCustomTopic
    ? (CUSTOM_CAROUSEL_TEMPLATES[obj] || CUSTOM_CAROUSEL_TEMPLATES.autoridad)
    : (CAROUSEL_TEMPLATES[obj] || CAROUSEL_TEMPLATES.autoridad)

  const queues: Record<string, string[]> = {
    reel: shuffle(reelPool),
    carrusel: shuffle(carruselPool),
  }
  const queueIdx: Record<string, number> = { reel: 0, carrusel: 0 }

  for (let i = 0; i < total; i++) {
    const service = topicPool[i % topicPool.length]
    const weekNum = Math.floor(i / input.postsPerWeek)
    const day = days[i % days.length]

    let type: 'reel' | 'carrusel' = 'reel'
    if (input.format === 'carrusels') type = 'carrusel'
    else if (input.format === 'mixed') type = i % 2 === 0 ? 'reel' : 'carrusel'

    // Reshuffle if exhausted
    if (queueIdx[type] >= queues[type].length) {
      queues[type] = shuffle(queues[type])
      queueIdx[type] = 0
    }
    const template = queues[type][queueIdx[type]++]
    const itemTitle = applyLabel(template, service)

    const itemDate = new Date(startDate)
    itemDate.setDate(itemDate.getDate() + weekNum * 7 + getDayOffset(day))

    items.push({
      id: `plan-${i}`,
      type,
      title: itemTitle,
      service,
      objective: input.objective,
      suggestedDay: day,
      suggestedDate: itemDate.toISOString().split('T')[0],
      hookIdea: `Hook para ${service}: enfocado en ${input.objective}`,
      format: type === 'reel' ? 'Reel 40-50 segundos' : 'Carrusel 5 slides',
    })
  }

  return {
    items,
    summary: `${total} publicaciones para ${input.duration === '1week' ? '1 semana' : '1 mes'}, ${input.postsPerWeek} por semana.`,
  }
}

function getDayOffset(day: string): number {
  const map: Record<string, number> = {
    'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3,
    'Viernes': 4, 'Sábado': 5, 'Domingo': 6,
  }
  return map[day] || 0
}

export function buildPlanPrompt(input: PlannerInput): string {
  const weeks = input.duration === '1week' ? 1 : 4
  const total = weeks * input.postsPerWeek
  const days = DEFAULT_DAYS[input.postsPerWeek]
  const services = input.freeText?.trim() ? input.freeText.trim() : input.services.join(', ')
  const formatLabel = input.format === 'reels' ? 'SOLO REELS (todos los items deben ser type="reel")' : input.format === 'carrusels' ? 'SOLO CARRUSELES (todos los items deben ser type="carrusel")' : 'MIXTO (alterna entre reel y carrusel)'
  const formatType = input.format === 'reels' ? '"reel"' : input.format === 'carrusels' ? '"carrusel"' : '"reel" o "carrusel"'
  return `Eres un experto en planificación de contenido para salones de belleza en Instagram. Crea un plan de contenido siguiendo la metodología BRÄVE.

DURACIÓN: ${input.duration === '1week' ? '1 semana' : '1 mes'} (${weeks} semana(s))
PUBLICACIONES POR SEMANA: ${input.postsPerWeek}
TOTAL: ${total} publicaciones
FORMATO: ${formatLabel}
OBJETIVO: ${input.objective}
SERVICIOS/TEMAS: ${services}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

DÍAS SUGERIDOS POR SEMANA: ${days.join(', ')}

METODOLOGÍA OBLIGATORIA:
- Cada item debe tener un título atractivo, específico y no repetido.
- ⚠️ REGLA CRÍTICA DE FORMATO: El campo "type" de CADA item debe ser ${formatType}. No mezcles formatos. Si el formato es "reels", TODOS los items deben ser type="reel". Si es "carrusels", TODOS deben ser type="carrusel".
- Si el objetivo es "autoridad", enfocar en criterio profesional y educación.
- Si es "reservas", enfocar en transformaciones, resultados y CTA a reserva.
- Si es "visibilidad", enfocar en tendencias, dudas frecuentes y contenido guardable.
- Para cada item incluye una idea de gancho (hookIdea) breve.

Devuelve EXACTAMENTE este JSON, sin texto adicional:
{
  "items": [
    {
      "type": ${formatType},
      "title": "Título atractivo de la publicación",
      "service": "Servicio o tema al que pertenece",
      "suggestedDay": "Uno de: ${days.join(', ')}",
      "hookIdea": "Idea de gancho breve para esta publicación",
      "format": ${input.format === 'reels' ? '"Reel 40-50 segundos"' : input.format === 'carrusels' ? '"Carrusel 5 slides"' : '"Reel 40-50 segundos" o "Carrusel 5 slides"'}
    }
  ],
  "summary": "Resumen breve del plan"
}`
}

/** LLM-backed planner with mock fallback. Assigns ids and computes suggestedDate client-side. */
export async function generatePlan(input: PlannerInput): Promise<PlannerOutput> {
  try {
    const raw = await generateAIContent(buildPlanPrompt(input))
    const parsed = extractJSON<{ items: Array<Omit<PlannerItem, 'id' | 'suggestedDate' | 'objective'>>, summary: string }>(raw)
    if (
      parsed &&
      Array.isArray(parsed.items) &&
      parsed.items.length > 0 &&
      parsed.items.every(
        it =>
          it &&
          (it.type === 'reel' || it.type === 'carrusel') &&
          typeof it.title === 'string' &&
          typeof it.service === 'string' &&
          typeof it.suggestedDay === 'string' &&
          typeof it.hookIdea === 'string' &&
          typeof it.format === 'string'
      )
    ) {
      const startDate = input.startDate ? new Date(input.startDate) : new Date()
      const items: PlannerItem[] = parsed.items.map((it, i) => {
        const weekNum = Math.floor(i / input.postsPerWeek)
        const itemDate = new Date(startDate)
        itemDate.setDate(itemDate.getDate() + weekNum * 7 + getDayOffset(it.suggestedDay))
        // Force the type to respect the selected format — AI may ignore instructions
        const forcedType: 'reel' | 'carrusel' =
          input.format === 'reels' ? 'reel'
          : input.format === 'carrusels' ? 'carrusel'
          : it.type
        const forcedFormat = forcedType === 'reel' ? 'Reel 40-50 segundos' : 'Carrusel 5 slides'
        return {
          id: `plan-${i}`,
          type: forcedType,
          title: it.title,
          service: it.service,
          objective: input.objective,
          suggestedDay: it.suggestedDay,
          suggestedDate: itemDate.toISOString().split('T')[0],
          hookIdea: it.hookIdea,
          format: forcedFormat,
        }
      })
      return {
        items,
        summary: typeof parsed.summary === 'string' ? parsed.summary : `${items.length} publicaciones planificadas.`,
      }
    }
  } catch {
    // fall through to mock
  }
  return generateMockPlan(input)
}
