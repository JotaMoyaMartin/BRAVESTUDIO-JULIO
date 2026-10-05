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
    cover: '/foto-inspo/selfie-bien-del-dia.jpg',
  },
  {
    id: 'selfie-en-plena-faena',
    categoryId: 'selfie',
    title: 'Selfie en plena faena',
    tip: 'Con el spray, el peine a medio uso o los guantes del tinte puestos enseñas que trabajas de verdad. Mira a cámara y sonríe sin exagerar.',
    cover: '/foto-inspo/selfie-en-plena-faena.jpg',
  },
  {
    id: 'selfie-espejo-look',
    categoryId: 'selfie',
    title: 'Selfie de espejo con tu look',
    tip: 'Tu propio corte o color es tu mejor tarjeta: mirada de lado, móvil a media cara y el salón al fondo. Quien lo ve puesto se lo quiere hacer igual.',
    cover: '/foto-inspo/selfie-espejo-look.jpg',
  },

  // ── Posando ──────────────────────────────────────────────────
  {
    id: 'pose-outfit-espejo',
    categoryId: 'poses',
    title: 'Tu outfit completo en el espejo',
    tip: 'La pose de cuerpo entero con tu ropa de trabajar dice estilista moderna y segura. Móvil tapando media cara y actitud: el foco es tu presencia.',
    cover: '/foto-inspo/selfie-faena-outfit.jpg',
  },
  {
    id: 'pose-sillon-trabajo',
    categoryId: 'poses',
    title: 'Apoyada en tu sillón de trabajo',
    tip: 'Sentirte dueña de tu salón en la pose da autoridad tranquila: no posas, presentas tu sitio. Salón claro al fondo, hombros sueltos y sonrisa media.',
    cover: '/foto-inspo/pose-sillon-trabajo.jpg',
  },
  {
    id: 'pose-brazos-cruzados',
    categoryId: 'poses',
    title: 'Brazos cruzados mirando a cámara',
    tip: 'Una pose firme con sonrisa dice "experta accesible". Tijeras y peine en la mano sellan el oficio antes de decir palabra.',
    cover: '/foto-inspo/pose-brazos-cruzados.jpg',
  },
  {
    id: 'pose-taburete-tijeras',
    categoryId: 'poses',
    title: 'Sentada en tu taburete, tijeras en mano',
    tip: 'Sentada con tu tijera y una sonrisa grande amables y de oficio a la vez. Fondo claro y limpio: tú y tu herramienta son la foto.',
    cover: '/foto-inspo/pose-taburete-tijeras.jpg',
  },
  {
    id: 'pose-secador-bn',
    categoryId: 'poses',
    title: 'Actitud B/N con tu secador',
    tip: 'Blanco y negro + gafas de sol: la foto editorial que rompe el scroll. El secador como accesorio le da humor y oficio al mismo tiempo.',
    cover: '/foto-inspo/pose-secador-bn.jpg',
  },
  {
    id: 'pose-plancha',
    categoryId: 'poses',
    title: 'De pie, plancha en mano',
    tip: 'Cuerpo entero con tu plancha al aire dice "trabajo con esto todos los días". Ropa cuidada y fondo liso: la herramienta es la protagonista.',
    cover: '/foto-inspo/pose-plancha.jpg',
  },
  {
    id: 'pose-herramientas-brazos',
    categoryId: 'poses',
    title: 'Tus herramientas en brazos',
    tip: 'Abrazar lo que usas cada día comunica orgullo de oficio. Cepillos, secador y spray: una imagen que resume todo tu trabajo.',
    cover: '/foto-inspo/pose-herramientas-brazos.jpg',
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
    id: 'detalle-tijeras-al-aire',
    categoryId: 'detalles',
    title: 'Tijeras al aire',
    tip: 'Sujetar tus tijeras con seguridad y mirada firme dice "aquí manda el oficio". Blanco y negro va bien si la luz es sencilla.',
    cover: '/foto-inspo/tijeras-al-aire.jpg',
  },
  {
    id: 'detalle-tijeras-camara',
    categoryId: 'detalles',
    title: 'Las tijeras hacia cámara',
    tip: 'Acércate y lanza la tijera al objetivo: el primer plano detiene el scroll al instante. Tu cara amable al fondo, mejor.',
    cover: '/foto-inspo/detalle-tijeras-camara.jpg',
  },
  {
    id: 'detalle-tarjeta',
    categoryId: 'detalles',
    title: 'Tu tarjeta de presentación',
    tip: 'Tu tarjeta en primer plano y tu sonrisa desenfocada al fondo: marca personal pura. El gesto de presentarte ya da confianza.',
    cover: '/foto-inspo/detalle-tarjeta.jpg',
  },
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