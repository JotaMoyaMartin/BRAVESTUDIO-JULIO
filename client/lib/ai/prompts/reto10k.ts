import { generateAIContent, extractJSON } from '../client'
import { RetoInput, RetoOutput, RetoItem } from '@/types/reto10k'

export function buildRetosPrompt(input: RetoInput): string {
  const services = input.services.length > 0 ? input.services.join(', ') : 'servicios generales de peluquería'
  const count = Math.max(3, Math.min(7, input.postsPerWeek || 4))
  return `Eres un experto en creación de contenido para estilistas en Instagram, especializado en el Reto 10K BRÄVE.

FASE ACTUAL: ${input.currentPhase} — ${input.phaseTitle}
DÍA DEL RETO: ${input.currentDay} de 30
OBJETIVO DE LA USUARIA: ${input.objective === 'recomendado' ? 'Sin objetivo prioritario — aplicar mix equilibrado 40/40/20 (autoridad/resultados/conexión)' : input.objective}
SERVICIOS ESTRELLA: ${services}
NIVEL: ${input.level}
PUBLICACIONES POR SEMANA: ${count}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

METODOLOGÍA:
- Genera EXACTAMENTE ${count} items de contenido para esta semana del Reto 10K.
- TODOS los items deben ser de tipo "reel" (NO se usan carruseles en este reto).
- Balance: 40% autoridad (educación, consejos, opiniones), 40% resultados (antes/después, transformaciones, testimonios), 20% conexión (historia personal, comunidad, conversación).
- Cada item debe tener un título atractivo, no repetido, coherente con la fase.
- El campo "category" debe ser "autoridad", "resultados" o "conexion" según el balance.
- Para cada item incluye: type (siempre "reel"), title, service, objective, hookIdea, format, script (con hook, context, solution y cta), caption (texto de publicación con hashtags), visual_idea.
- El campo "day" debe ser ${input.currentDay}.

Devuelve EXACTAMENTE este JSON, sin texto adicional:
{
  "items": [
    {
      "type": "reel",
      "title": "Título atractivo",
      "service": "Servicio al que pertenece",
      "objective": "autoridad" | "reservas" | "visibilidad",
      "category": "autoridad" | "resultados" | "conexion",
      "hookIdea": "Idea de gancho breve",
      "format": "Reel 35-45s",
      "script": { "hook": "...", "context": "...", "solution": "...", "cta": "..." },
      "caption": "Texto de publicación con hashtags",
      "visual_idea": "Idea visual para grabar",
      "day": ${input.currentDay}
    }
  ],
  "summary": "Resumen breve del contenido generado"
}`
}

export function generateMockRetos(input: RetoInput): RetoOutput {
  const services = input.services.length > 0 ? input.services : ['Balayage', 'Color', 'Corte']
  const day = input.currentDay
  const phaseTitle = input.phaseTitle || 'Tu fase actual'
  const count = Math.max(3, Math.min(7, input.postsPerWeek || 4))

  const all: RetoItem[] = [
    {
      type: 'reel',
      title: `Mi consejo profesional sobre ${services[0]}`,
      service: services[0],
      objective: input.objective,
      category: 'autoridad',
      hookIdea: `Lo que nadie te explica sobre ${services[0]} antes de hacerlo`,
      format: 'Reel 35-45s',
      script: {
        hook: `¿Sabes qué pasa realmente cuando te haces ${services[0]}?`,
        context: `Muchas clientas llegan con dudas porque nadie les ha explicado el proceso a fondo.`,
        solution: `Hoy te cuento lo que analizo antes de empezar y por qué importa para el resultado final.`,
        cta: `¿Alguna duda sobre ${services[0]}? Déjala en comentarios y te respondo.`,
      },
      caption: `Consejo profesional sobre ${services[0]} que toda clienta debería saber. Guarda este post para tu próxima visita. #${services[0].replace(/\s/g, '')} #estilista #peluqueria #bravestudio`,
      visual_idea: `Graba en tu salón, muestra el proceso o producto relacionado con ${services[0]}.`,
      day,
    },
    {
      type: 'reel',
      title: `3 errores comunes con ${services[0]}`,
      service: services[0],
      objective: input.objective,
      category: 'autoridad',
      hookIdea: `Si haces ${services[0]}, esto te interesa`,
      format: 'Reel 35-45s',
      script: {
        hook: `Estos 3 errores arruinan un buen ${services[0]}.`,
        context: `Los veo cada semana en el salón y casi siempre se pueden evitar.`,
        solution: `Te cuento cuáles son y cómo evitarlos para que tu resultado dure más.`,
        cta: `¿Cuál te suena? Cuéntamelo abajo.`,
      },
      caption: `3 errores comunes con ${services[0]} que conviene evitar. #${services[0].replace(/\s/g, '')} #consejos #estilista #bravestudio`,
      visual_idea: `Plano corto tuyo hablando a cámara con el servicio de fondo.`,
      day,
    },
    {
      type: 'reel',
      title: `Transformación real con ${services[services.length > 1 ? 1 : 0]}`,
      service: services[services.length > 1 ? 1 : 0],
      objective: input.objective,
      category: 'resultados',
      hookIdea: `Mira lo que logramos con ${services[services.length > 1 ? 1 : 0]}`,
      format: 'Reel 35-45s',
      script: {
        hook: `Esta clienta quería un cambio y esto fue lo que hicimos.`,
        context: `Llegó con el cabello en un estado y quería una transformación visible.`,
        solution: `Aplicamos la técnica paso a paso y el resultado fue exactamente lo que buscaba.`,
        cta: `¿Te gustaría un cambio así? Reserva tu cita en el link de mi bio.`,
      },
      caption: `Transformación real con ${services[services.length > 1 ? 1 : 0]}. El resultado habla solo. #transformacion #antesydespues #${services[services.length > 1 ? 1 : 0].replace(/\s/g, '')}`,
      visual_idea: `Antes y después en el mismo reel, con transición suave y música emocional.`,
      day,
    },
    {
      type: 'reel',
      title: `El proceso paso a paso de ${services[0]}`,
      service: services[0],
      objective: input.objective,
      category: 'resultados',
      hookIdea: `Así trabajo un ${services[0]} en el salón`,
      format: 'Reel 35-45s',
      script: {
        hook: `¿Te has preguntado cómo hago un ${services[0]} de verdad?`,
        context: `Hoy te enseño el proceso completo, desde el diagnóstico hasta el acabado.`,
        solution: `Cada paso tiene un porqué. Mira el resultado final.`,
        cta: `Guarda este reel para tu próxima cita.`,
      },
      caption: `El proceso real de ${services[0]} en el salón. #${services[0].replace(/\s/g, '')} #detrasdecamaras #estilista`,
      visual_idea: `Montaje rápido de los pasos del servicio terminando en el resultado.`,
      day,
    },
    {
      type: 'reel',
      title: `Mi historia: por qué soy estilista`,
      service: services[0],
      objective: input.objective,
      category: 'conexion',
      hookIdea: `No siempre quise ser estilista. Esto es lo que cambió.`,
      format: 'Reel 35-45s',
      script: {
        hook: `¿Alguna vez te has preguntado por qué haces lo que haces?`,
        context: `Yo tampoco lo sabía al principio. Fue un momento concreto el que lo cambió todo.`,
        solution: `Hoy comparto mi historia y por qué amo transformar a mis clientas cada día.`,
        cta: `¿Y tú? ¿Por qué haces lo que haces? Cuéntamelo abajo.`,
      },
      caption: `Mi historia como estilista. Cada clienta me enseña algo nuevo. #mihistoria #estilista #vocacion #bravestudio`,
      visual_idea: `Graba en tu salón, muestra tu día a día mientras cuentas tu historia.`,
      day,
    },
    {
      type: 'reel',
      title: `Pregunta del día para mi comunidad`,
      service: services[0],
      objective: input.objective,
      category: 'conexion',
      hookIdea: `Quiero leer tus opiniones`,
      format: 'Reel 35-45s',
      script: {
        hook: `Tengo una pregunta para ti y quiero leer tu respuesta.`,
        context: `Cada semana hablo con clientas y siempre aprendo algo nuevo.`,
        solution: `Hoy te pregunto: ¿cuál es el cambio que más te ha gustado en tu pelo?`,
        cta: `Responde en comentarios, los leo todos.`,
      },
      caption: `Pregunta para mi comunidad. ¡Quiero leerte! #comunidad #estilista #bravestudio`,
      visual_idea: `Habla a cámara en tu salón, tono cercano y cálido.`,
      day,
    },
    {
      type: 'reel',
      title: `Antes y después en 15 segundos`,
      service: services[services.length > 2 ? 2 : 0],
      objective: input.objective,
      category: 'resultados',
      hookIdea: `Cambio en 15 segundos`,
      format: 'Reel 35-45s',
      script: {
        hook: `Cuenta los segundos mientras ves el cambio.`,
        context: `Un buen ${services[services.length > 2 ? 2 : 0]} puede transformar por completo un look.`,
        solution: `Mira el resultado final y dime qué opinas.`,
        cta: `Comenta tu parte favorita.`,
      },
      caption: `Antes y después en segundos. #antesydespues #${services[services.length > 2 ? 2 : 0].replace(/\s/g, '')} #bravestudio`,
      visual_idea: `Transición rápida antes/después con ritmo de música.`,
      day,
    },
  ]

  // Mantener balance 40/40/20 lo más fiel posible al count pedido
  const items = all.slice(0, count)

  return {
    items,
    summary: `${items.length} ideas de reels para la fase "${phaseTitle}" (día ${day} del Reto 10K).`,
  }
}

export async function generateRetos(input: RetoInput): Promise<RetoOutput> {
  try {
    const raw = await generateAIContent(buildRetosPrompt(input))
    const parsed = extractJSON<{ items: Array<Omit<RetoItem, 'day'>>, summary: string }>(raw)
    if (
      parsed &&
      Array.isArray(parsed.items) &&
      parsed.items.length > 0 &&
      parsed.items.every(
        it =>
          it &&
          it.type === 'reel' &&
          typeof it.title === 'string' &&
          typeof it.service === 'string' &&
          typeof it.hookIdea === 'string' &&
          typeof it.format === 'string'
      )
    ) {
      const items: RetoItem[] = parsed.items.map((it, i) => ({
        ...it,
        type: 'reel',
        day: input.currentDay,
        objective: it.objective || input.objective,
        category: it.category || (i % 5 < 2 ? 'autoridad' : i % 5 < 4 ? 'resultados' : 'conexion'),
        caption: it.caption || '',
        visual_idea: it.visual_idea || '',
      }))
      return {
        items,
        summary: typeof parsed.summary === 'string' ? parsed.summary : `${items.length} ideas generadas.`,
      }
    }
  } catch {
    // fall through to mock
  }
  return generateMockRetos(input)
}