// Bravi message pools — categorized by context.
// Used by lib/bravi.ts to pick a varied, non-repetitive message.

export type BraviPose = 'normal' | 'celebrating' | 'thinking'
export type BraviCategory =
  | 'welcome_morning'
  | 'welcome_afternoon'
  | 'welcome_evening'
  | 'encourage'
  | 'celebrate'
  | 'tip'
  | 'reminder'
  | 'continue'

interface BraviMessage {
  text: string
  pose: BraviPose
}

export const BRAVI_MESSAGES: Record<BraviCategory, BraviMessage[]> = {
  welcome_morning: [
    { text: '¡Buenos días! Hoy es un buen día para crear algo bonito.', pose: 'normal' },
    { text: 'Buenos días, ¿qué creamos hoy para tu salón?', pose: 'normal' },
    { text: 'Hola de nuevo, te he echado de menos. Empezamos?', pose: 'normal' },
    { text: 'Buenos días, hoy puede ser un gran día para tu contenido.', pose: 'thinking' },
    { text: '¡Buenos días! Un café y a crear. ¿Qué te apetece?', pose: 'normal' },
  ],
  welcome_afternoon: [
    { text: '¡Buenas tardes! Listas para seguir creando.', pose: 'normal' },
    { text: 'Buenas tardes, ¿qué nos toca hoy?', pose: 'normal' },
    { text: 'Hola de nuevo. ¿Continuamos con lo de antes?', pose: 'thinking' },
    { text: 'Buenas tardes, un rato perfecto para crear.', pose: 'normal' },
    { text: '¡Hola! Pensaba en ti. ¿Qué creamos?', pose: 'normal' },
  ],
  welcome_evening: [
    { text: '¡Buenas noches! Aún hay tiempo para crear algo hoy.', pose: 'normal' },
    { text: 'Hola de nuevo, cerramos el día con algo bonito?', pose: 'thinking' },
    { text: 'Buenas noches, ¿una última idea antes de descansar?', pose: 'normal' },
    { text: '¡Hola! Las tardes también son buenas para crear.', pose: 'normal' },
  ],
  encourage: [
    { text: 'Veo que llevas unos días sin crear. No pasa nada, hoy es un buen día para volver.', pose: 'thinking' },
    { text: 'Cada gran contenido empieza con un primer paso. ¿Empezamos?', pose: 'normal' },
    { text: 'No te preocupes si no has podido, aquí estoy para ayudarte.', pose: 'normal' },
    { text: 'Tu comunidad está esperando. Vamos a crear algo para ellos.', pose: 'normal' },
    { text: 'Un pequeño contenido hoy es mejor que ninguno. Te ayudo.', pose: 'thinking' },
  ],
  celebrate: [
    { text: '¡Vaya, estás en racha! Sigamos así, estás increíble.', pose: 'celebrating' },
    { text: '¡Triunfas! Tres contenidos hoy, súper productiva.', pose: 'celebrating' },
    { text: '¡Lo estás petando! Tu comunidad lo va a notar.', pose: 'celebrating' },
    { text: 'Genial, así se hace. Estoy orgulloso de ti.', pose: 'celebrating' },
    { text: '¡Bravísima! Sigamos con esa energía.', pose: 'celebrating' },
  ],
  tip: [
    { text: 'Tip: los ganchos que generan curiosidad funcionan mejor en Reels.', pose: 'thinking' },
    { text: 'Tip: una pregunta en las Stories invita a participar a tu comunidad.', pose: 'thinking' },
    { text: 'Tip: programar contenido te ahorra tiempo. ¿Lo probamos?', pose: 'thinking' },
    { text: 'Tip: mostrar el antes y después es tu mejor aliado.', pose: 'thinking' },
    { text: 'Tip: tu voz es única, no copies, sé tú misma en cada publicación.', pose: 'thinking' },
  ],
  reminder: [
    { text: 'Tienes contenido programado. ¿Revisamos cómo va?', pose: 'normal' },
    { text: 'No olvides tu contenido pendiente de publicar.', pose: 'normal' },
    { text: 'Te recuerdo que tienes ideas guardadas en la biblioteca.', pose: 'normal' },
    { text: '¿Miramos tu calendario? Hay cosas programadas.', pose: 'thinking' },
  ],
  continue: [
    { text: '¿Continuamos donde lo dejamos?', pose: 'normal' },
    { text: 'Estabas creando algo. ¿Lo retomamos?', pose: 'thinking' },
    { text: 'Volviste, qué bien. ¿Seguimos con lo de antes?', pose: 'normal' },
    { text: 'Justo a tiempo, teníamos algo pendiente.', pose: 'normal' },
  ],
}

export interface BraviContext {
  lastSection?: string | null
  streak: number
  itemsToday: number
  hasScheduled: boolean
  hour: number // 0-23
}

// Pick category by context rules
export function pickCategory(ctx: BraviContext): BraviCategory {
  // Celebrate: 3+ items today
  if (ctx.itemsToday >= 3) return 'celebrate'
  // Encourage: no streak
  if (ctx.streak === 0 && ctx.itemsToday === 0) return 'encourage'
  // Continue: coming back to a section
  if (ctx.lastSection) return 'continue'
  // Reminder: has scheduled content
  if (ctx.hasScheduled) return 'reminder'
  // Welcome by time of day
  if (ctx.hour < 12) return 'welcome_morning'
  if (ctx.hour < 19) return 'welcome_afternoon'
  return 'welcome_evening'
}

const RECENT_KEY = 'bravi-recent-messages'
const MAX_RECENT = 3

// Pick a message avoiding recent ones (localStorage)
export function pickMessage(ctx: BraviContext): BraviMessage {
  const category = pickCategory(ctx)
  const pool = BRAVI_MESSAGES[category]
  if (typeof window === 'undefined') {
    return pool[0]
  }
  let recent: string[] = []
  try {
    recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    recent = []
  }
  const available = pool.filter(m => !recent.includes(m.text))
  const chosen = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : pool[Math.floor(Math.random() * pool.length)]
  const newRecent = [...recent, chosen.text].slice(-MAX_RECENT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent))
  } catch {
    // ignore
  }
  return chosen
}

// Default message for SSR / no context
export const DEFAULT_MESSAGE: BraviMessage = {
  text: '¡Hola! ¿Qué creamos hoy?',
  pose: 'normal',
}