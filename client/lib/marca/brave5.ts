/**
 * MI MARCA · la estrategia en 5 tarjetas (22-oct-2026).
 * Simple de leer y de aplicar. Se genera con IA y, si la IA no responde,
 * con una versión hecha a partir de las respuestas (nunca se queda vacía).
 * También se traduce al documento completo (StrategyDocument) que usan
 * Bravi, Mi plan y el resto de generadores como contexto.
 */
import type { StrategyDocument } from '@/lib/strategy-types'
import { EMPTY_STRATEGY } from '@/lib/strategy-types'
import { type Answers, answersToText, asList, asText } from './questions'

export interface Brave5 {
  /** Tu marca en una frase. */
  frase: string
  /** Bio de Instagram lista para copiar (≤150 caracteres). */
  bio: string
  clienta: { quien: string; preocupa: string[]; quiere: string[] }
  estrella: { servicio: string; porque: string; como: string[] }
  pilares: Array<{ nombre: string; para_que: string; ejemplos: string[] }>
  ritmo: { semana: number; reparto: string; tono: string; consejo: string }
}

export function buildBrave5Prompt(a: Answers): string {
  return `Eres la directora de marketing de BRÄVE para salones de peluquería. Con estas respuestas de una estilista, crea su estrategia en 5 partes, en español de España, cercano y concreto, sin tecnicismos ni frases vacías.

RESPUESTAS:
${answersToText(a)}

METODOLOGÍA BRÄVE: el contenido gira en torno a que la estilista HABLE A CÁMARA (es lo que más confianza y citas genera). Si aún no ha empezado o le da vergüenza, no lo quites: propón un comienzo suave y concreto (reels de 15 s, usar el Teleprompter, empezar mostrando las manos y la voz).

Devuelve SOLO este JSON:
{
  "frase": "su marca en una frase de máximo 18 palabras (qué hace, para quién, qué la hace distinta)",
  "bio": "bio de Instagram de máximo 150 caracteres, con 1-2 emojis discretos, ciudad si la hay y una llamada a reservar",
  "clienta": { "quien": "1 frase", "preocupa": ["3 preocupaciones reales"], "quiere": ["3 deseos"] },
  "estrella": { "servicio": "su servicio estrella", "porque": "1 frase de por qué es su mejor apuesta", "como": ["3 formas concretas de venderlo en Instagram"] },
  "pilares": [ { "nombre": "1-2 palabras", "para_que": "1 frase", "ejemplos": ["2 ideas de publicación"] } ] (exactamente 3: uno para enseñar, uno para mostrar resultados y uno para conectar),
  "ritmo": { "semana": publicaciones por semana (MÍNIMO 3; con poco tiempo, 3 y grabando en bloque; con 1-3 h, 4; con más, 5), "reparto": "ej. 2 reels · 1 carrusel · stories 3 días", "tono": "cómo hablar en 1 frase", "consejo": "1 consejo práctico para empezar esta semana" }
}`
}

const SERVICE_PAIN: Record<string, string> = {
  'Rubios': 'que su rubio amarillee', 'Balayage y mechas': 'un resultado que no se vea natural', 'Canas': 'que se le noten las canas a las dos semanas',
  'Color': 'que el color se apague pronto', 'Tratamientos': 'tener el pelo apagado y sin vida', 'Alisados y keratina': 'el encrespamiento diario',
  'Extensiones': 'que se noten las extensiones', 'Corte': 'un corte que no sabe peinar en casa', 'Novias y peinados': 'no verse ella misma el gran día', 'Barbería': 'un corte que pierde la forma enseguida',
}

/** «25–35» + «35–45» → «25 a 45»; «Más de 60» → «más de 60». */
export function ageRange(v: string | string[] | undefined): string {
  const nums = asList(v).flatMap(x => (x.match(/\d+/g) ?? []).map(Number))
  if (!nums.length) return ''
  const lo = Math.min(...nums), hi = Math.max(...nums)
  if (asList(v).some(x => /más/i.test(x)) && hi === 60) return lo === 60 ? 'más de 60' : `${lo} o más`
  return lo === hi ? `${lo}` : `${lo} a ${hi}`
}

/** Cierre natural según el objetivo (para el consejo de «Esta semana»). */
const CTA_BY_GOAL: Record<string, string> = {
  'Llenar huecos de la agenda': 'avisando de los huecos libres de esta semana',
  'Más clientas nuevas': 'invitando a escribirte a quien todavía no te conoce',
  'Vender más mi servicio estrella': 'invitando a escribirte para pedir valoración',
  'Subir mis precios': 'explicando todo lo que incluye tu servicio',
  'Que vuelvan más a menudo': 'recordando cada cuánto conviene repasarlo',
  'Crecer en Instagram': 'pidiendo que lo guarden y lo compartan',
}

/** Versión sin IA: buena, honesta y basada solo en sus respuestas. */
export function mockBrave5(a: Answers): Brave5 {
  const salon = asText(a.salon) || 'Tu salón'
  const ciudad = asText(a.ciudad)
  const estrella = asText(a.estrella) || asList(a.servicios)[0] || 'tu servicio estrella'
  const edad = ageRange(a.edad) || '30 a 45'
  const problemas = asList(a.problema)
  const tono = (asText(a.tono) || 'Cercana').toLowerCase()
  const tiempo = asText(a.tiempo)
  const camara = asText(a.camara)
  // Metodología BRÄVE: mínimo 3 a la semana. «No tengo tiempo» se resuelve grabando en bloque.
  const poco = tiempo.startsWith('Menos')
  const semana = poco ? 3 : tiempo.startsWith('Más') ? 5 : 4
  // La metodología BRÄVE es hablar a cámara: a quien aún no lo hace, se le propone empezar suave.
  const empieza = /Aún no|vergüenza/i.test(camara)
  const reelsTxt = empieza ? 'empieza con reels cortos a cámara de 15 segundos' : 'reels hablando a cámara'
  const objetivo = asText(a.objetivo) || 'llenar tu agenda'
  const dif = asText(a.diferencia)
  return {
    frase: `${salon}: ${estrella.toLowerCase()} pensado para mujeres de ${edad} años que quieren verse bien sin complicarse${ciudad ? `, en ${ciudad}` : ''}.`,
    bio: `${estrella} que dura ✨${ciudad ? ` · ${ciudad}` : ''}\n${dif ? dif.slice(0, 55) : 'Te escucho antes de tocar tu pelo'}\n📅 Reserva tu cita aquí ↓`.slice(0, 150),
    clienta: {
      quien: `Mujer de ${edad} años${asText(a.clienta) ? `, ${asText(a.clienta).toLowerCase()}` : ' que cuida su imagen y valora la confianza'}.`,
      preocupa: (problemas.length ? problemas : ['Que el resultado no dure', 'Gastar y no acertar', 'No saber qué le favorece']).slice(0, 3),
      quiere: ['Un resultado que le dure y le favorezca', 'Que alguien de confianza le aconseje', 'Salir del salón sintiéndose ella'],
    },
    estrella: {
      servicio: estrella,
      porque: `Es lo que más quieres vender y resuelve ${SERVICE_PAIN[estrella] ?? 'lo que más preocupa a tu clienta'}.`,
      como: [`Enseña un antes y después de ${estrella.toLowerCase()} cada semana`, 'Explica en un reel qué haces distinto en el proceso', 'Cierra cada publicación invitando a escribirte por mensaje'],
    },
    pilares: [
      { nombre: 'Enseña', para_que: 'Que te vean como la experta que eres', ejemplos: [`3 errores que estropean tu ${estrella.toLowerCase()}`, 'Cómo cuidar el color en casa'] },
      { nombre: 'Transforma', para_que: 'Que vean tus resultados reales', ejemplos: [`Antes y después de ${estrella.toLowerCase()}`, 'El proceso paso a paso en 30 segundos'] },
      { nombre: 'Conecta', para_que: 'Que te conozcan y confíen en ti', ejemplos: ['Un día en tu salón', dif ? 'Por qué trabajas como trabajas' : 'Qué te hizo dedicarte a esto'] },
    ],
    ritmo: {
      semana,
      reparto: semana === 3 ? `2 reels · 1 carrusel · stories 3 días (${reelsTxt})` : semana === 4 ? `3 reels · 1 carrusel · stories 4 días (${reelsTxt})` : `3 reels · 2 carruseles · stories a diario (${reelsTxt})`,
      tono: `Habla ${tono}, como si se lo contaras a una clienta en el sillón.`,
      consejo: poco && !empieza
        ? `Esta semana: bloquea 1 hora (por ejemplo el lunes antes de abrir) y graba los 3 vídeos de la semana seguidos con el Teleprompter. Una hora bien organizada da para toda la semana.`
        : empieza
        ? `Esta semana: graba 15 segundos a cámara contando por qué te encanta hacer ${estrella.toLowerCase()}. Usa el Teleprompter: lees y no se nota. El primero cuesta; el tercero ya sale solo.`
        : `Esta semana: graba un antes y después de ${estrella.toLowerCase()} y publícalo ${CTA_BY_GOAL[objetivo] ?? 'invitando a escribirte para pedir cita'}.`,
    },
  }
}

/** Comprueba que lo que devuelve la IA tiene la forma correcta. */
export function isBrave5(x: unknown): x is Brave5 {
  const b = x as Brave5
  return !!b && typeof b.frase === 'string' && typeof b.bio === 'string' && !!b.clienta && !!b.estrella &&
    Array.isArray(b.pilares) && b.pilares.length >= 3 && !!b.ritmo
}

/** Documento completo (lo que usan Bravi y los generadores como contexto). */
export function brave5ToStrategy(b: Brave5, a: Answers): StrategyDocument & { brave5: Brave5; respuestas: Answers } {
  const services = asList(a.servicios)
  return {
    ...EMPTY_STRATEGY,
    perfil_brave: b.frase,
    resumen_ejecutivo: `${b.frase} Servicio estrella: ${b.estrella.servicio}. Ritmo: ${b.ritmo.semana} publicaciones por semana.`,
    clienta_ideal: { descripcion: b.clienta.quien, edad: ageRange(a.edad), problemas: b.clienta.preocupa, deseos: b.clienta.quiere, objeciones: [] },
    servicios: [
      { name: b.estrella.servicio, priority: 'alta', reason: b.estrella.porque },
      ...services.filter(s => s !== b.estrella.servicio).slice(0, 4).map(s => ({ name: s, priority: 'media' as const, reason: 'Servicio habitual del salón' })),
    ],
    objetivos: asText(a.objetivo) ? [{ timeframe: 'Este mes', goal: asText(a.objetivo), action: b.ritmo.consejo }] : [],
    pilares_contenido: b.pilares.map(p => ({ name: p.nombre, description: p.para_que, examples: p.ejemplos })),
    estilo_comunicacion: { tono: asText(a.tono), voz: b.ritmo.tono, ejemplos: [] },
    plan_accion: b.estrella.como.map(text => ({ text, done: false })),
    resumen_para_ia: `${b.frase} Clienta: ${b.clienta.quien} Le preocupa: ${b.clienta.preocupa.join('; ')}. Servicio estrella: ${b.estrella.servicio}. Pilares: ${b.pilares.map(p => p.nombre).join(', ')}. Tono: ${b.ritmo.tono}`,
    brave5: b,
    respuestas: a,
  }
}

/** Estrategias antiguas (sin tarjetas): se muestran igualmente en 5 tarjetas. */
export function strategyToBrave5(s: StrategyDocument & { brave5?: Brave5 }): Brave5 {
  if (s.brave5 && isBrave5(s.brave5)) return s.brave5
  const star = s.servicios?.[0]
  return {
    frase: s.perfil_brave || s.resumen_ejecutivo || '',
    bio: '',
    clienta: { quien: s.clienta_ideal?.descripcion || '', preocupa: s.clienta_ideal?.problemas?.slice(0, 3) ?? [], quiere: s.clienta_ideal?.deseos?.slice(0, 3) ?? [] },
    estrella: { servicio: star?.name || '', porque: star?.reason || '', como: (s.plan_accion ?? []).slice(0, 3).map(x => x.text) },
    pilares: (s.pilares_contenido ?? []).slice(0, 3).map(p => ({ nombre: p.name, para_que: p.description, ejemplos: p.examples?.slice(0, 2) ?? [] })),
    ritmo: { semana: 3, reparto: (s.estrategia_contenido ?? []).map(x => `${x.type} ${x.percentage}%`).join(' · '), tono: s.estilo_comunicacion?.voz || s.estilo_comunicacion?.tono || '', consejo: s.plan_accion?.[0]?.text || '' },
  }
}
