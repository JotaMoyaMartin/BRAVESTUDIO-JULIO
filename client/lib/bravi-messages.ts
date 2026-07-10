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
  | 'reto_10k_start'
  | 'reto_10k_day'
  | 'reto_10k_week'
  | 'reto_10k_phase'
  | 'reto_10k_complete'
  | 'reto_10k_streak'
  | 'section_crear'
  | 'section_planificar'
  | 'section_reto10k'
  | 'section_stories'
  | 'section_mi_marca'
  | 'section_biblioteca'
  | 'section_calendario'
  | 'section_inspiracion'
  | 'section_transiciones'
  | 'section_account'

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
  reto_10k_start: [
    { text: '¡Hoy empieza tu transformación! 30 días, 30 misiones, un nuevo tú.', pose: 'celebrating' },
    { text: 'Vamos a construir tu presencia en Instagram paso a paso. Yo te guío.', pose: 'normal' },
    { text: 'Confía en el proceso. Cada día una misión, cada misión un paso.', pose: 'normal' },
    { text: 'Tu comunidad te está esperando. Es hora de mostrarte al mundo.', pose: 'thinking' },
  ],
  reto_10k_day: [
    { text: '¡Nuevo día del Reto! Misión de hoy lista para ti. ¡Tú puedes!', pose: 'normal' },
    { text: 'Cada contenido cuenta. Vas por buen camino, sigue así.', pose: 'normal' },
    { text: 'Hoy toca una misión nueva. Recuerda, hecho es mejor que perfecto.', pose: 'thinking' },
    { text: 'Día a día se construye la transformación. No pares ahora.', pose: 'normal' },
    { text: 'Tu misión de hoy te espera. Yo sé que la vas a clavar.', pose: 'celebrating' },
  ],
  reto_10k_week: [
    { text: '¡Has completado otra semana del Reto! Vamos a generar tu contenido.', pose: 'celebrating' },
    { text: 'Nueva semana, nuevas ideas. Deja que te ayude a planificar.', pose: 'normal' },
    { text: 'Es momento de crear tu contenido semanal. ¡Genera y guarda!', pose: 'normal' },
    { text: 'Una semana más de progreso. Tu constancia te está transformando.', pose: 'thinking' },
  ],
  reto_10k_phase: [
    { text: '¡Nueva fase del Reto! Estás evolucionando como estilista.', pose: 'celebrating' },
    { text: 'Fase completada y nueva etapa. ¡Vas por más!', pose: 'normal' },
    { text: 'Subes de nivel. Esta fase te lleva un paso más allá.', pose: 'thinking' },
    { text: 'Cada fase tiene su reto. Confía en ti, lo estás haciendo genial.', pose: 'normal' },
  ],
  reto_10k_complete: [
    { text: '¡Completaste el Reto 10K! 30 días de transformación. ¡Orgullosa de ti!', pose: 'celebrating' },
    { text: 'Eres oficialmente una estilista referente. Lo lograste.', pose: 'celebrating' },
    { text: '30 días, 30 misiones, infinitas posibilidades. ¡Enhorabuena!', pose: 'celebrating' },
    { text: 'Tu transformación es real. Tu comunidad lo nota. Lo lograste.', pose: 'normal' },
  ],
  reto_10k_streak: [
    { text: '¡Qué racha! Eres imparable. Sigue así.', pose: 'celebrating' },
    { text: 'Llevas días seguidos creando contenido. Así se hace.', pose: 'normal' },
    { text: 'Tu racha es tu mejor prueba de constancia. ¡Bravo!', pose: 'celebrating' },
    { text: '¡Fuego! Días sin parar. No bajes el ritmo ahora.', pose: 'normal' },
  ],
  section_crear: [
    { text: 'Escribe tu idea y yo te ayudo a convertirla en un guión.', pose: 'normal' },
    { text: '¿Tienes una idea en mente? Cuéntamela y la convertimos en contenido.', pose: 'thinking' },
    { text: 'El gancho lo es todo. Los primeros 3 segundos deciden si se quedan.', pose: 'thinking' },
    { text: 'No lo pienses mucho, escribe y yo me encargo del resto.', pose: 'normal' },
    { text: 'Tu próximo reels empieza aquí. Vamos a crearlo juntos.', pose: 'celebrating' },
  ],
  section_planificar: [
    { text: 'Planifica con calma. Un buen plan = semanas sin estrés.', pose: 'normal' },
    { text: 'Piensa en tu semana. ¿Qué quieres promocionar? Yo te ayudo.', pose: 'thinking' },
    { text: 'Programar contenido es regalarle paz a tu mente. Vamos.', pose: 'normal' },
    { text: 'Un calendario lleno = agenda llena. Planifiquemos juntos.', pose: 'normal' },
    { text: 'La diferencia entre caos y éxito está en planificar. Empezamos?', pose: 'thinking' },
  ],
  section_reto10k: [
    { text: 'Un día a la vez. Cada reels publicado te acerca a 10K.', pose: 'normal' },
    { text: 'Estás en el Reto 10K. Confía en el proceso, yo te guío.', pose: 'normal' },
    { text: 'La constancia vence al talento. Sigue tu plan día a día.', pose: 'thinking' },
    { text: 'Tu transformación está en marcha. No pares ahora.', pose: 'celebrating' },
    { text: '30 días, 30 misiones. Cada una te hace más visible.', pose: 'normal' },
  ],
  section_stories: [
    { text: 'Las stories conectan con tu día a día. ¡Cuéntalo!', pose: 'normal' },
    { text: 'Una story rápida puede llenar tu agenda. ¿Qué cuentas hoy?', pose: 'thinking' },
    { text: 'Muestra tu día en el salón. A la gente le encanta ver el detrás.', pose: 'normal' },
    { text: 'Las stories son tu mejor herramienta para conectar. Úsalas.', pose: 'thinking' },
    { text: 'Una pregunta, una encuesta, un detrás de cámaras. ¡Simple!', pose: 'celebrating' },
  ],
  section_mi_marca: [
    { text: 'Tu marca única es tu superpoder. Definámosla juntos.', pose: 'normal' },
    { text: 'Saber qué te hace diferente te hace inolvidable. Empecemos.', pose: 'thinking' },
    { text: 'Una marca clara atrae a las clientas correctas. Vamos a ello.', pose: 'normal' },
    { text: 'Tu estilo, tu voz, tu marca. Aquí lo definimos paso a paso.', pose: 'normal' },
    { text: 'El camino hacia ser referente empieza definiendo tu marca.', pose: 'thinking' },
  ],
  section_biblioteca: [
    { text: 'Aquí está todo lo que has creado. ¡Reutiliza y recicla!', pose: 'normal' },
    { text: 'Tu biblioteca es tu tesoro. Lo que guardas hoy te ahorra tiempo mañana.', pose: 'thinking' },
    { text: '¿Buscas algo? Filtra por tipo y encuentra justo lo que necesitas.', pose: 'normal' },
    { text: 'Las ideas guardadas son tu red de seguridad. Nunca te quedas sin contenido.', pose: 'normal' },
    { text: '¡Mira todo lo que has creado! Estás progresando. Bravísimo.', pose: 'celebrating' },
  ],
  section_calendario: [
    { text: 'Programar es regalarle paz a tu mente. Vamos.', pose: 'normal' },
    { text: 'Tu calendario es tu mapa. ¿A dónde vamos hoy?', pose: 'thinking' },
    { text: 'Arrastra tus ideas a la fecha que quieras. Súper fácil.', pose: 'normal' },
    { text: 'Un día con contenido programado es un día sin estrés.', pose: 'normal' },
    { text: '¿Qué fecha necesita una idea? Yo te ayudo a colocarla.', pose: 'thinking' },
  ],
  section_inspiracion: [
    { text: '¡Encuentra tu próxima idea! Guarda las que te gusten con la estrella.', pose: 'celebrating' },
    { text: 'Pulsa cualquier tarjeta para verla completa. ¡Guarda tus favoritas!', pose: 'normal' },
    { text: 'La inspiración está en todas partes. Toma la que necesites.', pose: 'thinking' },
    { text: '¿No sabes qué crear? Mira estas ideas y guarda las que te gusten.', pose: 'normal' },
    { text: 'Cada idea aquí es una oportunidad para tu próximo reels.', pose: 'normal' },
  ],
  section_transiciones: [
    { text: '¡Estas transiciones harán que tus reels enganchen! Guarda las que quieras probar.', pose: 'celebrating' },
    { text: 'Pulsa cualquier tarjeta para verla. ¡Guarda tus favoritas con la estrella!', pose: 'normal' },
    { text: 'Una buena transición hace que la gente vea tu reels hasta el final.', pose: 'thinking' },
    { text: 'Prueba una nueva transición hoy. Tu engagement lo notará.', pose: 'normal' },
    { text: 'Transiciones suaves = reels que enganchan. Elige la tuya.', pose: 'normal' },
  ],
  section_account: [
    { text: 'Tu cuenta, tu espacio. Aquí mandas tú.', pose: 'normal' },
    { text: '¿Cambiar algo? Adelante, todo está a tu alcance aquí.', pose: 'normal' },
    { text: 'Mantener tu perfil al día ayuda a que todo funcione mejor.', pose: 'thinking' },
    { text: 'Tu información actualizada = mejor contenido personalizado.', pose: 'normal' },
    { text: 'Aquí puedes ajustar todo a tu gusto. Tú decides.', pose: 'normal' },
  ],
}

export interface BraviContext {
  section?: string
  lastSection?: string | null
  streak: number
  itemsToday: number
  hasScheduled: boolean
  hour: number // 0-23
  retoActive?: boolean
  retoStatus?: string
  retoDay?: number
  retoItemsCount?: number
}

// Pick category by context rules
export function pickCategory(ctx: BraviContext): BraviCategory {
  // Section-specific messages (highest priority)
  if (ctx.section === 'crear-contenido') return 'section_crear'
  if (ctx.section === 'planificar') return 'section_planificar'
  if (ctx.section === 'reto-10k') return 'section_reto10k'
  if (ctx.section === 'stories') return 'section_stories'
  if (ctx.section === 'mi-marca') return 'section_mi_marca'
  if (ctx.section === 'biblioteca') return 'section_biblioteca'
  if (ctx.section === 'calendario') return 'section_calendario'
  if (ctx.section === 'inspiracion-reels') return 'section_inspiracion'
  if (ctx.section === 'transiciones-reels') return 'section_transiciones'
  if (ctx.section === 'account') return 'section_account'
  // Reto 10K complete
  if (ctx.retoActive && ctx.retoStatus === 'completed') return 'reto_10k_complete'
  // Reto 10K streak (5+ days)
  if (ctx.retoDay && ctx.retoDay >= 5 && ctx.retoActive) return 'reto_10k_streak'
  // Reto 10K day
  if (ctx.retoActive && ctx.retoDay && ctx.retoDay >= 1) return 'reto_10k_day'
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