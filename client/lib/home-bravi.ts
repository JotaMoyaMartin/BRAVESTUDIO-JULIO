// ASISTENTE BRÄVE — checklist de próximos pasos + preguntas frecuentes.
// Puro y determinista (sin I/O, sin React): la Home pasa los contadores reales
// y esta lib decide el orden del recorrido. Igual de sobria que home-today.ts.

export interface BraviStep {
  id: string
  label: string
  desc: string
  href: string
  done: boolean
}

export interface ChecklistInput {
  brandState: string | null
  isPremium: boolean
  totalItems: number
  storiesCount: number
  weekCreated: number
  weekPublished: number
}

/**
 * Recorrido guiado de la usuaria. Orden fijo: los pasos done conservan su
 * sitio (checklist visual), nunca se reordenan ni desaparecen.
 * Non-premium: marca, guion, stories, planificar, publicar — 5 pasos.
 * Premium: marca, guion, planificar, métricas — 4 pasos (sin stories/calentar, con métricas).
 */
export function buildBraviChecklist(input: ChecklistInput): BraviStep[] {
  const steps: BraviStep[] = [
    {
      id: 'marca',
      label: 'Introduce la información de tu marca',
      desc: '5 minutos que personalizan todo lo que BRÄVE te va a sugerir',
      href: '/mi-marca',
      done: input.brandState === 'complete',
    },
    {
      id: 'guion',
      label: 'Crea tu primer guion',
      desc: 'Un Reel con el método de BRÄVE, listo en minutos',
      href: '/crear-contenido',
      done: input.totalItems > 0,
    },
  ]
  if (input.isPremium) {
    steps.push(
      {
        id: 'planificar-premium',
        label: 'Planifica tu contenido',
        desc: 'Tu semana decidida antes de que llegue el ruido',
        href: '/planificar',
        done: input.weekCreated > 0,
      },
      {
        id: 'metricas',
        label: 'Revisa tus métricas',
        desc: 'Qué contenido funciona en tu salón y qué repetir',
        href: '/metricas',
        done: input.weekPublished > 0,
      },
    )
  } else {
    steps.push(
      {
        id: 'stories',
        label: 'Prueba una secuencia de Stories',
        desc: 'Tres Stories con sticker para que te contesten',
        href: '/stories',
        done: input.storiesCount > 0,
      },
      {
        id: 'planificar',
        label: 'Planifica tu semana',
        desc: 'Cinco minutos para decidir tus publicaciones',
        href: '/planificar',
        done: input.weekCreated > 0,
      },
      {
        id: 'publicar',
        label: 'Publica y mide',
        desc: 'Mira qué funciona y repite lo que trae clientas',
        href: '/calendario',
        done: input.weekPublished > 0,
      },
    )
  }
  return steps
}

/**
 * Preguntas frecuentes del asistente: cuando la usuaria está perdida pulsa
 * una y Bravi contesta. El hint da el contexto de para qué sirve la IA ahí.
 */
export const BRAVI_FAQ: { q: string; hint: string }[] = [
  {
    q: '¿Por dónde empiezo?',
    hint: 'La IA mira tu salón y te marca el paso de hoy en los Próximos pasos.',
  },
  {
    q: '¿Cómo consigo más clientas?',
    hint: 'La IA te prepara guiones de tu servicio estrella, pensados para atraer clientas nuevas.',
  },
  {
    q: '¿Por qué una estrategia?',
    hint: 'La estrategia le enseña a la IA quién eres: todo lo que genere después saldrá con tu voz.',
  },
  {
    q: '¿Cómo guardo lo que creo?',
    hint: 'Nada se pierde: lo que la IA genera va a tu Biblioteca y de ahí al Calendario.',
  },
]