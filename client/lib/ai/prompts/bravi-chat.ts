// Bravi chat — el asistente habla dentro del cuadro de Inicio.
// Patrón de stories.ts: buildXxxPrompt + getMockXxx + generateXxxChecked.
// REGLA DURA del repo: reutiliza generateAIContent (../client) y extractJSON
// (../extract) — nunca crear un cliente ni extractor nuevo.

import { generateAIContent, extractJSON } from '../client'
import type { BraviStep } from '../../home-bravi'

export interface BraviChatMessage {
  role: 'user' | 'bravi'
  content: string
}

export interface BraviChatInput {
  messages: BraviChatMessage[]
  question: string
  brandContext?: string
  steps: BraviStep[]
  suggestionLabel?: string | null
  suggestionHref?: string | null
}

export interface BraviReply {
  reply: string
  cta: { label: string; href: string } | null
}

/** Secciones de la app a las que el chat puede llevar con su CTA. */
const CTA_HREFS = new Set([
  '/mi-marca',
  '/crear-contenido',
  '/stories',
  '/planificar',
  '/calendario',
  '/biblioteca',
  '/banco-ganchos',
  '/foto-inspo',
  '/carrusel',
  '/teleprompter',
])

function normalizeHref(href: string): string {
  // La sugerencia de hoy puede llevar query (?service=...) — comparo la base.
  return href.split('?')[0]
}

/** CTA válido solo si apunta a una sección real de la app. */
function sanitizeCta(cta: BraviReply['cta']): BraviReply['cta'] {
  if (!cta || typeof cta.label !== 'string' || !cta.label.trim()) return null
  if (typeof cta.href !== 'string' || !CTA_HREFS.has(cta.href.split('?')[0])) return null
  return { label: cta.label, href: cta.href }
}

const HISTORY_MAX = 6

export function buildBraviChatPrompt(input: BraviChatInput): string {
  const history = input.messages
    .slice(-HISTORY_MAX)
    .map(m => `${m.role === 'user' ? 'USUARIA' : 'BRÄVE'}: ${m.content}`)
    .join('\n')
  const steps = input.steps
    .map(s => `- ${s.label} [${s.href}] — ${s.done ? 'hecho' : 'pendiente'}`)
    .join('\n')
  const firstPending = input.steps.find(s => !s.done)

  return `Eres BRÄVE, la directora de marketing personal de una estilista. Hablas en español de España, cálido y directo, frases cortas, CERO jerga técnica y frases prohibidas de plantilla ("no dudes en", "estoy aquí para ayudarte", "como asistente de IA"). Max 5 frases por respuesta. Si la pregunta encaja con un paso del checklist, nómbralo y di qué botón tocar (usa su label exacto, entre comillas). Si no, responde con un consejo concreto del sector peluquería.
${input.brandContext ? `\nCONTEXTO DEL SALÓN:\n${input.brandContext}\n` : ''}
SUGERENCIA DE HOY (la tarjeta "Recomendado para hoy" que la usuaria ve en esta misma tarjeta): ${input.suggestionLabel ?? 'ninguna hoy'}
${input.suggestionHref && suggestionHrefAllowed(input.suggestionHref) ? `(botón de la sugerencia: ${input.suggestionHref})\n` : ''}
PASOS DEL CHECKLIST (abajo de la tarjeta, la usuaria puede tocarlos):
${steps}

${firstPending ? `El siguiente paso pendiente es "${firstPending.label}".` : 'Ya completó todos los pasos del checklist.'}

HISTORIAL RECIENTE (máx 6 mensajes, el actual es el último):
${history || '(primer mensaje de la conversación)'}

PREGUNTA DE LA USUARIA: ${input.question}

Si propones ir a una sección, el "href" del cta DEBE ser exactamente uno de esta lista: /mi-marca, /crear-contenido, /stories, /planificar, /calendario, /biblioteca, /banco-ganchos, /foto-inspo, /carrusel, /teleprompter. Si no corresponde, cta = null.

Devuelve EXACTAMENTE este JSON:
{
  "reply": "tu respuesta, máx 5 frases",
  "cta": {"label": "texto del botón", "href": "/seccion"} o null
}`
}

function suggestionHrefAllowed(href: string): boolean {
  return CTA_HREFS.has(href.split('?')[0])
}

/** Respuestas del mock (IA no disponible): útiles por palabra clave, y que
 *  nunca parezca que no escuchó — sin pegar la pregunta dentro del reply. */
export function getMockBraviReply(input: BraviChatInput): BraviReply {
  const q = normalize(input.question)
  const firstPending = input.steps.find(s => !s.done)

  // Empezar / marca → el primer paso pendiente del checklist (label exacto).
  if (/\b(empez|por donde|no se por|comienzo|marca|informacion|falta)/.test(q)) {
    if (firstPending) {
      return {
        reply: `Vamos paso a paso. El primero es "${firstPending.label}". ${firstPending.desc}. Toca ese paso abajo y te acompaño.`,
        cta: sanitizeCta({ label: firstPending.label, href: firstPending.href }),
      }
    }
    return {
      reply: 'Ya completaste el recorrido, bien. Ahora toca lo bueno: crea tu próximo guion o planifica la semana que viene.',
      cta: sanitizeCta({ label: 'Crear mi guion', href: '/crear-contenido' }),
    }
  }

  // Clientas → guion del servicio estrella.
  if (/\b(client|mas gente|nueva|atraer|conseguir)/.test(q)) {
    return {
      reply: 'Lo que trae clientas no es promocionar el precio: es enseñar el proceso. Crea un guion de tu servicio estrella con el método BRÄVE y publícalo esta semana. El proceso vende, el resultado atrae.',
      cta: { label: 'Crear mi guion', href: '/crear-contenido' },
    }
  }

  // Estrategia → la tarjeta Recomendado de hoy.
  if (/\b(estrategia|recomendado|prioridad)/.test(q)) {
    if (input.suggestionLabel && input.suggestionHref) {
      const cta = sanitizeCta({ label: input.suggestionLabel, href: input.suggestionHref })
      return {
        reply: 'Está resuelta en lo primero de esta tarjeta. Hoy te recomiendo: ' + input.suggestionLabel + '. Dale al botón y te llevo.',
        cta,
      }
    }
    return {
      reply: 'Una estrategia es tu filtro: decide qué mereces publicar y qué no. Se empieza en Mi Marca y la IA la redacta contigo.',
      cta: { label: 'Ir a Mi Marca', href: '/mi-marca' },
    }
  }

  // Guardar → Biblioteca.
  if (/\b(guard|perder|pierde|biblioteca|salvar|copiado)/.test(q)) {
    return {
      reply: 'Todo lo que creas queda a salvo. Guiones, carruseles y secuencias viven en tu Biblioteca, y de ahí los pasas al Calendario para publicarlos en su día.',
      cta: { label: 'Abrir mi Biblioteca', href: '/biblioteca' },
    }
  }

  // Sin keyword: consejo concreto + que se note que escuchó (sin citar la pregunta).
  return {
    reply: 'Buena duda, me la apunto. Un consejo que funciona en cualquier salón: publica el proceso, no la promoción. Cuéntame sobre qué servicio dudabas y te preparo el camino con el paso que toque.',
    cta: sanitizeCta(firstPending ? { label: firstPending.label, href: firstPending.href } : null),
  }
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export interface BraviReplyChecked extends BraviReply {
  mock: boolean
}

/** LLM-backed reply con mock fallback. mock solo es false con respuesta válida. */
export async function generateBraviReplyChecked(input: BraviChatInput): Promise<BraviReplyChecked> {
  try {
    const raw = await generateAIContent(buildBraviChatPrompt(input))
    const parsed = extractJSON<BraviReply>(raw)
    if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim().length > 0) {
      const cta = sanitizeCta(parsed.cta ?? null)
      return { reply: parsed.reply.trim(), cta, mock: false }
    }
  } catch {
    // fall through to mock
  }
  return { ...getMockBraviReply(input), mock: true }
}