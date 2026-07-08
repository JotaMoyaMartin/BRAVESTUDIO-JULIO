import { generateAIContent, extractJSON } from '../client'
import { RetoInput, RetoOutput, RetoItem } from '@/types/reto10k'

export function buildRetosPrompt(input: RetoInput): string {
  const services = input.services.length > 0 ? input.services.join(', ') : 'servicios generales de peluquería'
  return `Eres un experto en creación de contenido para estilistas en Instagram, especializado en el Reto 10K BRÄVE.

FASE ACTUAL: ${input.currentPhase} — ${input.phaseTitle}
DÍA DEL RETO: ${input.currentDay} de 30
OBJETIVO DE LA USUARIA: ${input.objective === 'recomendado' ? 'Sin objetivo prioritario — aplicar mix equilibrado 40/40/20 (autoridad/resultados/conexión)' : input.objective}
SERVICIOS ESTRELLA: ${services}
NIVEL: ${input.level}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

METODOLOGÍA:
- Genera entre 4 y 7 items de contenido para esta fase del Reto 10K.
- Balance: 40% autoridad (educación, consejos, opiniones), 40% resultados (antes/después, transformaciones, testimonios), 20% conexión (historia personal, comunidad, conversación).
- Cada item debe tener un título atractivo, no repetido, coherente con la fase.
- El campo "category" debe ser "autoridad", "resultados" o "conexion" según el balance.
- Para cada item incluye: type (reel o carrusel), title, service, objective, hookIdea, format, caption (texto de publicación con hashtags), visual_idea.
- Para los reels, incluye "script" con hook, context, solution y cta.
- Para los carruseles, incluye "slides" como array de {number, role, text}.
- El campo "day" debe ser ${input.currentDay}.

Devuelve EXACTAMENTE este JSON, sin texto adicional:
{
  "items": [
    {
      "type": "reel" | "carrusel",
      "title": "Título atractivo",
      "service": "Servicio al que pertenece",
      "objective": "autoridad" | "reservas" | "visibilidad",
      "category": "autoridad" | "resultados" | "conexion",
      "hookIdea": "Idea de gancho breve",
      "format": "Reel 35-45s" | "Carrusel 5-7 slides",
      "script": { "hook": "...", "context": "...", "solution": "...", "cta": "..." },
      "slides": [{ "number": 1, "role": "Portada", "text": "..." }],
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

  const items: RetoItem[] = [
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
      type: 'carrusel',
      title: `5 cosas que debes saber antes de hacerte ${services[0]}`,
      service: services[0],
      objective: input.objective,
      category: 'autoridad',
      hookIdea: `Antes de reservar tu cita, lee esto`,
      format: 'Carrusel 5-7 slides',
      slides: [
        { number: 1, role: 'Portada', text: `5 cosas que debes saber antes de hacerte ${services[0]}` },
        { number: 2, role: 'Punto 1', text: `El resultado depende del estado inicial de tu cabello.` },
        { number: 3, role: 'Punto 2', text: `El mantenimiento en casa es tan importante como el servicio.` },
        { number: 4, role: 'Punto 3', text: `No todos los cabellos son iguales: el diagnóstico es clave.` },
        { number: 5, role: 'Punto 4', text: `Los resultados evolucionan con los lavados.` },
        { number: 6, role: 'Punto 5', text: `Comunica siempre tus expectativas a tu estilista.` },
        { number: 7, role: 'CTA', text: `¿Tienes dudas? Reserva tu consulta y lo hablamos.` },
      ],
      caption: `5 cosas esenciales antes de hacerte ${services[0]}. Guarda este carrusel. #${services[0].replace(/\s/g, '')} #consejos #peluqueria`,
      visual_idea: `Carrusel con fotos de antes/después y texto claro en cada slide.`,
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
      type: 'carrusel',
      title: `Antes y después: ${services[0]} que cambiará tu look`,
      service: services[0],
      objective: input.objective,
      category: 'resultados',
      hookIdea: `El poder de un buen ${services[0]}`,
      format: 'Carrusel 5-7 slides',
      slides: [
        { number: 1, role: 'Portada', text: `Antes y después: el poder de un buen ${services[0]}` },
        { number: 2, role: 'Antes', text: `Así llegaba la clienta al salón.` },
        { number: 3, role: 'Proceso', text: `El diagnóstico y la técnica que aplicamos.` },
        { number: 4, role: 'Después', text: `El resultado final. ¡Mira la diferencia!` },
        { number: 5, role: 'Detalle', text: `Un primer plano del brillo y la textura.` },
        { number: 6, role: 'CTA', text: `¿Quieres tu transformación? Reserva cita.`,
        },
      ],
      caption: `Antes y después de ${services[0]}. Guarda si te inspira. #antesydespues #${services[0].replace(/\s/g, '')} #bravestudio`,
      visual_idea: `Fotos de calidad del antes y después, con buena iluminación.`,
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
  ]

  return {
    items,
    summary: `5 ideas de contenido para la fase "${phaseTitle}" (día ${day} del Reto 10K).`,
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
          (it.type === 'reel' || it.type === 'carrusel') &&
          typeof it.title === 'string' &&
          typeof it.service === 'string' &&
          typeof it.hookIdea === 'string' &&
          typeof it.format === 'string'
      )
    ) {
      const items: RetoItem[] = parsed.items.map((it, i) => ({
        ...it,
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