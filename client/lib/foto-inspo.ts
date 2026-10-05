// Foto inspo — referencias fotográficas para que la estilista se haga fotos
// (petición Jota, 5-oct-2026). MVP estático: catálogo en lib, sin BD.
// Las portadas las dará Jota de a una (igual que las tiles): `cover: null`
// hasta entonces — la UI muestra placeholder.

export type FotoInspoCategoryId = 'selfie' | 'poses' | 'plano-cafe' | 'detalles'

export interface FotoInspoItem {
  id: string
  categoryId: FotoInspoCategoryId
  title: string
  /** Tip de Bravi: POR QUÉ esa foto funciona (1-2 frases). */
  tip: string
  cover: string | null
}

export interface FotoInspoCategory {
  id: FotoInspoCategoryId
  name: string
  blurb: string
}

export const FOTO_INSPO_CATEGORIES: FotoInspoCategory[] = [
  {
    id: 'selfie',
    name: 'Selfie estilista',
    blurb: 'la foto que humaniza tu perfil',
  },
  {
    id: 'poses',
    name: 'Posando',
    blurb: 'cómo sostener el salón en una pose',
  },
  {
    id: 'plano-cafe',
    name: 'Plano de café',
    blurb: 'el lifestyle que genera confianza',
  },
  {
    id: 'detalles',
    name: 'Tijeras y detalles',
    blurb: 'los planos de trabajo que enseñan oficio',
  },
]

export const FOTO_INSPO_ITEMS: FotoInspoItem[] = [
  // ── Selfie estilista ─────────────────────────────────────────
  {
    id: 'selfie-bien-del-dia',
    categoryId: 'selfie',
    title: 'El selfie de bien del día',
    tip: 'Una cara amable a primera hora te hace más cercana. Que se adivine el salón al fondo: tu cara ES la marca.',
    cover: null,
  },
  {
    id: 'selfie-en-plena-faena',
    categoryId: 'selfie',
    title: 'Selfie en plena faena',
    tip: 'Con el peine a medio uso o los guantes del tinte puestos enseñas que trabajas de verdad. Mira a cámara y sonríe sin exagerar.',
    cover: null,
  },
  {
    id: 'selfie-espejo-look',
    categoryId: 'selfie',
    title: 'Selfie de espejo con tu look',
    tip: 'Tu propio corte o color es tu mejor tarjeta: quien lo ve puesto se lo quiere hacer igual. Luz de ventana y poco más.',
    cover: null,
  },

  // ── Posando ──────────────────────────────────────────────────
  {
    id: 'pose-sillon-trabajo',
    categoryId: 'poses',
    title: 'Apoyada en tu sillón de trabajo',
    tip: 'Sentirte dueña de tu salón en la pose da autoridad tranquila: no posas, presentas tu sitio. Hombros sueltos y sonrisa media.',
    cover: null,
  },
  {
    id: 'pose-estacion',
    categoryId: 'poses',
    title: 'De pie junto a tu estación',
    tip: 'La imagen de quien domina el espacio vende seguridad. Colócate de tres cuartos, no de frente: saldrás más natural.',
    cover: null,
  },
  {
    id: 'pose-brazos-cruzados',
    categoryId: 'poses',
    title: 'Brazos cruzados mirando a cámara',
    tip: 'Una pose firme con sonrisa dice "experta accesible". Si el fondo muestra tu trabajo, mejor: el salón es el escenario.',
    cover: null,
  },

  // ── Plano de café ────────────────────────────────────────────
  {
    id: 'cafe-barra',
    categoryId: 'plano-cafe',
    title: 'El café en la barra',
    tip: 'La taza sobre la barra impecable transmite calma y salón cuidado. Es el plano lifestyle que hace que quieran venir a estar aquí.',
    cover: null,
  },
  {
    id: 'cafe-manos-taza',
    categoryId: 'plano-cafe',
    title: 'Tus manos con la taza',
    tip: 'Primer plano de manos con la taza (y un anillo, si te gustan) humaniza sin enseñar cara. Da ganas de parar a charlar contigo.',
    cover: null,
  },
  {
    id: 'cafe-ventana',
    categoryId: 'plano-cafe',
    title: 'Café junto a la ventana',
    tip: 'El contraluz suave de la mañana es luz gratis que favorece. Este plano dice "aquí se sabe estar" sin escribir nada.',
    cover: null,
  },

  // ── Tijeras y detalles ───────────────────────────────────────
  {
    id: 'detalle-tijeras-peine',
    categoryId: 'detalles',
    title: 'Tijeras y peine en la mesa',
    tip: 'Las herramientas bien puestas enseñan oficio antes de decir palabra. Busca la luz sobre las tijeras y fondo limpio.',
    cover: null,
  },
  {
    id: 'detalle-manos-corte',
    categoryId: 'detalles',
    title: 'Manos en pleno corte',
    tip: 'Las manos trabajando son EL plano de oficio: demuestran que sabes hacer y detienen el scroll. Acércate, sin miedo.',
    cover: null,
  },
  {
    id: 'detalle-estacion-frascos',
    categoryId: 'detalles',
    title: 'Tu estación de frascos y colores',
    tip: 'Colores alineados y frascos limpios comunican higiene y orden: dos cosas que las clientas miran antes de sentarse.',
    cover: null,
  },
]