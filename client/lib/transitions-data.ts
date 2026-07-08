// ── Librería de Transiciones Virales para Stories BRÄVE ─────────────
// Presets de transiciones aptas para contenido de estilistas.
// Pensadas para el formato viral (15-30s) del Script Manual BRÄVE.

export interface TransicionPreset {
  id: string
  nombre: string
  icono: string // emoji representativo
  descripcion: string // cómo se hace, 1-2 frases
  cuando: string // qué tipo de escena
  grupo: TransicionGrupo
}

export type TransicionGrupo = 'corte' | 'movimiento' | 'revelar' | 'energia'

export interface GrupoInfo {
  id: TransicionGrupo
  titulo: string
  emoji: string
  descripcion: string
}

export const GRUPOS_TRANSICION: GrupoInfo[] = [
  {
    id: 'corte',
    titulo: 'Cortes y match',
    emoji: '✂️',
    descripcion: 'Transiciones basadas en coincidencia visual entre planos.',
  },
  {
    id: 'movimiento',
    titulo: 'Movimiento y zoom',
    emoji: '🎥',
    descripcion: 'Transiciones que usan el movimiento de la cámara o el sujeto.',
  },
  {
    id: 'revelar',
    titulo: 'Revelados',
    emoji: '🎭',
    descripcion: 'Transiciones que muestran u ocultan algo para crear expectativa.',
  },
  {
    id: 'energia',
    titulo: 'Energía y ritmo',
    emoji: '⚡',
    descripcion: 'Transiciones rápidas que dan pulso viral al vídeo.',
  },
]

export const TRANSICIONES: TransicionPreset[] = [
  // ── Cortes y match ──
  {
    id: 'match-cut',
    nombre: 'Match Cut',
    icono: '🔗',
    descripcion:
      'Corta de un plano a otro manteniendo la misma posición o acción. Ej: mano en el cabello seco → misma mano en cabello ya teñido.',
    cuando: 'Para mostrar el antes/después sin corte visible. Ideal entre Story 1 y 3.',
    grupo: 'corte',
  },
  {
    id: 'jump-cut',
    nombre: 'Jump Cut',
    icono: '⏭️',
    descripcion:
      'Cortes rápidos eliminando fracciones de un plano continuo. Compacta el tiempo y acelera el ritmo.',
    cuando: 'Para comprimir un proceso largo (aplicación de color, lavado, secado).',
    grupo: 'corte',
  },
  {
    id: 'snap-transicion',
    nombre: 'Snap',
    icono: '👌',
    descripcion:
      'Acompaña un chasquido de dedos o palmada con un corte seco al siguiente plano. El sonido marca el cambio.',
    cuando: 'Para cambiar de problema a solución con energía. Cuenta como 1 beat.',
    grupo: 'corte',
  },

  // ── Movimiento y zoom ──
  {
    id: 'whip-pan',
    nombre: 'Whip Pan',
    icono: '💨',
    descripcion:
      'Mueve la cámara rápidamente hacia un lado creando motion blur. Al detenerse, ya estás en otra escena.',
    cuando: 'Para pasar de la entrada del salón a la silla de trabajo con dinamismo.',
    grupo: 'movimiento',
  },
  {
    id: 'zoom-in',
    nombre: 'Zoom In',
    icono: '🔍',
    descripcion:
      'Acércate rápidamente al detalle (raíz, mechón, producto) y corta cuando la imagen llene el plano.',
    cuando: 'Para enfocar el problema concreto (raíz oxidada, puntas abiertas) en Story 1.',
    grupo: 'movimiento',
  },
  {
    id: 'zoom-out',
    nombre: 'Zoom Out',
    icono: '🔭',
    descripcion:
      'Empieza en un detalle extremo y aleja la cámara para revelar el resultado completo.',
    cuando: 'Para revelar el resultado final en Story 3 partiendo de un primer plano.',
    grupo: 'movimiento',
  },
  {
    id: 'dolly-movimiento',
    nombre: 'Dolly suave',
    icono: '🛼',
    descripcion:
      'Avanza o retrocede la cámara lentamente hacia el sujeto. Transición sutil de aproximación.',
    cuando: 'Para acercarte a la clienta mientras explicas la autoridad en Story 2.',
    grupo: 'movimiento',
  },

  // ── Revelados ──
  {
    id: 'reveal-producto',
    nombre: 'Reveal de producto',
    icono: '🧴',
    descripcion:
      'Cubre el objetivo con la mano o el producto, retíralo y descubre lo que hay debajo.',
    cuando: 'Para presentar el producto estrella o el resultado tras la aplicación.',
    grupo: 'revelar',
  },
  {
    id: 'antes-despues',
    nombre: 'Antes / Después',
    icono: '🔄',
    descripcion:
      'Muestra el plano "antes", cubre con la mano o cámara, y retíralo para mostrar el "después".',
    cuando: 'Es la transición clásica del estilista. Perfecta para cerrar la secuencia.',
    grupo: 'revelar',
  },
  {
    id: 'cortina-reveal',
    nombre: 'Cortina',
    icono: '🪟',
    descripcion:
      'Desplaza un objeto (toalla, peine, secador) de lado a lado cubriendo el plano y revela la siguiente escena.',
    cuando: 'Para cambiar de escena con elegancia, sin sonido abrupto.',
    grupo: 'revelar',
  },
  {
    id: 'espejo-reveal',
    nombre: 'Reveal al espejo',
    icono: '🪞',
    descripcion:
      'La clienta se mira al espejo, la cámara la sigue. Al girar la cabeza, revela el resultado a cámara.',
    cuando: 'Para el momento "wow" de la clienta viendo su nuevo color por primera vez.',
    grupo: 'revelar',
  },

  // ── Energía y ritmo ──
  {
    id: 'glitch-suave',
    nombre: 'Glitch suave',
    icono: '📺',
    descripcion:
      'Aplica un efecto de distorsión breve (un frame) entre dos planos. Sutil, no agresivo.',
    cuando: 'Para dar modernidad al cambio de escena. Úsalo una sola vez por vídeo.',
    grupo: 'energia',
  },
  {
    id: 'flash-beat',
    nombre: 'Flash a beat',
    icono: '📸',
    descripcion:
      'Sincroniza un flash blanco con el beat de la música y corta justo en el golpe.',
    cuando: 'Para abrir el vídeo con gancho fuerte o marcar un cambio de escena clave.',
    grupo: 'energia',
  },
  {
    id: 'speed-ramp',
    nombre: 'Speed Ramp',
    icono: '🎚️',
    descripcion:
      'Ralentiza el plano y acelera bruscamente al cortar. Da sensación de impulso.',
    cuando: 'Para entrar con energía al resultado final tras un plano lento de proceso.',
    grupo: 'energia',
  },
  {
    id: 'shake-cambio',
    nombre: 'Shake de cambio',
    icono: '📳',
    descripcion:
      'Un pequeño temblor de cámara al cortar. Aporta urgencia y dinamismo sin tecnología.',
    cuando: 'Para transiciones rápidas entre 2-3 planos de proceso en Story 2.',
    grupo: 'energia',
  },
]