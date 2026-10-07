/**
 * STORIES DISEÑO — fábricas de plantillas + packs semilla (Fase 2).
 *
 * Aquí VIVE el contenido: los packs que el admin siembra con un botón
 * ("Generar packs iniciales" en Admin → Stories Diseño). Cada plantilla es
 * una secuencia de slides de 1080×1920 construida con elementos de
 * `lib/stories-diseno/types.ts` (roles: fixed=BRÄVE lo pone, editable=la
 * estilista lo cambia, ai=BRÄVE lo adapta a su marca, replaceable=slot de foto).
 *
 * Voz de los textos: directa, de salón, sin paja publicitaria. Nunca parecen
 * generados por IA (regla #4 del repo). Los textos 'ai' son esbozos que la
 * IA reescribe con la marca; los 'editable' ya son utilizables tal cual.
 */
import {
  StoryDesignElement,
  StoryDesignPack,
  StoryDesignSlide,
  StoryDesignTemplate,
  StoryElementRole,
  StorySlideLayoutType,
} from './types'

/** Paleta BRAVE (valores planos: los slides se exportan a PNG fuera de la app). */
export const ST_INK = '#2A0B12'
export const ST_CHERRY = '#7A1832'
export const ST_CHERRY_DARK = '#591427'
export const ST_BUTTERMILK = '#FFF1B5'
export const ST_BLUSH = '#FCE8EE'
export const ST_CREAM = '#FFFDF5'

const FONT = 'Poppins, Montserrat, sans-serif'
const CANVAS_W = 1080
const CANVAS_H = 1920

type TextStyle = Pick<
  StoryDesignElement,
  'position' | 'size' | 'style' | 'content' | 'maxLength' | 'allowedAssetTypes'
> &
  Partial<StoryDesignElement>

function el(
  e: Pick<StoryDesignElement, 'id' | 'type' | 'role'> & Partial<TextStyle>
): StoryDesignElement {
  const base: StoryDesignElement = {
    id: e.id,
    type: e.type,
    role: e.role,
    position: e.position ?? { x: 0, y: 0 },
    size: e.size ?? { w: CANVAS_W, h: 200 },
    style: e.style ?? {},
    content: e.content,
    maxLength: e.maxLength,
    allowedAssetTypes: e.allowedAssetTypes,
  }
  if (e.type === 'text') {
    base.style = {
      fontFamily: FONT,
      color: ST_INK,
      textAlign: 'left',
      ...e.style,
    }
  }
  return base
}

/** Titular grande (Poppins 800). */
function headline(
  id: string,
  role: StoryElementRole,
  content: string,
  y: number,
  opts: { size?: number; color?: string; align?: 'center' | 'left'; w?: number; x?: number; lh?: number; italic?: boolean } = {}
): StoryDesignElement {
  const size = opts.size ?? 88
  return el({
    id,
    type: 'text',
    role,
    content,
    maxLength: opts.size && opts.size <= 56 ? 90 : 60,
    size: { w: opts.w ?? CANVAS_W - (opts.x ?? 0) - 120, h: size * 1.25 },
    position: { x: opts.x ?? 60, y },
    style: {
      fontSize: size,
      fontWeight: 800,
      lineHeight: (opts.lh ?? 1.12).toString(),
      letterSpacing: '-2px',
      color: opts.color ?? ST_INK,
      textAlign: opts.align ?? 'left',
      ...(opts.italic ? { fontStyle: 'italic' } : {}),
    },
  })
}

/** Párrafo de apoyo (Poppins 600-500). */
function body(
  id: string,
  role: StoryElementRole,
  content: string,
  y: number,
  opts: { size?: number; color?: string; align?: 'center' | 'left'; w?: number; x?: number; weight?: number; h?: number; opacity?: number } = {}
): StoryDesignElement {
  const size = opts.size ?? 44
  return el({
    id,
    type: 'text',
    role,
    content,
    maxLength: 400,
    size: { w: opts.w ?? CANVAS_W - (opts.x ?? 0) - 120, h: opts.h ?? size * 2.6 },
    position: { x: opts.x ?? 60, y },
    style: {
      fontSize: size,
      fontWeight: opts.weight ?? 500,
      lineHeight: '1.3',
      color: opts.color ?? ST_INK,
      textAlign: opts.align ?? 'left',
      ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
    },
  })
}

/** Etiqueta pequeña en MAYÚSCULAS (eyebrow). */
function chipText(
  id: string,
  role: StoryElementRole,
  content: string,
  y: number,
  opts: { x?: number; color?: string; align?: 'center' | 'left' } = {}
): StoryDesignElement {
  return el({
    id,
    type: 'text',
    role,
    content,
    maxLength: 40,
    size: { w: opts.x !== undefined ? CANVAS_W - opts.x - 120 : CANVAS_W, h: 50 },
    position: { x: opts.x ?? 60, y },
    style: {
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: '4px',
      textTransform: 'uppercase' as const,
      color: opts.color ?? (opts.align === 'center' ? ST_CHERRY_DARK : ST_CHERRY),
      textAlign: opts.align ?? 'left',
    },
  })
}

/** Píldora CTA (badge con fondo). */
function ctaChip(
  id: string,
  role: StoryElementRole,
  content: string,
  y: number,
  opts: { align?: 'center' | 'left'; bg?: string; color?: string } = {}
): StoryDesignElement {
  return el({
    id,
    type: 'badge',
    role,
    content,
    maxLength: 42,
    size: { w: opts.align === 'center' ? CANVAS_W : 860, h: 112 },
    position: { x: opts.align === 'center' ? 0 : 60, y },
    style: {
      fontSize: 42,
      fontWeight: 800,
      fontFamily: FONT,
      background: opts.bg ?? ST_CHERRY,
      color: opts.color ?? '#FFFFFF',
      borderRadius: '60px',
      textAlign: 'center',
      paddingTop: 22,
      paddingBottom: 22,
      paddingLeft: 48,
      paddingRight: 48,
    },
  })
}

/** Slot de foto: cuadrado o lanza. */
function photoSlot(
  id: string,
  y: number,
  opts: { h?: number; bg?: string } = {}
): StoryDesignElement {
  return el({
    id,
    type: 'image',
    role: 'replaceable',
    content: '',
    allowedAssetTypes: ['sample_photo', 'user_photo'],
    position: { x: 60, y },
    size: { w: CANVAS_W - 120, h: opts.h ?? 760 },
    style: {
      borderRadius: '48px',
      objectFit: 'cover',
      background: opts.bg ?? 'rgba(42,11,18,0.08)',
    },
  })
}

function slide(
  order: number,
  background: string,
  layoutType: StorySlideLayoutType,
  elements: StoryDesignElement[]
): StoryDesignSlide {
  return { id: '', templateId: '', order, background, layoutType, elements }
}

const PILL_SOFT: Record<string, string | number> = { pillStyle: 'soft' }

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLAS
// ─────────────────────────────────────────────────────────────────────────────

/** Pack 1 · Plantilla 1 — "Story que vende" (vender, 4 slides). */
function tStoryQueVende(): StoryDesignTemplate {
  return {
    id: '', // DB
    title: 'Story que vende',
    slug: 'story-que-vende',
    category: 'Stories que venden',
    description: 'La secuencia clásica: gancho, problema, propuesta y cierre con llamada a escribirte.',
    coverImage: null,
    isLocked: false,
    status: 'published',
    recommendedUse: 'Para promocionar un servicio concreto esta semana.',
    defaultStyle: PILL_SOFT,
    tags: ['venta', 'servicio', 'cierre'],
    slides: [
      // 1 — Gancho
      slide(1, ST_CHERRY_DARK, 'full-photo', [
        el({ id: 'p1', type: 'badge', role: 'fixed', position: { x: 60, y: 120 }, size: { w: 960, h: 84 }, style: { background: ST_BUTTERMILK, borderRadius: '45px', textAlign: 'center', fontSize: 34, fontWeight: 800, color: ST_CHERRY_DARK, fontFamily: FONT }, content: 'BALAYAGE · EN DETALLE' }),
        headline('gancho', 'ai', '¿Sabes por qué tu balayage pierde la luz a las 3 semanas?', 240, { size: 76, color: '#FFFFFF', w: CANVAS_W - 120 }),
        photoSlot('foto', 720, { bg: 'rgba(255,255,255,0.14)', h: 1050 }),
        ctaChip('desliza', 'fixed', 'Desliza para verlo ↓', 1620, { align: 'center', bg: ST_BUTTERMILK, color: ST_CHERRY_DARK }),
      ]),
      // 2 — Problema
      slide(2, ST_CREAM, 'text-only', [
        chipText('tag', 'fixed', 'LA CAUSA', 120),
        headline('problema', 'ai', 'No es tu balayage: es que se te está quitando el matiz en casa.', 220, { size: 70 }),
        body('detalle', 'ai', 'Cada vez que te lo lavas en peluquería sale ideal, pero en dos semanas vuelve el amarillo. Te pasa por el agua de tu casa y por champós que no protegen el color.', 760, { size: 42, color: 'rgba(42,11,18,0.85)' }),
      ]),
      // 3 — Propuesta
      slide(3, ST_BLUSH, 'list', [
        chipText('tag', 'fixed', 'LO QUE TE PUEDE CAMBIAR EL MES', 120),
        headline('propuesta', 'ai', 'Rutina de color en casa', 220, { size: 74, color: ST_CHERRY_DARK }),
        body('item1', 'ai', '1 · Champó y máscara específicos para rubios (te diré cuáles)', 640, { size: 44 }),
        body('item2', 'ai', '2 · Mascarilla de matiz 1 vez por semana, 5 minutos', 760, { size: 44 }),
        body('item3', 'ai', '3 · En tu siguiente cita, glaze de brillo — 20 minutos, poco coste', 880, { size: 44 }),
      ]),
      // 4 — Cierre
      slide(4, ST_BUTTERMILK, 'text-only', [
        headline('cierre', 'ai', '¿Te la quieres aplicar? La rutina te la dejo montada en tu próxima cita.', 260, { size: 66, color: ST_CHERRY_DARK, align: 'center', italic: true, lh: 1.22 }),
        body('nota', 'ai', 'Escríbeme "RUTINA" por Instagram y te la preparo con tu tono exacto.', 1100, { size: 44, color: ST_CHERRY_DARK, align: 'center', w: CANVAS_W - 160 }),
        ctaChip('cta', 'ai', 'Escríbeme "RUTINA"', 1420, { align: 'center', bg: ST_CHERRY, color: '#FFFFFF' }),
      ]),
    ],
  }
}

/** Pack 1 · Plantilla 2 — "Antes y después" (4 slides). */
function tAntesyDespues(): StoryDesignTemplate {
  return {
    id: '', title: 'Antes y después', slug: 'antes-y-despues', category: 'Antes y después',
    description: 'El cambio visual como prueba directa: foto antes, foto después y la historia detrás.',
    coverImage: null, isLocked: false, status: 'published',
    recommendedUse: 'Para rellenar la semana con un trabajo real de estos días (sin revelar datos de la clienta).',
    defaultStyle: PILL_SOFT, tags: ['resultado', 'cambio', 'prueba'],
    slides: [
      slide(1, ST_INK, 'full-photo', [
        el({ id: 'lbl-antes', type: 'badge', role: 'fixed', position: { x: 60, y: 150 }, size: { w: 320, h: 70 }, style: { background: 'rgba(255,255,255,0.9)', color: ST_INK, borderRadius: '40px', fontSize: 32, fontWeight: 800, fontFamily: FONT, textAlign: 'center' }, content: 'ANTES' }),
        photoSlot('antes', 300, { bg: 'rgba(255,255,255,0.12)', h: 1050 }),
      ]),
      slide(2, ST_INK, 'full-photo', [
        el({ id: 'lbl-despues', type: 'badge', role: 'fixed', position: { x: 60, y: 150 }, size: { w: 400, h: 70 }, style: { background: ST_BUTTERMILK, color: ST_CHERRY_DARK, borderRadius: '40px', fontSize: 32, fontWeight: 800, fontFamily: FONT, textAlign: 'center' }, content: 'DESPUÉS' }),
        photoSlot('despues', 300, { bg: 'rgba(255,255,255,0.12)', h: 1050 }),
      ]),
      slide(3, ST_CREAM, 'text-only', [
        chipText('tag', 'fixed', 'LO QUE HICE', 120),
        headline('proceso', 'ai', 'Balayage en V + glaze de brillo — 4 horas y una sola sesión.', 220, { size: 64 }),
        body('historia', 'ai', 'Venía con el color sin vida y ganas de cambio sin pasar por morena. Elegimos una base suave y un punto de luz en la cara. Salvo el dinero del matiz mensual.', 760, { size: 44 }),
      ]),
      slide(4, ST_BUTTERMILK, 'quote', [
        headline('frase', 'ai', '“Es que ahora salgo en fotos y me gustan las fotos”', 420, { size: 70, color: ST_CHERRY_DARK, align: 'center', italic: true, lh: 1.25 }),
        body('autor', 'ai', '— Carmen, clienta desde 2023', 900, { size: 38, color: ST_CHERRY_DARK, align: 'center', weight: 700 }),
        ctaChip('cta', 'ai', 'Agenda tu cambio', 1380, { align: 'center', bg: ST_CHERRY_DARK, color: '#FFFFFF' }),
      ]),
    ],
  }
}

/** Pack 1 · Plantilla 3 — "Tratamiento destacado" (3 slides). */
function tTratamiento(): StoryDesignTemplate {
  return {
    id: '', title: 'Tratamiento destacado', slug: 'tratamiento-destacado', category: 'Tratamiento destacado',
    description: 'Un servicio explicado paso a paso, para que se entienda antes de preguntar.',
    coverImage: null, isLocked: false, status: 'published',
    recommendedUse: 'Cuando hay un tratamiento que casi nadie de tu agenda ha probado aún.',
    defaultStyle: PILL_SOFT, tags: ['servicio', 'educación'],
    slides: [
      slide(1, ST_BLUSH, 'split', [
        el({ id: 'lbl', type: 'badge', role: 'fixed', position: { x: 60, y: 150 }, size: { w: 460, h: 70 }, style: { background: ST_CHERRY, color: '#FFFFFF', borderRadius: '40px', fontSize: 30, fontWeight: 800, letterSpacing: '3px', fontFamily: FONT, textAlign: 'center' }, content: 'EN DETALLE' }),
        headline('title', 'ai', 'Hidratación profunda sin planchas ni milagros', 300, { size: 72, color: ST_CHERRY_DARK, lh: 1.2 }),
        photoSlot('foto', 950, {  }),
      ]),
      slide(2, ST_CREAM, 'list', [
        chipText('tag', 'fixed', 'EN QUÉ CONSISTE', 120),
        body('p1', 'ai', '1 · Lavado con producto abierto (no de supermercado)', 320, { size: 46 }),
        body('p2', 'ai', '2 · Vapor + Ampolla según el estado de tu fibra',420, { size: 46 }),
        body('p3', 'ai', '3 · Corte de puntas solo si lo necesita', 520, { size: 46 }),
        body('nota', 'ai', 'Duración: 45 minutos. La repites cada 3-4 semanas y notas la diferencia al peinarte en casa.', 1240, { size: 40, color: 'rgba(42,11,18,0.75)' }),
      ]),
      slide(3, ST_BUTTERMILK, 'text-only', [
        headline('precio', 'ai', 'Este mes, hidratación + corte por 39 €', 420, { size: 76, color: ST_CHERRY_DARK, align: 'center', lh: 1.2 }),
        ctaChip('cta', 'ai', 'Reserva tu hueco', 1120, { align: 'center', bg: ST_CHERRY, color: '#FFFFFF' }),
        body('aviso', 'fixed', 'Las plazas al precio se agotan cuando la agenda se llena.', 1420, { size: 34, color: ST_CHERRY_DARK, align: 'center', opacity: 0.7 }),
      ]),
    ],
  }
}

/** Pack 1 · Plantilla 4 — "Promoción" (3 slides). */
function tPromocion(): StoryDesignTemplate {
  return {
    id: '', title: 'Promoción', slug: 'promocion', category: 'Promociones',
    description: 'Lanza una oferta sin parecer desesperada: valor primero, precio después.',
    coverImage: null, isLocked: false, status: 'published',
    recommendedUse: 'Para la promo del mes o el hueco que quiero llenar esta semana.',
    defaultStyle: PILL_SOFT, tags: ['promo', 'oferta'],
    slides: [
      slide(1, ST_CHERRY, 'text-only', [
        el({ id: 'lbl', type: 'badge', role: 'fixed', position: { x: 60, y: 200 }, size: { w: 520, h: 74 }, style: { background: ST_BUTTERMILK, color: ST_CHERRY_DARK, borderRadius: '40px', fontSize: 32, fontWeight: 800, textAlign: 'center', fontFamily: FONT }, content: 'SOLO ESTA SEMANA' }),
        headline('oferta', 'ai', 'Color + corte de puntas por el precio del color.', 380, { size: 74, color: '#FFFFFF', lh: 1.2 }),
        ctaChip('cta', 'ai', 'Pide tu hueco', 1250, { align: 'center', bg: ST_BUTTERMILK, color: ST_CHERRY_DARK }),
      ]),
      slide(2, ST_CREAM, 'text-only', [
        headline('condiciones', 'ai', 'Cómo funciona', 220, { size: 66, color: ST_CHERRY_DARK }),
        body('c1', 'ai', 'Hasta el viernes · Mientras la agenda tenga huecos.', 560, { size: 44 }),
        body('c2', 'ai', 'Se puede regalar — dímelo al reservar y te la pongo a nombre de quien quieras.', 700, { size: 44 }),
        body('c3', 'ai', 'Pide tu hueco por Instagram y te confirmo hoy mismo.', 840, { size: 44 }),
      ]),
      slide(3, ST_BUTTERMILK, 'quote', [
        headline('cierre', 'ai', 'Prefiero llenar tu semana que poner descuentos eternos.', 480, { size: 64, color: ST_CHERRY_DARK, align: 'center', italic: true, lh: 1.25 }),
        ctaChip('cta', 'ai', 'Escríbeme "PROMO"', 1180, { align: 'center', bg: ST_CHERRY_DARK, color: '#FFFFFF' }),
      ]),
    ],
  }
}

/** Pack 2 · Plantilla 1 — "Agenda con huecos" (captar, 3 slides). */
function tAgendaHuecos(): StoryDesignTemplate {
  return {
    id: '', title: 'Agenda con huecos', slug: 'agenda-huecos', category: 'Agenda con huecos',
    description: 'Anuncia tus días y horas libres sin restarles valor ni sonar a rebaja.',
    coverImage: null, isLocked: false, status: 'published',
    recommendedUse: 'Martes o miércoles, cuando la semana siguiente aún tiene huecos.',
    defaultStyle: PILL_SOFT, tags: ['agenda', 'huecos'],
    slides: [
      slide(1, ST_CREAM, 'list', [
        chipText('tag', 'fixed', 'LA AGENDA DE ESTA SEMANA', 120),
        headline('title', 'ai', 'Estas son las horas que me quedan libres:', 220, { size: 64, color: ST_CHERRY_DARK }),
        body('d1', 'ai', 'Jueves 10:00 y 16:30', 620, { size: 48, weight: 700 }),
        body('d2', 'ai', 'Viernes 12:15', 720, { size: 48, weight: 700 }),
        body('d3', 'ai', 'Sábado 10:00 (solo corte)', 820, { size: 48, weight: 700 }),
        ctaChip('cta', 'ai', 'Responde con tu día', 1080, { align: 'center', bg: ST_CHERRY, color: '#FFFFFF' }),
        body('nota', 'fixed', 'La agenda se ordena por reserva — así se llenan los huecos sin descuento.', 1400, { size: 36, align: 'center', opacity: 0.7, color: ST_INK }),
      ]),
      slide(2, ST_BLUSH, 'text-only', [
        headline('frase', 'ai', 'Los huecos de finales de mes son el mejor momento para probar lo que tenías pendiente.', 380, { size: 66, color: ST_CHERRY_DARK, align: 'center', italic: true }),
        ctaChip('cta', 'ai', 'Pregúntame por tu hueco', 1180, { align: 'center', bg: ST_CHERRY, color: '#FFFFFF' }),
      ]),
    ],
  }
}

/** Pack 2 · Plantilla 2 — "Resultados de clientas" (3 slides). */
function tResultados(): StoryDesignTemplate {
  return {
    id: '', title: 'Resultados reales', slug: 'resultados-reales', category: 'Resultados de clientas',
    description: 'Un caso con foto, proceso y resultado — la prueba social que vende sola.',
    coverImage: null, isLocked: false, status: 'published',
    recommendedUse: 'Después de un trabajo que te da orgullo (con permiso de la clienta).',
    defaultStyle: PILL_SOFT, tags: ['prueba', 'testigos'],
    slides: [
      slide(1, ST_INK, 'full-photo', [
        photoSlot('resultado', 260, { bg: 'rgba(255,255,255,0.12)', h: 1050 }),
        headline('title', 'ai', 'De morena apagada a castaño con luz en 4 horas.', 1420, { size: 58, color: '#FFFFFF', align: 'center', lh: 1.2 }),
      ]),
      slide(2, ST_CREAM, 'text-only', [
        chipText('tag', 'fixed', 'CÓMO LO HICE', 120),
        headline('proceso', 'ai', 'Decoloración parcial + baños de matiz progresivos.', 220, { size: 60 }),
        body('p1', 'ai', 'Primera sesión: base clara sin castigar la fibra.', 560, { size: 44 }),
        body('p2', 'ai', 'Segundo lavado: glaze para cerrar el matiz con brillo.', 680, { size: 44 }),
        body('p3', 'ai', 'Plan en casa: máscara de matiz 1 vez por semana.', 800, { size: 44 }),
      ]),
      slide(3, ST_BUTTERMILK, 'text-only', [
        headline('cita', 'ai', '¿Quieres la transformación para el otoño sin ir a más?', 380, { size: 66, color: ST_CHERRY_DARK, align: 'center', italic: true, lh: 1.22 }),
        ctaChip('cta', 'ai', 'Consulta gratis 10 min', 1200, { align: 'center', bg: ST_CHERRY_DARK, color: '#FFFFFF' }),
      ]),
    ],
  }
}

/** Pack 2 · Plantilla 3 — "Encuesta" (interacción, 2 slides). */
function tEncuesta(): StoryDesignTemplate {
  return {
    id: '', title: 'Encuesta en story', slug: 'encuesta', category: 'Encuesta',
    description: 'Dos opciones y una pregunta real — entrena el algoritmo y te da datos.',
    coverImage: null, isLocked: false, status: 'published',
    recommendedUse: 'Para las horas con más gente viendo tus stories (15:00-20:00 solemos acertar).',
    defaultStyle: PILL_SOFT, tags: ['interacción', 'datos'],
    slides: [
      slide(1, ST_CREAM, 'poll', [
        headline('pregunta', 'ai', '¿Estás más de un cambio o de un mantenimiento?', 420, { size: 72, align: 'center', color: ST_INK, lh: 1.2 }),
        el({ id: 'op1', type: 'badge', role: 'ai', position: { x: 70, y: 940 }, size: { w: 460, h: 130 }, style: { background: ST_BLUSH, color: ST_CHERRY_DARK, borderRadius: '32px', fontSize: 44, fontWeight: 800, fontFamily: FONT, textAlign: 'center', paddingTop: 30 }, content: 'Cambio 🔄' }),
        el({ id: 'op2', type: 'badge', role: 'ai', position: { x: 550, y: 940 }, size: { w: 460, h: 130 }, style: { background: ST_BLUSH, color: ST_CHERRY_DARK, borderRadius: '32px', fontSize: 44, fontWeight: 800, fontFamily: FONT, textAlign: 'center', paddingTop: 30 }, content: 'Mantenimiento ✨' }),
        body('nota', 'fixed', 'Con los votos de tus stories luego decido las promos del mes.', 1280, { size: 38, align: 'center', opacity: 0.7, color: ST_INK }),
      ]),
    ],
  }
}

/** Pack 3 · Plantilla 1 — "Tips de experta" (autoridad, 3 slides). */
function tTips(): StoryDesignTemplate {
  return {
    id: '', title: 'Tips de experta', slug: 'tips-experta', category: 'Autoridad',
    description: 'Tres consejos de verdad — los que dan ganas de mencionarte.',
    coverImage: null, isLocked: false, status: 'published',
    recommendedUse: 'Una vez por semana: posiciona tu criterio sin hablar de ti.',
    defaultStyle: PILL_SOFT, tags: ['educación', 'criterio'],
    slides: [
      slide(1, ST_CHERRY_DARK, 'text-only', [
        el({ id: 'lbl', type: 'badge', role: 'fixed', position: { x: 60, y: 200 }, size: { w: 420, h: 74 }, style: { background: ST_BUTTERMILK, color: ST_CHERRY_DARK, borderRadius: '40px', fontSize: 30, fontWeight: 800, fontFamily: FONT, textAlign: 'center' }, content: '3 TIPS DE PELUQUERÍA' }),
        headline('title', 'ai', 'Para que tu corte siga igual de bien a las 3 semanas', 380, { size: 68, color: '#FFFFFF', lh: 1.2 }),
      ]),
      slide(2, ST_CREAM, 'list', [
        headline('t1', 'ai', '1 · Duerme con pelo suelto, no mojado', 280, { size: 56, color: ST_CHERRY_DARK }),
        headline('t2', 'ai', '2 · El secado de 4 min alarga tu corte', 640, { size: 56, color: ST_CHERRY_DARK }),
        headline('t3', 'ai', '3 · Renueva tu corte antes de que te lo "coja"', 1000, { size: 56, color: ST_CHERRY_DARK }),
        body('cta', 'ai', '¿Cuál practicas hoy? Cuéntame en una respuesta.', 1400, { size: 42, align: 'center', color: 'rgba(42,11,18,0.8)' }),
      ]),
      slide(3, ST_BLUSH, 'quote', [
        headline('cierre', 'ai', 'Un corte que envejece bien es un corte bien pensado.', 560, { size: 70, color: ST_CHERRY_DARK, align: 'center', italic: true }),
        ctaChip('cta', 'ai', 'Reserva tu próxima', 1280, { align: 'center', bg: ST_CHERRY, color: '#FFFFFF' }),
      ]),
    ],
  }
}

/** Pack 3 · Plantilla 2 — "Caja de preguntas" (2 slides). */
function tPreguntas(): StoryDesignTemplate {
  return {
    id: '', title: 'Caja de preguntas', slug: 'caja-preguntas', category: 'Caja de preguntas',
    description: 'Abre conversación en privado — la forma más suave de captar clientas.',
    coverImage: null, isLocked: false, status: 'published',
    recommendedUse: 'Jueves tarde o antes de publicar huecos de agenda.',
    defaultStyle: PILL_SOFT, tags: ['captación', 'conversación'],
    slides: [
      slide(1, ST_BUTTERMILK, 'question-box', [
        headline('title', 'ai', '¿Te da miedo cambiar de peluquería?', 380, { size: 74, color: ST_CHERRY_DARK, align: 'center', lh: 1.2 }),
        body('explicacion', 'ai', 'Cuéntamelo en el recuadro — lo respondo hoy mismo y sin compromiso.', 1120, { size: 44, color: ST_CHERRY_DARK, align: 'center' }),
      ]),
      slide(2, ST_CREAM, 'text-only', [
        headline('cierre', 'ai', 'Preguntas más repetidas → respuestas en stories esta semana', 380, { size: 64, color: ST_CHERRY_DARK, align: 'center', lh: 1.25 }),
        body('nota', 'fixed', 'Las que más me lleguen se convierten en stories (siempre anónimas).', 1120, { size: 40, align: 'center', opacity: 0.7, color: ST_INK }),
      ]),
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PACKS SEMILLA
// ─────────────────────────────────────────────────────────────────────────────

/** Los packs que siembra el botón "Generar packs iniciales" del admin. */
export interface StoryPackSeedRow {
  slug: string
  title: string
  goal: StoryDesignPack['goal']
  description: string
  flowType: StoryDesignPack['flowType']
  storyCount: number
  templates: StoryDesignTemplate[]
  sort: number
}

export function seedPacks(): StoryPackSeedRow[] {
  const pack = (
    slug: string,
    title: string,
    goal: StoryDesignPack['goal'],
    description: string,
    flowType: StoryDesignPack['flowType'],
    templates: StoryDesignTemplate[],
    sort: number
  ): StoryPackSeedRow => ({
    slug, title, goal, description, flowType,
    storyCount: templates.length,
    templates,
    sort,
  })
  return [
    pack(
      'vender-con-historia',
      'Vender con historia',
      'vender',
      'Cuatro secuencias para llevar un servicio concreto de la palabra al botón de agendar. Del gancho al “escríbeme” sin sonar a comercial.',
      'sequence-launch',
      [tStoryQueVende(), tAntesyDespues(), tTratamiento(), tPromocion()],
      1
    ),
    pack(
      'llenar-la-agenda',
      'Llenar la agenda',
      'captar',
      'Tres secuencias para cuando la agenda tiene huecos: los anuncias con valor, pruebas reales y conversación — nunca bajando el precio por desesperación.',
      'capture',
      [tAgendaHuecos(), tResultados(), tEncuesta()],
      2
    ),
    pack(
      'autoridad-al-aire',
      'Autoridad al aire',
      'autoridad',
      'Dos secuencias que educan y posiciones tu criterio de experta. El tipo de stories que hace que mencionen tu nombre.',
      'nurture',
      [tTips(), tPreguntas()],
      3
    ),
  ]
}