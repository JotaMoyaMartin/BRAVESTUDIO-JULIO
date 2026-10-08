/**
 * STORIES DISEÑO — semillas editoriales (v2.1, añade sobre `samples.ts`).
 *
 * Tres secuencias pensadas como portada de la galería: la primera página de
 * cada plantilla funciona como miniatura (portada editorial). Reutilizan la
 * paleta exportada de `samples.ts` (ST_*) y replican sus fábricas con dos
 * extras que estas plantillas exigen: `name` (capa humana) y `zIndex`
 * explícito en TODAS las capas (el builder necesita orden estable).
 *
 * Voz: la de siempre — directa, de salón, sin paja. Los textos 'ai' son
 * esbozos que la IA adapta con la marca; los 'editable' ya sirven tal cual.
 */

import type {
  StoryAiPurpose,
  StoryDesignElement,
  StoryDesignSlide,
  StoryDesignTemplate,
  StoryElementRole,
  StorySlideLayoutType,
  StorySlidePurpose,
  StoryElementType,
} from './types'

import {
  ST_BUTTERMILK,
  ST_BLUSH,
  ST_CHERRY,
  ST_CHERRY_DARK,
  ST_CREAM,
  ST_INK,
} from './samples'

/* ── Constantes locales (samples.ts no las exporta) ────────────────────── */

const FONT = 'Poppins, Montserrat, sans-serif'
const CANVAS_W = 1080
const CANVAS_H = 1920

/* ── Fábricas de capas (con name + zIndex obligatorios) ────────────────── */

type LayerInput = Partial<StoryDesignElement> &
  Pick<StoryDesignElement, 'id' | 'type' | 'role'>

function el(e: LayerInput): StoryDesignElement {
  const base: StoryDesignElement = {
    id: e.id,
    type: e.type,
    role: e.role,
    name: e.name,
    position: e.position ?? { x: 0, y: 0 },
    size: e.size ?? { w: CANVAS_W, h: 200 },
    rotation: e.rotation,
    zIndex: e.zIndex,
    style: e.style ?? {},
    content: e.content,
    placeholder: e.placeholder,
    maxLength: e.maxLength,
    constraints: e.constraints,
    aiConfig: e.aiConfig,
    allowedAssetTypes: e.allowedAssetTypes,
    frame: e.frame,
    locked: e.locked,
    visible: e.visible,
  }
  if (e.type === 'text') {
    base.style = { fontFamily: FONT, color: ST_INK, textAlign: 'left', ...e.style }
  }
  return base
}

interface TextOpts {
  name: string
  z: number
  x?: number
  w?: number
  h?: number
  size?: number
  color?: string
  align?: 'left' | 'center'
  lh?: number
  weight?: number
  italic?: boolean
  shadow?: string
  opacity?: number
  maxLength?: number
  maxLines?: number
  purpose?: StoryAiPurpose
  hints?: string[]
}

function aiConfig(o: Pick<TextOpts, 'purpose' | 'hints'>): StoryDesignElement['aiConfig'] {
  return o.purpose ? { purpose: o.purpose, hints: o.hints } : undefined
}

/** Titular grande (Poppins 800). */
function headline(
  id: string,
  role: StoryElementRole,
  content: string,
  y: number,
  o: TextOpts
): StoryDesignElement {
  const size = o.size ?? 88
  return el({
    id,
    type: 'text',
    role,
    name: o.name,
    zIndex: o.z,
    content,
    position: { x: o.x ?? 60, y },
    size: { w: o.w ?? CANVAS_W - (o.x ?? 0) - 120, h: size * 1.3 * (o.maxLines ?? 2) },
    constraints: { maxLength: o.maxLength ?? 60, maxLines: o.maxLines },
    aiConfig: aiConfig(o),
    style: {
      fontSize: size,
      fontWeight: 800,
      lineHeight: (o.lh ?? 1.14).toString(),
      letterSpacing: '-2px',
      color: o.color ?? ST_INK,
      textAlign: o.align ?? 'left',
      ...(o.italic ? { fontStyle: 'italic' } : {}),
      ...(o.shadow ? { textShadow: o.shadow } : {}),
      ...(o.opacity !== undefined ? { opacity: o.opacity } : {}),
    },
  })
}

/** Párrafo de apoyo. */
function body(
  id: string,
  role: StoryElementRole,
  content: string,
  y: number,
  o: TextOpts
): StoryDesignElement {
  const size = o.size ?? 44
  return el({
    id,
    type: 'text',
    role,
    name: o.name,
    zIndex: o.z,
    content,
    position: { x: o.x ?? 60, y },
    size: { w: o.w ?? CANVAS_W - (o.x ?? 0) - 120, h: o.h ?? size * 2.6 },
    constraints: { maxLength: o.maxLength ?? 400, maxLines: o.maxLines },
    aiConfig: aiConfig(o),
    style: {
      fontSize: size,
      fontWeight: o.weight ?? 500,
      lineHeight: (o.lh ?? 1.3).toString(),
      color: o.color ?? ST_INK,
      textAlign: o.align ?? 'left',
      ...(o.opacity !== undefined ? { opacity: o.opacity } : {}),
    },
  })
}

/** Antetítulo pequeño en MAYÚSCULAS. */
function chipText(
  id: string,
  role: StoryElementRole,
  content: string,
  y: number,
  o: { name: string; z: number; x?: number; w?: number; color?: string; align?: 'left' | 'center' }
): StoryDesignElement {
  return el({
    id,
    type: 'text',
    role,
    name: o.name,
    zIndex: o.z,
    content,
    maxLength: 40,
    constraints: { maxLength: 40 },
    position: { x: o.x ?? 60, y },
    size: { w: o.w ?? CANVAS_W, h: 50 },
    style: {
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: '4px',
      textTransform: 'uppercase',
      color: o.color ?? (o.align === 'center' ? ST_CHERRY_DARK : ST_CHERRY),
      textAlign: o.align ?? 'left',
    },
  })
}

interface PillOpts {
  name: string
  z: number
  x: number
  y: number
  w: number
  h?: number
  bg: string
  color: string
  size?: number
  radius?: string
  spacing?: number
  rotate?: number
  align?: 'center' | 'left'
  maxLength?: number
  weight?: number
}

/** Píldora/badge (etiquetas, pasos, chips flotantes). */
function pill(id: string, role: StoryElementRole, content: string, o: PillOpts): StoryDesignElement {
  const h = o.h ?? 84
  return el({
    id,
    type: 'badge',
    role,
    name: o.name,
    zIndex: o.z,
    rotation: o.rotate,
    content,
    maxLength: o.maxLength ?? 40,
    constraints: { maxLength: o.maxLength ?? 40 },
    position: { x: o.x, y: o.y },
    size: { w: o.w, h },
    style: {
      fontFamily: FONT,
      fontSize: o.size ?? 30,
      fontWeight: o.weight ?? 800,
      letterSpacing: `${o.spacing ?? 3}px`,
      background: o.bg,
      color: o.color,
      borderRadius: o.radius ?? '45px',
      textAlign: o.align ?? 'center',
      paddingTop: 20,
      paddingBottom: 20,
      paddingLeft: 32,
      paddingRight: 32,
    },
  })
}

/** Píldora CTA (llamada principal del cierre). */
function ctaChip(
  id: string,
  role: StoryElementRole,
  content: string,
  y: number,
  o: { name: string; z: number; align?: 'center' | 'left'; bg?: string; color?: string; maxLength?: number; purpose?: StoryAiPurpose; hints?: string[] }
): StoryDesignElement {
  return el({
    id,
    type: 'badge',
    role,
    name: o.name,
    zIndex: o.z,
    content,
    maxLength: o.maxLength ?? 42,
    constraints: { maxLength: o.maxLength ?? 42 },
    aiConfig: o.purpose ? { purpose: o.purpose, hints: o.hints } : undefined,
    position: { x: o.align === 'center' ? 0 : 60, y },
    size: { w: o.align === 'center' ? CANVAS_W : 860, h: 112 },
    style: {
      fontSize: 42,
      fontWeight: 800,
      fontFamily: FONT,
      background: o.bg ?? ST_CHERRY,
      color: o.color ?? '#FFFFFF',
      borderRadius: '60px',
      textAlign: 'center',
      paddingTop: 22,
      paddingBottom: 22,
      paddingLeft: 48,
      paddingRight: 48,
    },
  })
}

interface PhotoOpts {
  name: string
  z: number
  x?: number
  y: number
  w?: number
  h?: number
  bg?: string
  radius?: string
  placeholder?: string
}

/** Slot de foto (role replaceable, sin URLs: solo fondos elegantes). */
function photoSlot(id: string, o: PhotoOpts): StoryDesignElement {
  return el({
    id,
    type: 'image',
    role: 'replaceable',
    name: o.name,
    zIndex: o.z,
    content: '',
    placeholder: o.placeholder ?? 'Toca para subir foto',
    allowedAssetTypes: ['sample_photo', 'user_photo'],
    position: { x: o.x ?? 60, y: o.y },
    size: { w: o.w ?? CANVAS_W - 120, h: o.h ?? 760 },
    style: {
      borderRadius: o.radius ?? '48px',
      objectFit: 'cover',
      background: o.bg ?? 'rgba(42,11,18,0.08)',
    },
  })
}

/** Overlay/gradiente decorativo (capa de lectura sobre foto). */
function overlay(
  id: string,
  o: { name: string; z: number; x?: number; y: number; w?: number; h: number; bg: string; radius?: string }
): StoryDesignElement {
  return el({
    id,
    type: 'shape',
    role: 'decorative',
    name: o.name,
    zIndex: o.z,
    position: { x: o.x ?? 0, y: o.y },
    size: { w: o.w ?? CANVAS_W, h: o.h },
    style: { background: o.bg, ...(o.radius ? { borderRadius: o.radius } : {}) },
  })
}

/** Línea decorativa corta (firma de la serie editorial). */
function decoLine(
  id: string,
  o: { name: string; z: number; x: number; y: number; bg: string; w?: number }
): StoryDesignElement {
  return el({
    id,
    type: 'line',
    role: 'decorative',
    name: o.name,
    zIndex: o.z,
    position: { x: o.x, y: o.y },
    size: { w: o.w ?? 140, h: 8 },
    style: { background: o.bg, borderRadius: '8px' },
  })
}

function slide(
  order: number,
  background: string,
  layoutType: StorySlideLayoutType,
  elements: StoryDesignElement[],
  o: { name: string; purpose?: StorySlidePurpose }
): StoryDesignSlide {
  return { id: '', templateId: '', order, background, layoutType, elements, name: o.name, purpose: o.purpose }
}

/* ─────────────────────────────────────────────────────────────────────────
   PLANTILLA 1 — Tratamiento destacado (editorial champagne)
   ───────────────────────────────────────────────────────────────────────── */

/** Portada editorial en buttermilk + cream + cherry: el tratamiento como revista. */
function tTratamientoEditorial(): StoryDesignTemplate {
  return {
    id: '', // DB
    title: 'Tratamiento destacado',
    slug: 'tratamiento-editorial',
    category: 'Tratamientos',
    description:
      'Una mini-editorial para presentar un tratamiento: portada con la foto del resultado, qué es, el proceso en tres pasos y cierre con cita.',
    coverImage: null,
    isLocked: false,
    status: 'published',
    version: 2,
    defaultStyle: {},
    tags: ['nuevo', 'recomendado', 'ia'],
    recommendedUse: 'Cuando quieres que un tratamiento se entienda y se agende sin bajar el precio.',
    slides: [
      // 1 — Gancho: portada full-bleed con la foto del resultado
      slide(1, ST_INK, 'full-photo', [
        photoSlot('te1-foto', {
          name: 'Foto del resultado (todo el alto)', z: 20,
          x: 0, y: 0, w: 1080, h: 1920,
          bg: 'rgba(255,241,181,0.12)', radius: '0px',
          placeholder: 'La foto del resultado, ocupando toda la story',
        }),
        overlay('te1-ovl', {
          name: 'Overlay degradado (leer sobre foto)', z: 30,
          y: 760, h: 1160,
          bg: 'linear-gradient(180deg, rgba(42,11,18,0) 42%, rgba(42,11,18,0.72) 100%)',
        }),
        pill('te1-badge', 'fixed', 'EN DETALLE', {
          name: 'Etiqueta EN DETALLE', z: 40,
          x: 60, y: 120, w: 430,
          bg: ST_BUTTERMILK, color: ST_CHERRY_DARK,
        }),
        decoLine('te1-line', { name: 'Línea champagne', z: 40, x: 60, y: 1252, bg: ST_BUTTERMILK }),
        headline('te1-hook', 'ai', 'Hidratación profunda sin planchas ni milagros', 1300, {
          name: 'Titular gancho', z: 40,
          size: 78, color: '#FFFFFF', lh: 1.14,
          maxLength: 62, maxLines: 3,
          shadow: '0 2px 24px rgba(42,11,18,0.5)',
          purpose: 'hook',
          hints: ['Parte del resultado que se ve en la foto, sin prometer milagros', 'Una frase corta, como se lo dirías en el sillón'],
        }),
        body('te1-firma', 'brand', '{{salon_name}}', 1790, {
          name: 'Firma del salón', z: 40,
          size: 34, weight: 700, color: 'rgba(255,255,255,0.85)',
          maxLength: 48,
        }),
      ], { name: 'Portada — el gancho del tratamiento', purpose: 'hook' }),

      // 2 — Explicación: mitad texto (buttermilk), mitad foto vertical
      slide(2, ST_BUTTERMILK, 'split', [
        chipText('te2-tag', 'fixed', 'EN QUÉ CONSISTE', 150, {
          name: 'Antetítulo EN QUÉ CONSISTE', z: 40, w: 470,
        }),
        headline('te2-title', 'ai', '¿Qué es la hidratación profunda?', 260, {
          name: 'Pregunta titular', z: 40,
          size: 56, color: ST_CHERRY_DARK, lh: 1.16, w: 440,
          maxLength: 44, maxLines: 3,
          purpose: 'explain',
          hints: ['Conviértela en la pregunta exacta que te hacen en la peluquería'],
        }),
        body('te2-body', 'ai', 'No es una crema: es una terapia que lleva agua hasta dentro de la fibra y la sella para que no se escape. Se hace en cabina, sin calor agresivo.', 540, {
          name: 'Explicación corta', z: 40,
          size: 38, weight: 500, color: 'rgba(42,11,18,0.85)', w: 440,
          maxLength: 170, maxLines: 8,
          purpose: 'explain',
          hints: ['Explica el servicio en dos frases, sin jerga de frasco'],
        }),
        body('te2-b1', 'editable', '· Para pelo poroso, apagado o con frizz', 950, {
          name: 'Para quién va — 1', z: 40,
          size: 34, weight: 600, w: 440,
          maxLength: 60, maxLines: 2,
        }),
        body('te2-b2', 'editable', '· Justo después del verano o de un color', 1090, {
          name: 'Para quién va — 2', z: 40,
          size: 34, weight: 600, w: 440,
          maxLength: 60, maxLines: 2,
        }),
        body('te2-b3', 'editable', '· Antes de una boda o un evento importante', 1230, {
          name: 'Para quién va — 3', z: 40,
          size: 34, weight: 600, w: 440,
          maxLength: 60, maxLines: 2,
        }),
        photoSlot('te2-foto', {
          name: 'Foto vertical del tratamiento', z: 20,
          x: 586, y: 110, w: 434, h: 1700,
          bg: 'rgba(255,253,245,0.6)', radius: '40px',
          placeholder: 'Toca para subir la foto del detalle',
        }),
      ], { name: 'Qué es — texto a la izquierda, foto a la derecha', purpose: 'explain' }),

      // 3 — Solución: el proceso en tres pasos (fondo cream)
      slide(3, ST_CREAM, 'text-only', [
        chipText('te3-tag', 'fixed', 'EL PROCESO', 190, {
          name: 'Antetítulo EL PROCESO', z: 40,
        }),
        pill('te3-p1', 'editable', 'PASO 1 · Análisis: vemos el estado real de tu fibra', {
          name: 'Paso 1 — análisis', z: 40,
          x: 60, y: 380, w: 960, h: 130,
          bg: ST_BLUSH, color: ST_CHERRY_DARK,
          size: 36, radius: '40px', align: 'left',
          maxLength: 70,
        }),
        pill('te3-p2', 'editable', 'PASO 2 · Tratamiento: ampolla y vapor según tu pelo', {
          name: 'Paso 2 — tratamiento', z: 40,
          x: 60, y: 560, w: 960, h: 130,
          bg: ST_BLUSH, color: ST_CHERRY_DARK,
          size: 36, radius: '40px', align: 'left',
          maxLength: 70,
        }),
        pill('te3-p3', 'editable', 'PASO 3 · Sellado: brillo que se nota al peinarte', {
          name: 'Paso 3 — sellado', z: 40,
          x: 60, y: 740, w: 960, h: 130,
          bg: ST_BLUSH, color: ST_CHERRY_DARK,
          size: 36, radius: '40px', align: 'left',
          maxLength: 70,
        }),
        body('te3-body', 'ai', 'Cada paso se ajusta a lo que tu cabello pidió en el análisis: nunca repetimos la misma fórmula dos veces. Al salir, te llevas la pauta exacta para mantenerlo en casa.', 930, {
          name: 'Explicación del resultado', z: 40,
          size: 40, color: 'rgba(42,11,18,0.85)',
          maxLength: 200, maxLines: 6,
          purpose: 'explain',
          hints: ['Cierra el proceso explicando qué se lleva la clienta tras la cita'],
        }),
        decoLine('te3-line', { name: 'Línea de acento', z: 30, x: 60, y: 1240, bg: ST_CHERRY }),
        pill('te3-dur', 'fixed', 'DURACIÓN: 1 HORA', {
          name: 'Etiqueta duración', z: 40,
          x: 60, y: 1400, w: 470,
          bg: ST_INK, color: ST_BUTTERMILK,
        }),
      ], { name: 'El proceso paso a paso', purpose: 'solution' }),

      // 4 — CTA: franja de foto abajo + chips flotantes rotados
      slide(4, ST_CREAM, 'full-photo', [
        chipText('te4-tag', 'fixed', 'EL PASO SIGUIENTE', 160, {
          name: 'Antetítulo EL PASO SIGUIENTE', z: 40,
        }),
        headline('te4-title', 'ai', 'Tu hidratación, agendada esta semana.', 400, {
          name: 'Titular de cierre', z: 40,
          size: 76, color: ST_CHERRY_DARK, lh: 1.15,
          maxLength: 60, maxLines: 2,
          purpose: 'cta',
          hints: ['Cierra con una llamada a reservar esta semana, sin urgencias falsas'],
        }),
        body('te4-ig', 'brand', '@{{ig}}', 660, {
          name: 'Firma Instagram', z: 40,
          size: 38, weight: 700, color: ST_CHERRY,
          maxLength: 30,
        }),
        photoSlot('te4-foto', {
          name: 'Foto del cierre (franja inferior)', z: 20,
          x: 60, y: 1120, w: 960, h: 800,
          bg: 'rgba(255,241,181,0.35)', radius: '40px',
          placeholder: 'Toca para subir la foto del detalle',
        }),
        pill('te4-precio', 'editable', 'DESDE 39 €', {
          name: 'Etiqueta flotante de precio', z: 50,
          x: 90, y: 1080, w: 320, h: 92,
          bg: ST_INK, color: ST_BUTTERMILK,
          size: 34, radius: '46px', spacing: 2, rotate: -4,
          maxLength: 24,
        }),
        pill('te4-dura', 'editable', 'EN 1 HORA', {
          name: 'Etiqueta flotante de duración', z: 50,
          x: 630, y: 1110, w: 360, h: 92,
          bg: ST_CHERRY, color: '#FFFFFF',
          size: 34, radius: '46px', spacing: 2, rotate: 4,
          maxLength: 24,
        }),
        ctaChip('te4-cta', 'ai', 'Reserva tu cita', 1600, {
          name: 'Botón Reserva tu cita', z: 50,
          align: 'center',
          maxLength: 42, purpose: 'cta',
          hints: ['CTA corto que invite a escribir o pedir el hueco por Instagram'],
        }),
      ], { name: 'Cierre — reserva tu cita', purpose: 'cta' }),
    ],
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PLANTILLA 2 — Antes y después (tinta oscura + blanco)
   ───────────────────────────────────────────────────────────────────────── */

/** La prueba visual: dos fotos enfrentadas y el proceso detrás, sin adornos. */
function tAntesDespuesEditorial(): StoryDesignTemplate {
  return {
    id: '',
    title: 'Antes y después',
    slug: 'antes-despues-editorial',
    category: 'Antes y después',
    description:
      'El antes y el después enfrentados en la misma story, con el proceso contado sin adornos. La prueba visual que más respuestas trae.',
    coverImage: null,
    isLocked: false,
    status: 'published',
    version: 2,
    defaultStyle: {},
    tags: ['nuevo', 'recomendado', 'ia'],
    recommendedUse: 'Publica la secuencia nada más terminar un trabajo del que estés orgullosa, con permiso de la clienta.',
    slides: [
      // 1 — Gancho: el trabajo del mes a sangre
      slide(1, ST_INK, 'full-photo', [
        photoSlot('ad1-foto', {
          name: 'Foto del trabajo del mes (todo el alto)', z: 20,
          x: 0, y: 0, w: 1080, h: 1920,
          bg: 'rgba(255,255,255,0.12)', radius: '0px',
          placeholder: 'La mejor foto del trabajo del mes, a sangre',
        }),
        overlay('ad1-ovl', {
          name: 'Overlay degradado (leer sobre foto)', z: 30,
          y: 740, h: 1180,
          bg: 'linear-gradient(180deg, rgba(42,11,18,0) 30%, rgba(42,11,18,0.8) 100%)',
        }),
        pill('ad1-badge', 'fixed', 'RESULTADOS REALES', {
          name: 'Etiqueta RESULTADOS REALES', z: 40,
          x: 60, y: 120, w: 480,
          bg: 'rgba(255,255,255,0.92)', color: ST_INK,
        }),
        decoLine('ad1-line', { name: 'Línea blanca', z: 40, x: 60, y: 1256, bg: 'rgba(255,255,255,0.9)' }),
        headline('ad1-hook', 'ai', 'Antes y después: el trabajo de este mes', 1310, {
          name: 'Titular gancho', z: 40,
          size: 76, color: '#FFFFFF', lh: 1.14,
          maxLength: 60, maxLines: 3,
          shadow: '0 2px 24px rgba(42,11,18,0.55)',
          purpose: 'hook',
          hints: ['Presenta el caso real del mes con la voz del salón'],
        }),
      ], { name: 'Portada — resultados reales', purpose: 'hook' }),

      // 2 — Comparativa: dos fotos al lado (ANTES / DESPUÉS)
      slide(2, ST_INK, 'split', [
        pill('ad2-badge-a', 'fixed', 'ANTES', {
          name: 'Etiqueta ANTES', z: 40,
          x: 60, y: 260, w: 360,
          bg: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.8)',
          size: 32, radius: '42px',
        }),
        pill('ad2-badge-d', 'fixed', 'DESPUÉS', {
          name: 'Etiqueta DESPUÉS', z: 40,
          x: 560, y: 260, w: 420,
          bg: 'rgba(255,255,255,0.92)', color: ST_INK,
          size: 32, radius: '42px',
        }),
        photoSlot('ad2-foto-a', {
          name: 'Foto del antes', z: 20,
          x: 60, y: 340, w: 460, h: 1030,
          bg: 'rgba(255,255,255,0.12)', radius: '30px',
          placeholder: 'La foto del antes',
        }),
        photoSlot('ad2-foto-d', {
          name: 'Foto del después', z: 20,
          x: 560, y: 340, w: 460, h: 1030,
          bg: 'rgba(255,255,255,0.12)', radius: '30px',
          placeholder: 'La foto del después',
        }),
        body('ad2-body', 'ai', 'La diferencia no es el filtro: es la preparación de la fibra antes del color y el sellado final.', 1460, {
          name: 'Nota de lo que cambió', z: 40,
          size: 40, color: 'rgba(255,255,255,0.88)',
          maxLength: 140, maxLines: 3,
          purpose: 'explain',
          hints: ['Explica en dos líneas qué marca la diferencia entre las dos fotos'],
        }),
        body('ad2-hint', 'fixed', 'Desliza para ver cómo lo hice →', 1660, {
          name: 'Aviso de deslizar', z: 40,
          size: 30, weight: 700, align: 'center', color: 'rgba(255,255,255,0.55)',
          maxLength: 44,
        }),
      ], { name: 'Comparativa — antes y después juntos', purpose: 'explain' }),

      // 3 — El proceso, sin ediciones (fondo blush)
      slide(3, ST_BLUSH, 'text-only', [
        chipText('ad3-tag', 'fixed', 'CÓMO LO TRABAJÉ', 170, {
          name: 'Antetítulo CÓMO LO TRABAJÉ', z: 40,
        }),
        body('ad3-body', 'ai', 'Antes de tocar el color, corté todo lo que no tenía arreglo. Después reconstruí la fibra por dentro con mascarilla en cabina. Y al final, el glaze para cerrar el color con brillo.', 300, {
          name: 'El proceso en frases', z: 40,
          size: 44, weight: 600, lh: 1.35,
          maxLength: 210, maxLines: 6,
          purpose: 'explain',
          hints: ['Cuenta el proceso en tres frases, en el orden real del trabajo'],
        }),
        body('ad3-b1', 'editable', '· Corte de lo que no se salva, antes de tratar', 740, {
          name: 'Punto del proceso — 1', z: 40,
          size: 40, weight: 700, color: ST_CHERRY_DARK,
          maxLength: 72, maxLines: 2,
        }),
        body('ad3-b2', 'editable', '· Reconstrucción en cabina paso a paso', 890, {
          name: 'Punto del proceso — 2', z: 40,
          size: 40, weight: 700, color: ST_CHERRY_DARK,
          maxLength: 72, maxLines: 2,
        }),
        body('ad3-b3', 'editable', '· Glaze final para cerrar el color con brillo', 1040, {
          name: 'Punto del proceso — 3', z: 40,
          size: 40, weight: 700, color: ST_CHERRY_DARK,
          maxLength: 72, maxLines: 2,
        }),
        decoLine('ad3-line', { name: 'Línea de acento', z: 30, x: 60, y: 1220, bg: ST_CHERRY }),
      ], { name: 'El proceso, sin ediciones', purpose: 'explain' }),

      // 4 — CTA: la próxima historia
      slide(4, ST_INK, 'text-only', [
        pill('ad4-badge', 'decorative', 'SERIE ANTES Y DESPUÉS', {
          name: 'Etiqueta de la serie', z: 40,
          x: 300, y: 170, w: 480,
          bg: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)',
          size: 28, radius: '45px',
        }),
        headline('ad4-title', 'ai', '¿Quieres ser la clienta de la próxima historia?', 560, {
          name: 'Titular de cierre', z: 40,
          size: 78, color: '#FFFFFF', align: 'center', lh: 1.18,
          maxLength: 60, maxLines: 3,
          purpose: 'cta',
          hints: ['Invita a la seguidora a ser la protagonista de la siguiente edición'],
        }),
        decoLine('ad4-line', { name: 'Línea centrada', z: 30, x: 470, y: 940, bg: 'rgba(255,255,255,0.9)' }),
        ctaChip('ad4-cta', 'ai', 'Escríbeme "HISTORIA"', 1160, {
          name: 'Botón de reserva', z: 50,
          align: 'center',
          bg: 'rgba(255,255,255,0.95)', color: ST_INK,
          maxLength: 42, purpose: 'cta',
          hints: ['CTA con una palabra clave para leer por Instagram'],
        }),
        body('ad4-firma', 'brand', '@{{ig}}', 1330, {
          name: 'Firma Instagram', z: 40,
          size: 36, weight: 700, align: 'center', color: 'rgba(255,255,255,0.75)',
          maxLength: 30,
        }),
      ], { name: 'Cierre — la próxima historia', purpose: 'cta' }),
    ],
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PLANTILLA 3 — Consejo experto (blush / cream fresco)
   ───────────────────────────────────────────────────────────────────────── */

/** Autoridad sin vender: una señal, un diagnóstico y una cita sin compromiso. */
function tConsejoExperto(): StoryDesignTemplate {
  return {
    id: '',
    title: 'Consejo experto',
    slug: 'consejo-experto',
    category: 'Consejos',
    description:
      'Un consejo de la experta que la clienta puede aplicar en casa. Autoridad limpia, sin vender nada en el mensaje.',
    coverImage: null,
    isLocked: false,
    status: 'published',
    version: 2,
    defaultStyle: {},
    tags: ['nuevo', 'recomendado', 'ia'],
    recommendedUse: 'Para las semanas sin promo: dos stories de criterio posicionan más que mil ofertas.',
    slides: [
      // 1 — Gancho: las tres señales (blush, titular gigante)
      slide(1, ST_BLUSH, 'split', [
        pill('ce1-badge', 'fixed', 'CONSEJO EXPERTO', {
          name: 'Etiqueta CONSEJO EXPERTO', z: 40,
          x: 60, y: 150, w: 460,
          bg: ST_CHERRY, color: '#FFFFFF',
        }),
        el({
          id: 'ce1-star',
          type: 'sticker',
          role: 'decorative',
          name: 'Estrella decorativa',
          zIndex: 30,
          rotation: -4,
          position: { x: 900, y: 120 },
          size: { w: 120, h: 120 },
          content: '✦',
          style: { fontSize: 96, color: 'rgba(122,24,50,0.3)', lineHeight: 1 },
        }),
        headline('ce1-title', 'ai', '3 señales de que tu cabello necesita un diagnóstico', 320, {
          name: 'Titular gancho', z: 40,
          size: 88, color: ST_INK, lh: 1.1,
          maxLength: 70, maxLines: 4,
          purpose: 'hook',
          hints: ['Gancho que genere reconocimiento inmediato en la seguidora'],
        }),
        photoSlot('ce1-foto', {
          name: 'Foto de apoyo (franja inferior)', z: 20,
          x: 60, y: 1020, w: 960, h: 800,
          bg: 'linear-gradient(180deg, rgba(255,253,245,1) 0%, rgba(255,241,181,0.8) 100%)', radius: '40px',
          placeholder: 'Toca para subir la foto del detalle',
        }),
      ], { name: 'Portada — tres señales', purpose: 'hook' }),

      // 2 — La lista: las tres señales (fondo cream)
      slide(2, ST_CREAM, 'list', [
        headline('ce2-title', 'ai', 'Tu cabello avisa antes de romperse.', 300, {
          name: 'Titular corto', z: 40,
          size: 56, color: ST_CHERRY_DARK, lh: 1.18,
          maxLength: 44, maxLines: 2,
          purpose: 'education',
          hints: ['Frase corta que prepare la lista de señales'],
        }),
        pill('ce2-n1', 'fixed', '1', {
          name: 'Número 1', z: 40,
          x: 60, y: 520, w: 96, h: 96,
          bg: ST_CHERRY_DARK, color: ST_BUTTERMILK,
          size: 42, radius: '50%', spacing: 0,
          maxLength: 4,
        }),
        body('ce2-s1', 'ai', 'Se apaga dos lavados después del champó', 520, {
          name: 'Señal 1', z: 40,
          x: 200, w: 800, size: 46, weight: 600, lh: 1.25,
          maxLength: 64, maxLines: 2,
          purpose: 'education',
          hints: ['Señal concreta y observable en el día a día'],
        }),
        pill('ce2-n2', 'fixed', '2', {
          name: 'Número 2', z: 40,
          x: 60, y: 800, w: 96, h: 96,
          bg: ST_CHERRY_DARK, color: ST_BUTTERMILK,
          size: 42, radius: '50%', spacing: 0,
          maxLength: 4,
        }),
        body('ce2-s2', 'ai', 'Encuentras más pelo en el peine de lo normal', 800, {
          name: 'Señal 2', z: 40,
          x: 200, w: 800, size: 46, weight: 600, lh: 1.25,
          maxLength: 64, maxLines: 2,
          purpose: 'education',
          hints: ['Señal concreta y observable en el día a día'],
        }),
        pill('ce2-n3', 'fixed', '3', {
          name: 'Número 3', z: 40,
          x: 60, y: 1080, w: 96, h: 96,
          bg: ST_CHERRY_DARK, color: ST_BUTTERMILK,
          size: 42, radius: '50%', spacing: 0,
          maxLength: 4,
        }),
        body('ce2-s3', 'ai', 'Se queda opaca aunque uses la mascarilla buena', 1080, {
          name: 'Señal 3', z: 40,
          x: 200, w: 800, size: 46, weight: 600, lh: 1.25,
          maxLength: 64, maxLines: 2,
          purpose: 'education',
          hints: ['Señal concreta y observable en el día a día'],
        }),
        decoLine('ce2-line', { name: 'Línea de acento', z: 30, x: 60, y: 1380, bg: ST_CHERRY }),
      ], { name: 'Las tres señales', purpose: 'education' }),

      // 3 — El diagnóstico: qué mira la experta (fondo buttermilk)
      slide(3, ST_BUTTERMILK, 'text-only', [
        headline('ce3-title', 'ai', 'El diagnóstico dice en 20 minutos lo que llevas meses dudando.', 300, {
          name: 'Titular del diagnóstico', z: 40,
          size: 64, color: ST_CHERRY_DARK, lh: 1.16,
          maxLength: 72, maxLines: 3,
          purpose: 'explain',
          hints: ['Da valor al diagnóstico antes de detallarlo'],
        }),
        body('ce3-body', 'ai', 'Miramos porosidad, estado del poro y cómo se estira y vuelve el elástico. Con eso se decide qué necesita tu cabello de verdad, no lo que te vendan por moda.', 640, {
          name: 'Qué mira el diagnóstico', z: 40,
          size: 46, color: 'rgba(42,11,18,0.88)',
          maxLength: 190, maxLines: 6,
          purpose: 'explain',
          hints: ['Detalla qué se revisa: porosidad, poro y elástico, sin tecnicismos'],
        }),
        decoLine('ce3-line', { name: 'Línea de acento', z: 30, x: 60, y: 1140, bg: ST_CHERRY }),
        el({
          id: 'ce3-icon',
          type: 'icon',
          role: 'decorative',
          name: 'Icono gota',
          zIndex: 30,
          position: { x: 60, y: 1500 },
          size: { w: 150, h: 150 },
          content: 'gota',
          style: { fontSize: 68, color: ST_CHERRY, background: 'rgba(255,253,245,0.95)', borderRadius: '75px' },
        }),
      ], { name: 'Qué mira el diagnóstico', purpose: 'solution' }),

      // 4 — CTA: el diagnóstico esta semana (fondo cream)
      slide(4, ST_CREAM, 'text-only', [
        headline('ce4-title', 'ai', 'Empieza tu diagnóstico esta semana', 480, {
          name: 'Titular de cierre', z: 40,
          size: 80, color: ST_INK, align: 'center', lh: 1.15,
          maxLength: 46, maxLines: 2,
          purpose: 'cta',
          hints: ['Cierra invitando a reservar el diagnóstico esta semana'],
        }),
        decoLine('ce4-line', { name: 'Línea centrada', z: 30, x: 470, y: 830, bg: ST_CHERRY }),
        ctaChip('ce4-cta', 'ai', 'Agenda tu cita', 1000, {
          name: 'Botón Agenda tu cita', z: 50,
          align: 'center',
          maxLength: 42, purpose: 'cta',
          hints: ['CTA corto para pedir el hueco por Instagram'],
        }),
        body('ce4-firma', 'brand', '@{{ig}}', 1200, {
          name: 'Firma Instagram', z: 40,
          size: 38, weight: 700, align: 'center', color: ST_CHERRY_DARK,
          maxLength: 30,
        }),
        pill('ce4-badge', 'editable', 'SIN COMPROMISO', {
          name: 'Etiqueta sin compromiso', z: 40,
          x: 330, y: 1420, w: 420,
          bg: ST_BLUSH, color: ST_CHERRY_DARK,
          size: 28, radius: '45px',
          maxLength: 24,
        }),
      ], { name: 'Cierre — empieza esta semana', purpose: 'cta' }),
    ],
  }
}

/* ── Seeds ─────────────────────────────────────────────────────────────── */

export interface EditorialSeed {
  packSlug: string
  template: StoryDesignTemplate
}

/**
 * Las tres secuencias editoriales nuevas (se siembran igual que `seedPacks`).
 * FUNCIÓN, no constante: rompe el ciclo de imports samples ↔ samples-editorial —
 * los templates se construyen al llamar (cuando ST_* de samples ya existen),
 * nunca en la evaluación del módulo.
 */
export function editorialSeeds(): EditorialSeed[] {
  return [
    { packSlug: 'vender-con-historia', template: tTratamientoEditorial() },
    { packSlug: 'vender-con-historia', template: tAntesDespuesEditorial() },
    { packSlug: 'autoridad-al-aire', template: tConsejoExperto() },
  ]
}