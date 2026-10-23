/**
 * PLANTILLAS CON ARTE (23-oct-2026). El fondo es una imagen generada UNA vez
 * con Higgsfield y guardada en /public/stories-arte (polaroids, móvil,
 * tarjetas, menú…). Encima, en HTML, van SUS fotos (en los huecos medidos
 * sobre la imagen) y sus textos. La estilista no espera ni gasta nada.
 * Coordenadas en px sobre el lienzo de 1080×1920.
 */

export type StoryCategory = 'antes-despues' | 'resenas' | 'servicios' | 'historia' | 'ubicacion' | 'consejos'

export const STORY_CATEGORIES: Array<{ id: StoryCategory; label: string }> = [
  { id: 'antes-despues', label: 'Antes y después' },
  { id: 'resenas', label: 'Reseñas' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'historia', label: 'Mi historia' },
  { id: 'ubicacion', label: 'Ubicación y reservas' },
  { id: 'consejos', label: 'Consejos y avisos' },
]

export interface MockupSlot {
  id: string
  label: string
  x: number; y: number; w: number; h: number
  radius?: number
  /** Foto de ejemplo (banco BRÄVE) hasta que suba la suya. */
  sample: string
  /** Etiqueta pequeña encima de la foto (p. ej. «ANTES»). */
  tag?: string
}

export interface MockupText {
  id: string
  label: string
  value: string
  x: number; y: number; w: number; h: number
  font: 'serif' | 'script' | 'sans'
  size: number
  color: string
  align?: 'left' | 'center'
  italic?: boolean
  upper?: boolean
  /** Varias líneas (lista de servicios, reseña…). */
  multiline?: boolean
  /** Fondo crema detrás del texto (para leerse sobre una foto). */
  panel?: boolean
}

export interface MockupTemplate {
  id: string
  name: string
  hint: string
  category: StoryCategory
  art: string
  slots: MockupSlot[]
  texts: MockupText[]
}

const BURDEOS = '#591427'
const TINTA = '#2B1A1F'
const CREMA = '#F4EDE4'
const BEFORE = '/banco-ia/morenas/morena-ondas-espalda.jpg'
const AFTER = '/banco-ia/rubios/rubio-balayage-espalda.jpg'

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    id: 'ad-polaroids-marmol', name: 'Polaroids en mármol', hint: 'Tu antes y después en dos polaroids', category: 'antes-despues',
    art: '/stories-arte/ad-polaroids-marmol.jpg',
    slots: [
      { id: 'antes', label: 'Foto del antes', x: 332, y: 348, w: 428, h: 440, sample: BEFORE },
      { id: 'despues', label: 'Foto del después', x: 332, y: 1052, w: 428, h: 444, sample: AFTER },
    ],
    texts: [
      { id: 't1', label: 'Bajo la primera', value: 'Antes', x: 332, y: 800, w: 428, h: 100, font: 'script', size: 70, color: BURDEOS, align: 'center' },
      { id: 't2', label: 'Bajo la segunda', value: 'Después', x: 332, y: 1506, w: 428, h: 100, font: 'script', size: 70, color: BURDEOS, align: 'center' },
    ],
  },
  {
    id: 'ad-polaroids-lino', name: 'Polaroids en lino', hint: 'Cálido y natural, para cualquier cambio', category: 'antes-despues',
    art: '/stories-arte/ad-polaroids-lino.jpg',
    slots: [
      { id: 'antes', label: 'Foto del antes', x: 316, y: 332, w: 456, h: 456, sample: BEFORE },
      { id: 'despues', label: 'Foto del después', x: 316, y: 1060, w: 456, h: 456, sample: AFTER },
    ],
    texts: [
      { id: 't1', label: 'Bajo la primera', value: 'ANTES', x: 316, y: 812, w: 456, h: 80, font: 'sans', size: 34, color: TINTA, align: 'center', upper: true },
      { id: 't2', label: 'Bajo la segunda', value: 'DESPUÉS', x: 316, y: 1540, w: 456, h: 80, font: 'sans', size: 34, color: TINTA, align: 'center', upper: true },
    ],
  },
  {
    id: 'ad-marco-burdeos', name: 'Marcos burdeos', hint: 'Elegante, con el nombre del servicio en medio', category: 'antes-despues',
    art: '/stories-arte/ad-marco-burdeos.jpg',
    slots: [
      { id: 'antes', label: 'Foto del antes', x: 194, y: 370, w: 696, h: 444, sample: BEFORE, tag: 'ANTES' },
      { id: 'despues', label: 'Foto del después', x: 196, y: 1114, w: 698, h: 444, sample: AFTER, tag: 'DESPUÉS' },
    ],
    texts: [
      { id: 't1', label: 'Servicio', value: 'Balayage caramelo', x: 120, y: 870, w: 840, h: 200, font: 'serif', size: 84, color: CREMA, align: 'center', italic: true },
    ],
  },
  {
    id: 'ad-movil-tocador', name: 'En el móvil', hint: 'Antes arriba, después abajo, en un móvil del salón', category: 'antes-despues',
    art: '/stories-arte/ad-movil-tocador.jpg',
    slots: [
      { id: 'antes', label: 'Foto del antes', x: 376, y: 732, w: 332, h: 386, radius: 0, sample: BEFORE, tag: 'ANTES' },
      { id: 'despues', label: 'Foto del después', x: 376, y: 1118, w: 332, h: 386, radius: 0, sample: AFTER, tag: 'DESPUÉS' },
    ],
    texts: [
      { id: 't1', label: 'Título', value: 'Del antes **al después**', x: 120, y: 360, w: 840, h: 220, font: 'serif', size: 84, color: BURDEOS, align: 'center', panel: true },
    ],
  },
  {
    id: 'resena-tarjeta', name: 'Reseña en tarjeta', hint: 'Las palabras de tu clienta, bonitas', category: 'resenas',
    art: '/stories-arte/testimonio-tarjeta-marmol.jpg',
    slots: [],
    texts: [
      { id: 'cita', label: 'Lo que dijo', value: '«Por fin un rubio que no amarillea. Me siento yo.»', x: 190, y: 730, w: 700, h: 360, font: 'serif', size: 64, color: BURDEOS, align: 'center', italic: true, multiline: true },
      { id: 'quien', label: 'Quién lo dice', value: 'Laura · clienta desde 2024', x: 190, y: 1110, w: 700, h: 80, font: 'sans', size: 30, color: TINTA, align: 'center' },
    ],
  },
  {
    id: 'resena-movil', name: 'Captura de reseña', hint: 'Pon la captura del mensaje o la reseña de Google', category: 'resenas',
    art: '/stories-arte/ad-movil-tocador.jpg',
    slots: [
      { id: 'captura', label: 'Captura de la reseña', x: 376, y: 732, w: 332, h: 772, sample: '/banco-ia/melenas/melena-ondas-caramelo.jpg' },
    ],
    texts: [
      { id: 't1', label: 'Título', value: 'Lo que dicen **mis clientas**', x: 120, y: 360, w: 840, h: 220, font: 'serif', size: 80, color: BURDEOS, align: 'center', panel: true },
    ],
  },
  {
    id: 'servicios-menu', name: 'Carta de servicios', hint: 'Tus servicios y precios, como un menú', category: 'servicios',
    art: '/stories-arte/servicios-menu-marmol.jpg',
    slots: [],
    texts: [
      { id: 'titulo', label: 'Título', value: 'Servicios', x: 320, y: 500, w: 448, h: 140, font: 'script', size: 96, color: BURDEOS, align: 'center' },
      { id: 'lista', label: 'Servicios y precios (uno por línea)', value: 'Balayage · desde 90 €\nColor raíz · 45 €\nCorte y peinado · 35 €\nTratamiento brillo · 25 €\nRecogido · desde 40 €', x: 326, y: 680, w: 436, h: 620, font: 'sans', size: 34, color: TINTA, align: 'center', multiline: true },
      { id: 'pie', label: 'Al final', value: 'Reserva por WhatsApp', x: 330, y: 1360, w: 428, h: 100, font: 'serif', size: 40, color: BURDEOS, align: 'center', italic: true },
    ],
  },
  {
    id: 'historia-polaroid', name: 'Mi historia', hint: 'Una foto tuya y quién eres', category: 'historia',
    art: '/stories-arte/historia-polaroid-tocador.jpg',
    slots: [
      { id: 'yo', label: 'Tu foto', x: 324, y: 724, w: 516, h: 604, sample: '/perfil/ejemplo-retrato.jpg' },
    ],
    texts: [
      { id: 'hola', label: 'Saludo', value: 'Hola, soy Laura', x: 120, y: 290, w: 840, h: 130, font: 'script', size: 96, color: BURDEOS, align: 'center', panel: true },
      { id: 'texto', label: 'Tu historia (2 líneas)', value: 'Peino desde hace 12 años.\nMe encanta que te veas tú, pero mejor.', x: 160, y: 430, w: 760, h: 190, font: 'sans', size: 34, color: TINTA, align: 'center', multiline: true, panel: true },
    ],
  },
  {
    id: 'ubicacion-entrada', name: 'Te espero aquí', hint: 'Dirección, horario y cómo reservar', category: 'ubicacion',
    art: '/stories-arte/ubicacion-entrada-salon.jpg',
    slots: [],
    texts: [
      { id: 'titulo', label: 'Título', value: 'Te espero **aquí**', x: 90, y: 250, w: 900, h: 170, font: 'serif', size: 110, color: BURDEOS, align: 'center' },
      { id: 'dir', label: 'Dirección', value: 'Calle Mayor 12 · Logroño', x: 90, y: 430, w: 900, h: 64, font: 'sans', size: 38, color: TINTA, align: 'center' },
      { id: 'horario', label: 'Horario', value: 'Martes a sábado · 9:30 a 19:30', x: 90, y: 498, w: 900, h: 60, font: 'sans', size: 32, color: TINTA, align: 'center' },
      { id: 'reserva', label: 'Cómo reservar', value: 'Reserva por WhatsApp ↓', x: 90, y: 566, w: 900, h: 66, font: 'serif', size: 44, color: BURDEOS, align: 'center', italic: true },
    ],
  },
]

/** Plantillas antiguas (ComposedSlide) → categoría. */
export const CLASSIC_CATEGORY: Record<string, StoryCategory> = {
  frase: 'consejos', novedad: 'servicios', pregunta: 'consejos', opinion: 'resenas', huecos: 'ubicacion', promo: 'servicios', secuencia: 'consejos',
}

export function mockupTemplate(id: string | null | undefined): MockupTemplate | undefined {
  return MOCKUP_TEMPLATES.find(t => t.id === id)
}

/** Texto con **resaltado** → trozos (el resaltado va en cursiva). */
export function splitHighlight(s: string): Array<{ text: string; hi: boolean }> {
  return s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(p => (p.startsWith('**') ? { text: p.slice(2, -2), hi: true } : { text: p, hi: false }))
}
