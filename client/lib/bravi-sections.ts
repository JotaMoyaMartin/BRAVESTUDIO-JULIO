// Bravi flotante — qué dice y qué ofrece en cada sección (22-oct-2026).
// Puro y determinista: el bocadillo de bienvenida y las preguntas rápidas
// cambian según la pantalla, para que Bravi se note atento y no repetitivo.

export interface BraviSection {
  /** Nombre de la sección tal y como lo ve la usuaria (se pasa a la IA). */
  name: string
  /** Bocadillo corto que asoma junto a Bravi la primera vez que entras. */
  nudge: string
  /** Preguntas rápidas para empezar a hablar en esta sección. */
  questions: string[]
}

const SECTIONS: { prefix: string; section: BraviSection }[] = [
  { prefix: '/crear-contenido', section: {
    name: 'Crear guiones',
    nudge: '¿Atascada con la idea? Cuéntamela y te ayudo a enfocarla.',
    questions: ['¿Qué gancho uso para un balayage?', '¿Cuánto debe durar mi reel?', '¿Cómo grabo si me da vergüenza?'],
  } },
  { prefix: '/banco-ganchos', section: {
    name: 'Banco de ganchos',
    nudge: '¿No sabes cuál elegir? Dime tu servicio y te digo.',
    questions: ['¿Qué gancho va mejor para conseguir clientas?', '¿Cómo adapto un gancho a mi salón?'],
  } },
  { prefix: '/stories', section: {
    name: 'Stories',
    nudge: '¿Te ayudo a elegir la secuencia de hoy?',
    questions: ['¿Cuántas stories subo al día?', '¿Qué sticker hace que me contesten?'],
  } },
  { prefix: '/carrusel', section: {
    name: 'Carruseles',
    nudge: 'La portada es lo que más importa. ¿La pensamos juntas?',
    questions: ['¿Qué pongo en la portada?', '¿Cuántas slides hago?'],
  } },
  { prefix: '/calendario', section: {
    name: 'Mi plan',
    nudge: '¿Organizamos tu semana en dos minutos?',
    questions: ['¿Cuántas veces publico a la semana?', '¿Qué día es mejor para publicar?'],
  } },
  { prefix: '/planificar', section: {
    name: 'Planificar el mes',
    nudge: 'Dime qué servicio quieres llenar y lo repartimos.',
    questions: ['¿Cómo mezclo reels, carruseles y stories?', '¿Cuántas veces publico a la semana?'],
  } },
  { prefix: '/inspiracion-reels', section: {
    name: 'Reels virales',
    nudge: '¿Te gusta uno? Te ayudo a hacerlo tuyo sin copiar.',
    questions: ['¿Cómo adapto este reel a mi salón?', '¿Qué reel me conviene grabar primero?'],
  } },
  { prefix: '/estudio', section: {
    name: 'Estudio de fotos',
    nudge: '¿Buscas pose o luz? Pregúntame.',
    questions: ['¿Qué foto pongo de perfil?', '¿Cómo saco buena luz en el salón?'],
  } },
  { prefix: '/editar-videos', section: {
    name: 'Editar vídeos',
    nudge: 'Sube tu reel y te quito los silencios. ¿Dudas?',
    questions: ['¿Pongo subtítulos siempre?', '¿Qué música uso?'],
  } },
  { prefix: '/biblioteca', section: {
    name: 'Biblioteca',
    nudge: '¿Qué publicamos hoy de lo que tienes guardado?',
    questions: ['¿Qué publico primero?', '¿Cómo lo paso a mi plan?'],
  } },
  { prefix: '/analisis', section: {
    name: 'Análisis de Instagram',
    nudge: '¿Te explico qué significan tus números?',
    questions: ['¿Qué número miro primero?', '¿Por qué bajan mis visualizaciones?'],
  } },
  { prefix: '/mi-marca', section: {
    name: 'Mi Marca',
    nudge: 'Con 5 minutos aquí, todo lo demás sale a tu medida.',
    questions: ['¿Qué pongo en mi cliente ideal?', '¿Para qué sirve mi estrategia?'],
  } },
]

const DEFAULT_SECTION: BraviSection = {
  name: 'BRÄVE Studio',
  nudge: '¿Te echo una mano?',
  questions: ['¿Por dónde empiezo?', '¿Cómo consigo más clientas?'],
}

export function braviSectionFor(pathname: string | null | undefined): BraviSection {
  if (!pathname) return DEFAULT_SECTION
  return SECTIONS.find(s => pathname === s.prefix || pathname.startsWith(s.prefix + '/'))?.section ?? DEFAULT_SECTION
}

/** Pantallas donde Bravi flotante NO aparece: Inicio ya tiene el chat dentro,
 *  y el teleprompter es pantalla de grabación. */
export function braviFabHidden(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  // Inicio tiene su barra y Asistente el chat abierto: la burbuja sobra.
  return pathname === '/inicio' || pathname === '/asistente' || pathname.startsWith('/teleprompter')
}
