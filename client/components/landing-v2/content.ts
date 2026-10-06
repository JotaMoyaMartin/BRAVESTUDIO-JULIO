/**
 * CONTENIDO DE LA LANDING V2 — todo el copy centralizado aquí.
 *
 * Reglas:
 *  - [REAL]        = afirmación que hoy es cierta en el producto.
 *  - [PLACEHOLDER] = hueco visual/fetch que se sustituirá (testimonios, screenshots).
 *  - NO inventar métricas, testimonios ni condiciones comerciales.
 */

// ── HEADER ─────────────────────────────────────────────────────
export const NAV = [
  { label: 'Funciones', href: '#funciones' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Resultados', href: '#resultados' },
  { label: 'Precios', href: '#precios' },
  { label: 'FAQ', href: '#faq' },
] as const

export const CTA_PRIMARY = 'Empieza 7 días gratis'
export const CTA_SIGNUP_HREF = '/signup'
export const MICROCOPY_TRIAL = '7 días gratis · Cancela cuando quieras'

// ── HERO ───────────────────────────────────────────────────────
export const HERO = {
  eyebrow: 'Hecho para estilistas y salones de belleza',
  headlineLines: ['Tu marketing.', 'Tu contenido.', 'Tu estrategia.', 'En un solo lugar.'],
  sub: 'BRÄVE Studio te ayuda a saber qué publicar, crear contenido con estrategia y construir una marca que atraiga mejores clientes.',
  ctaSecondary: 'Ver cómo funciona',
  microcopy: MICROCOPY_TRIAL,
}

// ── TRUST / IDENTIFICACIÓN ─────────────────────────────────────
// [REAL] — no inventamos números; categorías mientras llegan datos reales
export const TRUST = {
  label: 'Creado para:',
  items: [
    'Salones',
    'Estilistas independientes',
    'Marcas personales beauty',
  ],
}

// ── PROBLEMA / TRANSFORMACIÓN ──────────────────────────────────
export const PROBLEM = {
  title: 'De publicar sin rumbo a tener una estrategia.',
  antes: [
    'No sabes qué publicar',
    'Guardas cientos de ideas pero no las usas',
    'Publicas de manera irregular',
    'Tu perfil muestra trabajos, pero no explica por qué elegirte',
    'No sabes qué contenido te trae resultados',
    'Hablar a cámara te cuesta',
  ],
  despues: [
    'Tienes una dirección clara',
    'Sabes qué contenido crear',
    'Tus ideas están organizadas',
    'Comunicas mejor tu experiencia',
    'Publicas con más intención',
    'Construyes una marca más fuerte',
  ],
}

// ── VSL (vídeo de la app) ──────────────────────────────────────
// [REAL] Vídeo real del recorrido de la app en Loom.
// En el embed se usa la URL /embed/ (la /share/ no es iframe-ready).
export const VSL = {
  eyebrow: 'Mira por dentro',
  title: 'Así funciona BRÄVE por dentro.',
  body: 'Un recorrido real por la app: tu marca, tu plan para hoy, los guiones y el teleprompter.',
  videoUrl: 'https://www.loom.com/embed/728b089ab42b4f4883d4a1755d01d0f8',
}

// ── CÓMO FUNCIONA ──────────────────────────────────────────────
export const HOW = {
  title: 'BRÄVE no solo te da ideas. Te guía durante todo el proceso.',
  steps: [
    {
      kicker: 'Paso 1',
      title: 'Te conoce',
      body: 'Mi Marca recoge información sobre tu negocio, tus servicios, tu posicionamiento, tus objetivos y tu forma de comunicar.',
    },
    {
      kicker: 'Paso 2',
      title: 'Crea tu estrategia',
      body: 'BRÄVE convierte esa información en una dirección estratégica clara para tu contenido.',
    },
    {
      kicker: 'Paso 3',
      title: 'Te dice qué publicar',
      body: 'Inicio y Planificación te muestran tu plan: qué hacer hoy y qué viene esta semana.',
    },
    {
      kicker: 'Paso 4',
      title: 'Te ayuda a crearlo',
      body: 'Guiones, Stories que venden, Carruseles y Banco de Ganchos: herramientas para pasar de la idea al contenido.',
    },
    {
      kicker: 'Paso 5',
      title: 'Te ayuda a grabarlo',
      body: 'Teleprompter: graba tus Reels con el guion delante, sin memorizar cada frase.',
    },
    {
      kicker: 'Paso 6',
      title: 'Te ayuda a mejorar',
      body: 'Diagnóstico Instagram: conecta tu cuenta y BRÄVE te dice qué está funcionando y qué hacer después.',
    },
  ],
}

// ── BUSINESS BRAIN / MI MARCA ──────────────────────────────────
export const BRAIN = {
  eyebrow: 'Mi Marca',
  title: 'Una app que realmente conoce tu negocio.',
  body: 'No empiezas de cero cada vez que quieres crear contenido. BRÄVE utiliza la información de tu marca para personalizar tus ideas, tus estrategias y tus contenidos.',
  inputs: [
    'Tu negocio',
    'Tu especialidad',
    'Tu clienta',
    'Tu posicionamiento',
    'Tu prioridad',
    'Tu comunicación',
    'Tu contenido',
  ],
  output: 'Contenido personalizado para ti.',
}

// ── PLAN PARA HOY ──────────────────────────────────────────────
export const TODAY = {
  eyebrow: 'Tu plan para hoy',
  title: 'Abre BRÄVE y sabe qué hacer hoy.',
  body: 'Ni bloqueo ni página en blanco. Al entrar, BRÄVE te sugiere la siguiente acción según tu marca, tu calendario y lo que ya has avanzado. Tú decides: seguir la recomendación o crear lo que tú quieras.',
  // Contenido del mockup (mismo estilo que la Home real de la app)
  mock: {
    hi: 'Hola, Carmen',
    planTitle: 'Tu plan para hoy',
    recommended: 'Recomendado para hoy',
    recommendation: 'Crea un Reel sobre cómo preparas un cambio de color de temporada',
    cta: 'Crear guiones',
    secondary: 'O crea lo que tú quieras, a tu ritmo',
  },
}

// ── ECOSISTEMA DE HERRAMIENTAS (Bento) ─────────────────────────
// size: 'banner3' | 'banner2' | 'icon'
// asset: imagen real existente en /public — null = [PLACEHOLDER] card con icono
export const TOOLS = {
  eyebrow: 'Funciones',
  title: 'Todo lo que necesitas para crear y hacer crecer tu contenido.',
  tools: [
    { name: 'Mi Marca', copy: 'Tu estrategia empieza aquí.', size: 'banner3' as const, asset: '/tiles/mi-marca-banner.jpg' },
    { name: 'Planificación', copy: 'Organiza exactamente qué publicar.', size: 'banner3' as const, asset: '/tiles/planificar-banner.jpg' },
    { name: 'Crear Guiones', copy: 'Convierte cualquier idea en un Reel listo para grabar.', size: 'banner3' as const, asset: '/tiles/guiones-banner.jpg' },
    { name: 'Stories que venden', copy: 'Secuencias pensadas para conectar y generar acción.', size: 'banner3' as const, asset: '/tiles/stories-banner.jpg' },
    { name: 'Teleprompter', copy: 'Habla a cámara sin memorizar.', size: 'banner3' as const, asset: '/tiles/teleprompter-banner.jpg' },
    { name: 'Biblioteca', copy: 'Todo lo que has creado en un mismo lugar.', size: 'banner3' as const, asset: '/tiles/biblioteca-banner.jpg' },
    { name: 'Reels en tendencia', copy: 'Encuentra formatos que puedes adaptar hoy mismo.', size: 'banner2' as const, asset: '/tiles/inspiracion-banner.jpg' },
    { name: 'Transiciones Reels', copy: 'Aprende nuevas formas de grabar y enganchar.', size: 'banner2' as const, asset: '/tiles/transiciones-banner.jpg' },
    { name: 'Calendario', copy: 'Organiza tu estrategia visualmente.', size: 'banner2' as const, asset: '/tiles/calendario-banner.jpg' },
    { name: 'Banco de Ganchos', copy: 'Encuentra cómo empezar tu próximo Reel.', size: 'icon' as const, asset: null },
    { name: 'Carruseles', copy: 'Convierte ideas en carruseles profesionales.', size: 'icon' as const, asset: null },
    { name: 'Reto 10K', copy: 'Mantén foco y constancia semana a semana.', size: 'icon' as const, asset: null },
  ],
}

// ── CREAR CONTENIDO ────────────────────────────────────────────
export const CREATE = {
  eyebrow: 'Crear contenido',
  title: 'De una idea a un contenido listo para grabar.',
  body: 'BRÄVE encadena las herramientas entre sí: lo que eliges en un paso ya está disponible en el siguiente.',
  steps: [
    { name: 'Idea', sample: 'Cambio de color de temporada' },
    { name: 'Gancho', sample: '¿Tu color se apaga a las 3 semanas?' },
    { name: 'Guion', sample: '1 · Gancho, 2 · Contexto, 3 · Solución, 4 · CTA' },
    { name: 'Stories', sample: '3 Stories para acompañar tu Reel' },
    { name: 'Teleprompter', sample: 'El guion, delante, mientras grabas' },
  ],
  cta: 'Crear con BRÄVE',
}

// ── INSPIRACIÓN ────────────────────────────────────────────────
// Covers REALES ya productivos (banners de la app + covers de reels reales de la BD)
export const INSPIRATION = {
  title: 'No tienes que inventarlo todo desde cero.',
  body: 'Cada semana tienes referencias reales: qué está funcionando ahora, por qué funciona y cómo adaptarlo a tu salón.',
  groups: [
    { name: 'Reels en tendencia', caption: 'Róbale las ideas al feed', covers: ['/reels/cover-nov-Dd6-uBpASXl.jpg', '/reels/cover-nov-Ddjb78mqe7S.jpg', '/reels/cover-nov-Da0503gBGq7.jpg'] },
    { name: 'Transiciones', caption: 'El corte que engancha', covers: ['/reels/cover-nov-DauQkNONDwN.jpg', '/reels/cover-nov-DbndrcaNvp5.jpg'] },
  ],
}

// ── TELEPROMPTER ───────────────────────────────────────────────
export const TELEPROMPTER = {
  eyebrow: 'Teleprompter',
  title: 'Ten el guion. Pulsa grabar. Habla.',
  body: 'Utiliza tus guiones directamente en el Teleprompter de BRÄVE para grabar con más seguridad, sin memorizar cada frase. Con espejo, calidad HD y guardado directo en tu móvil.',
  mock: {
    rec: 'REC',
    script: ['Si tu color pierde vida en 3 semanas,', 'el problema no es el color…', 'es la rutina que lo sostiene.'],
    action: 'Empezar a grabar',
  },
  cta: 'Crear mi primer guion',
}

// ── DIAGNÓSTICO INSTAGRAM ──────────────────────────────────────
export const INSIGHTS = {
  eyebrow: 'Diagnóstico Instagram',
  title: 'Tu Instagram te dice qué hacer después.',
  sub: 'Conecta tu cuenta y BRÄVE analiza qué está funcionando, qué puedes potenciar y qué contenido priorizar en tu salón.',
  chips: ['Lo que funciona', 'Lo que te frena', 'Tu oportunidad', 'Tu siguiente acción'],
}

// ── RESULTADOS / PRUEBA SOCIAL ─────────────────────────────────
// 100% REAL: capturas compartidas por miembros / alumnas
// (/public/testimonials — verificadas y renombradas una a una).
// Cero inventos: números y frases tomados de las capturas originales.
// Si alguna usuaria pide retirar su captura, quitar su objeto y su <Image>.
export const RESULTS = {
  eyebrow: 'Resultados reales',
  title: 'Estilistas que ya están viendo resultados',
  sub: 'Capturas y testimonios públicos compartidos por miembros de la comunidad y alumnas de la academia. Sin cifras ni perfiles inventados.',
  note: 'Capturas reales compartidas voluntariamente por sus autoras. Publicamos lo que ellas nos han enseñado, tal como llegaron.',
  // Caso destacado: métricas de sus insights reales (captura Instagram, 14 días)
  nerea: {
    name: 'Nerea Rull',
    label: 'Compartió sus insights en la comunidad',
    stat: '43.331',
    statUnit: 'reproducciones en 14 días',
    context: 'Insights de sus últimos 14 días usando los formatos que aprendió con BRÄVE y el GPT de guiones.',
    quote: 'Súper contenta 🤩🤩 y eso que aún me queda mucho por aplicar',
    metrics: [
      { label: 'Cuentas alcanzadas', value: '5.428', delta: '+56,1%' },
      { label: 'Actividad en el perfil', value: '400', delta: '+61,9%' },
      { label: 'Visitas al perfil', value: '377', delta: '+61,1%' },
      { label: 'Toques en enlace externo', value: '23', delta: '+76,9%' },
    ],
    imgRing: { src: '/testimonials/nerea-insights-01.png', alt: 'Insight real de Instagram: 43.331 reproducciones en los últimos 14 días', ratio: '3/4', pos: '50% 52%' },
    imgStory: { src: '/testimonials/nerea-insights-02.png', alt: 'Insight real de story: 400 de actividad en el perfil, 377 visitas y 23 toques al enlace externo', ratio: '2/3', pos: '50% 63%' },
  },
  olga: {
    name: 'Olga Peraile',
    label: 'Publicó su resultado en la comunidad',
    headline: 'Un viral con una cuenta de 500 seguidores',
    quote: 'He tenido un viral! Tengo una cuenta pequeña de 500 seguidores 🙂 y va creciendo',
    stats: [
      { label: 'Vistas', value: '17.700' },
      { label: 'Likes', value: '250' },
      { label: 'Compartidos', value: '47' },
    ],
    img: { src: '/testimonials/olga-viral.png', alt: 'Publicación real de Olga en la comunidad titulada "Viral"', ratio: '812/225' },
  },
  libia: {
    name: 'Libia Roldán',
    label: 'Publicó su resultado en la comunidad',
    headline: 'Un reel. 5 ventas.',
    quote: 'Por primera vez un reel me trae varias ventas',
    stat: '1,4K vistas',
    img: { src: '/testimonials/libia-ventas.png', alt: 'Publicación real de Libia en la comunidad: "Por primera vez un reel me trae varias ventas"', ratio: '794/214' },
  },
  shirley: {
    name: 'Shirley Guzmán',
    label: 'Reseña real · ago. 2026',
    headline: 'Confianza. Calidad. Acompañamiento.',
    quote: 'Me encanta. Tiene un servicio personalizado y un lenguaje claro.',
    stars: 5,
    img: { src: '/testimonials/shirley-review.png', alt: 'Reseña real de Shirley Guzmán con 5 estrellas: "Me encanta!" Además sigue siendo miembro de pago después de 2 meses', ratio: '738/176' },
  },
  camili: {
    name: 'Camili · Camilisalondebelleza',
    label: 'Publicó su opinión en la comunidad',
    headline: '«Estoy muy enamorada de las clases»',
    quote: 'Ya voy süper avanzada aprendiendo mucho.',
    img: { src: '/testimonials/camili-review.png', alt: 'Publicación real de Camili en la comunidad: "Estoy muy enamorada de las clases, he aprendido mucho"', ratio: '785/260', pos: '50% 10%' },
  },
  // Capturas directas de WhatsApp (sin descripción: las imágenes hablan solas)
  chats: {
    label: 'Mensajes reales de clientas',
    shots: [
      { src: '/testimonials/venta-800-chat.png', alt: 'Mensaje real de una clienta: "Por cierto.. el día 5 de enero, después de publicar el video vendí 800€ en tarjetas regalo"', ratio: '904/300', pos: '50% 30%', width: 'min(100%, 420px)' },
      { src: '/testimonials/alicia-chat.png', alt: 'Mensaje real de Alicia Salon: "Me encantaaaaa. Cómo se va notando el cambio con vuestras directrices"', ratio: '678/450', width: 'min(100%, 300px)' },
      { src: '/testimonials/jacquelin-insights.jpg', alt: 'Insight real compartido por Jacquelin Salon Pamplona Rasel: 90.063 reproducciones y 17.991 cuentas alcanzadas', ratio: '636/850', pos: '50% 12%', width: 'min(100%, 200px)' },
    ],
  },
  ctaText: 'Tú también puedes empezar a crear con más estrategia.',
}

// ── ACOMPAÑAMIENTO ─────────────────────────────────────────────
// [REAL] — solo lo que existe hoy: asistente, academia, actualizaciones, comunidad Skool
export const COMMUNITY = {
  title: 'Más que una app.',
  body: 'La tecnología es la mitad. La otra mitad es que no estés sola construyendo tu marca: BRÄVE te acompaña mientras la usas.',
  items: [
    { name: 'Asistente BRÄVE', copy: 'Un asistente dentro de la app que te guía y responde tus dudas sobre contenido.' },
    { name: 'Academia', copy: 'Clases y recursos para aprender a comunicar mejor tu trabajo.' },
    { name: 'Comunidad', copy: 'Comunidad BRÄVE en Skool, con acceso para miembros desde la propia app.' },
    { name: 'Actualizaciones', copy: 'Nuevas herramientas y mejoras que llegan sin que tengas que hacer nada.' },
  ],
}

export const SKOOL = {
  title: '¿Eres miembro de BRÄVE en Skool?',
  body: 'Los miembros de la comunidad pueden activar su acceso gratuito con el código de la comunidad.',
  cta: 'Tengo código de Skool',
  href: '/skool-access',
}

// ── PRICING ────────────────────────────────────────────────────
// DEFINITIVO: UN precio mensual y UN anual. Nada de PRO/BUSINESS/ENTERPRISE.
// IMPORTANTE (alinear con backend): el trial ya es 7 días en código (fallback y copy);
// los importes cobrados siguen siendo los de los Price IDs en Stripe (hoy 29/199 €)
// hasta crear los precios de 19/190. El checkout real cobra lo configurado en Stripe.
export const PRICING = {
  eyebrow: 'Precios',
  title: 'Todo BRÄVE Studio. Un precio simple.',
  sub: 'Empieza con 7 días gratis y después elige cómo quieres continuar.',
  badge: 'Mejor precio',
  monthly: {
    name: 'Mensual',
    price: 19,
    suffix: '/mes',
  },
  yearly: {
    name: 'Anual',
    price: 190,
    suffix: '/año',
    equivalent: 'Equivale a 15,83 €/mes',
    savings: 'Ahorras 38 € al año',
  },
  // USD: paridad de precio ($19/$190) — misma decisión de producto que 19/190 EUR.
  // PENDIENTE de backend: crear los 2 Price IDs USD en Stripe para cobrar en $;
  // mientras no existan, el checkout de USD cae al precio EUR del servidor.
  usd: {
    monthly: 19,
    yearly: 190,
  },
  included: [
    'Mi Marca y tu estrategia personalizada',
    'Planificación y tu plan para cada día',
    'Guiones, Stories, Carruseles y Banco de Ganchos',
    'Teleprompter para grabar sin memorizar',
    'Biblioteca, Calendario e Inspiración',
  ],
  // [REAL] — así funciona el trial hoy: checkout de Stripe pide método de pago,
  // NO cobra hasta pasados los días de prueba; cancelando antes no se paga nada.
  checkoutNote: 'Te pediremos tu método de pago, pero no se cobra nada durante los 7 días de prueba. Si cancelas antes, no pagas nada.',
  badges: ['Sin permanencia', 'Cancela cuando quieras', '7 días gratis'],
}

// ── FAQ ────────────────────────────────────────────────────────
// Respuestas breves y transparentes; sin condiciones que no podamos cumplir.
export const FAQ = {
  title: 'Preguntas frecuentes',
  items: [
    {
      q: '¿Qué es BRÄVE Studio?',
      a: 'Es tu sistema de marketing para el salón: te ayuda a definir tu estrategia, te dice qué publicar y te da las herramientas para crear, grabar y organizar todo ese contenido.',
    },
    {
      q: '¿Para quién está pensado?',
      a: 'Para estilistas, peluqueros, coloristas, especialistas en balayage y dueños/as de salón. También funciona muy bien para especialistas que trabajan de forma independiente.',
    },
    {
      q: '¿Necesito saber de marketing?',
      a: 'No. BRÄVE te guía paso a paso: pregunta por tu negocio, te propone una estrategia y te marca la siguiente acción en cada momento.',
    },
    {
      q: '¿Puedo usar BRÄVE si trabajo sola?',
      a: 'Sí. Está pensado también para profesionales independientes que quieren construir su marca personal sin depender de agencias.',
    },
    {
      q: '¿Sirve si tengo un salón con equipo?',
      a: 'Sí. La estrategia se adapta a tu salón: tus servicios, tu clienta y la forma en la que quieres comunicar.',
    },
    {
      q: '¿Qué puedo crear con BRÄVE?',
      a: 'Guiones de Reels, secuencias de Stories, carruseles y ganchos para empezar tus videos, además de tu plan de contenido semanal.',
    },
    {
      q: '¿Me ayuda si no sé qué publicar?',
      a: 'Es uno de sus puntos fuertes: al abrir la app encuentras tu plan, con una recomendación clara de qué hacer hoy.',
    },
    {
      q: '¿Puedo usar el Teleprompter desde el móvil?',
      a: 'Sí. Puedes abrir tus guiones en el Teleprompter y grabar tus Reels con el texto delante, directamente desde el navegador del móvil.',
    },
    {
      q: '¿Puedo cancelar cuando quiera?',
      a: 'Sí. No hay permanencia: puedes cancelar tu suscripción en cualquier momento.',
    },
    {
      q: '¿Cómo funcionan los 7 días gratis?',
      a: 'Empiezas el periodo de prueba al suscribirte con tu plan. Durante esos 7 días tienes acceso completo y no se cobra nada.',
    },
    {
      q: '¿Qué ocurre cuando termina la prueba?',
      a: 'Si continúas, tu suscripción se cobra automáticamente con el precio de tu plan. Si cancelas antes de que termine la prueba, no pagas nada.',
    },
    {
      q: '¿Funciona desde móvil y ordenador?',
      a: 'Sí. BRÄVE es una aplicación web: funciona desde el navegador del móvil, la tablet y el ordenador, y puedes instalarla como app en tu pantalla de inicio.',
    },
    {
      q: '¿Qué incluye el precio?',
      a: 'Acceso completo a todas las herramientas actuales de BRÄVE Studio — estrategia, planificación, creación, teleprompter y biblioteca — además de las actualizaciones que vamos publicando.',
    },
  ],
}

// ── CTA FINAL ──────────────────────────────────────────────────
export const FINAL_CTA = {
  title: 'Tu marca puede empezar a crecer con más dirección desde hoy.',
  body: '¿Y ahora qué publico? Deja de ser la primera pregunta del día. BRÄVE te ayuda a crear, organizar y comunicar con estrategia.',
  cta: CTA_PRIMARY,
  microcopy: '19 €/mes después de la prueba · Cancela cuando quieras',
}