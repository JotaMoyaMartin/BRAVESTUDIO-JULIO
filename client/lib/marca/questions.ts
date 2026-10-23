/**
 * MI MARCA · «Tu marca en 5 minutos» (22-oct-2026).
 * 10 preguntas, una por pantalla: casi todas se contestan con un toque.
 * Las respuestas se convierten en texto (raw_input) para la IA y en los
 * campos que ya usa el resto de la app (servicios, servicio estrella…).
 */

export type Answers = Record<string, string | string[] | undefined>

export interface Question {
  id: string
  /** Bloque al que pertenece (se ve encima de la pregunta). */
  block: string
  title: string
  help?: string
  kind: 'text' | 'single' | 'multi'
  options?: string[]
  /** Para «single»/«multi»: permite escribir otra opción. */
  allowOther?: boolean
  /** Campos de texto extra en la misma pantalla. */
  fields?: Array<{ id: string; label: string; placeholder: string; optional?: boolean }>
  placeholder?: string
  /** Se puede dictar con el micrófono. */
  voice?: boolean
  optional?: boolean
  /** Las opciones salen de otra respuesta (p. ej. servicio estrella ← servicios). */
  optionsFrom?: string
  /** Ideas que se añaden al texto con un toque (para no empezar en blanco). */
  ideas?: string[]
}

export const SERVICES = ['Color', 'Balayage y mechas', 'Rubios', 'Corte', 'Tratamientos', 'Alisados y keratina', 'Extensiones', 'Canas', 'Novias y peinados', 'Barbería']

export const QUESTIONS: Question[] = [
  {
    id: 'salon', block: 'Tu salón', kind: 'text', title: '¿Cómo se llama tu salón?',
    fields: [
      { id: 'salon', label: 'Nombre del salón', placeholder: 'Aura Hair Studio' },
      { id: 'ciudad', label: 'Ciudad o barrio', placeholder: 'Madrid, barrio de Salamanca', optional: true },
    ],
  },
  { id: 'equipo', block: 'Tu salón', kind: 'single', title: '¿Trabajas sola o con equipo?', options: ['Trabajo sola', 'Somos 2 o 3', 'Somos 4 o más'] },
  { id: 'servicios', block: 'Tus servicios', kind: 'multi', title: '¿Qué servicios haces?', help: 'Elige todos los que quieras.', options: SERVICES, allowOther: true },
  { id: 'estrella', block: 'Tus servicios', kind: 'single', title: '¿Cuál quieres vender más?', help: 'Será tu servicio estrella: el protagonista de tu contenido.', optionsFrom: 'servicios', allowOther: true },
  {
    id: 'edad', block: 'Tu clienta ideal', kind: 'multi', title: '¿Qué edad tiene tu clienta ideal?', options: ['18–25', '25–35', '35–45', '45–60', 'Más de 60'],
    fields: [{ id: 'clienta', label: 'Descríbela en una frase (opcional)', placeholder: 'Mujer que trabaja, cuida su pelo y no tiene tiempo', optional: true }],
  },
  {
    id: 'problema', block: 'Tu clienta ideal', kind: 'multi', title: '¿Qué problema le resuelves?', help: 'Lo que más te piden o lo que más le preocupa.',
    options: ['Rubio que amarillea', 'Pelo dañado o quebrado', 'Canas', 'Falta de volumen', 'Encrespamiento', 'No sabe qué le favorece', 'Poco tiempo para peinarse'], allowOther: true,
  },
  { id: 'diferencia', block: 'Lo que te hace única', kind: 'text', title: '¿Qué te hace diferente de otros salones?', help: 'Escríbelo o dímelo por voz, como se lo contarías a una amiga.', placeholder: 'Antes de tocar nada miro el pelo con calma y te explico qué podemos conseguir…', voice: true,
    ideas: [
      'Hago un diagnóstico del pelo antes de empezar',
      'Te explico qué es realista y qué no',
      'Trato cercano: te sientes como en casa',
      'Me especializo en rubios que no amarillean',
      'Uso productos que cuidan la fibra',
      'Te enseño a peinarte y cuidarlo en casa',
      'Puntualidad: respeto tu tiempo',
      'Me formo constantemente en nuevas técnicas',
    ],
  },
  { id: 'objetivo', block: 'Tu objetivo', kind: 'single', title: '¿Qué quieres conseguir ahora?', options: ['Llenar huecos de la agenda', 'Más clientas nuevas', 'Vender más mi servicio estrella', 'Subir mis precios', 'Que vuelvan más a menudo', 'Crecer en Instagram'] },
  {
    id: 'tono', block: 'Tu forma de comunicar', kind: 'single', title: '¿Cómo te gusta comunicar?', options: ['Cercana', 'Elegante', 'Divertida', 'Experta'],
  },
  {
    id: 'camara', block: 'Tu forma de comunicar', kind: 'single', title: '¿Cómo te llevas con hablar a cámara?',
    help: 'Hablar a cámara es lo que más confianza genera. Te ayudamos a empezar, estés donde estés.',
    options: ['Ya lo hago y me encanta', 'Lo hago a veces, quiero hacerlo más', 'Aún no he empezado, pero sé que lo necesito', 'Me da vergüenza: ayúdame a empezar'],
  },
  { id: 'tiempo', block: 'Tu tiempo', kind: 'single', title: '¿Cuánto tiempo puedes dedicar a tu contenido cada semana?', help: 'Con 1 hora bien organizada ya publicas 3 veces. Te enseñamos a grabar en bloque.', options: ['Menos de 1 hora', 'De 1 a 3 horas', 'Más de 3 horas'] },
]

export const asList = (v: string | string[] | undefined): string[] => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean)
export const asText = (v: string | string[] | undefined): string => (Array.isArray(v) ? v.join(', ') : v ?? '').trim()

/** ¿La pregunta tiene respuesta suficiente para seguir? */
export function isAnswered(q: Question, a: Answers): boolean {
  if (q.optional) return true
  if (q.fields?.some(f => !f.optional && !asText(a[f.id]))) return false
  if (q.kind === 'text') return q.fields ? true : asText(a[q.id]).length >= 3
  return asList(a[q.id]).length > 0
}

/** Opciones de una pregunta (las de «estrella» salen de los servicios elegidos). */
export function optionsOf(q: Question, a: Answers): string[] {
  if (q.optionsFrom) {
    const from = asList(a[q.optionsFrom])
    return from.length ? from : SERVICES
  }
  return q.options ?? []
}

/** Texto en primera persona para la IA (y para raw_input). */
export function answersToText(a: Answers): string {
  const L: string[] = []
  if (asText(a.salon)) L.push(`Mi salón se llama ${asText(a.salon)}${asText(a.ciudad) ? ` y está en ${asText(a.ciudad)}` : ''}.`)
  if (asText(a.equipo)) L.push(`${asText(a.equipo)}.`)
  if (asList(a.servicios).length) L.push(`Los servicios que hago son: ${asText(a.servicios)}.`)
  if (asText(a.estrella)) L.push(`El servicio que más quiero vender es ${asText(a.estrella)}.`)
  if (asList(a.edad).length) L.push(`Mi clienta ideal tiene ${asText(a.edad)} años${asText(a.clienta) ? `: ${asText(a.clienta)}` : ''}.`)
  if (asList(a.problema).length) L.push(`Le resuelvo: ${asText(a.problema)}.`)
  if (asText(a.diferencia)) L.push(`Lo que me hace diferente: ${asText(a.diferencia)}`)
  if (asText(a.objetivo)) L.push(`Mi objetivo ahora es: ${asText(a.objetivo)}.`)
  if (asText(a.tono)) L.push(`Mi forma de comunicar es ${asText(a.tono).toLowerCase()}.`)
  if (asText(a.camara)) L.push(`Sobre salir a cámara: ${asText(a.camara).toLowerCase()}.`)
  if (asText(a.tiempo)) L.push(`Tiempo para contenido a la semana: ${asText(a.tiempo).toLowerCase()}.`)
  return L.join('\n')
}
