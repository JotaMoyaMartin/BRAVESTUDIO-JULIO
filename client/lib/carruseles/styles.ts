/**
 * REGISTRO DE ESTILOS VISUALES — Carruseles premium.
 *
 * Añadir un estilo = añadir un objeto aquí + carpeta public/carruseles/refs/<id>/
 * con 2-4 imágenes reales de ejemplo. La UI no cambia nada.
 *
 * El `imagePromptBase` es el BLOQUE STYLE SYSTEM que entra verbatim al prompt
 * de imagen de cada slide. Todo lo demás (palette, typography, photoDirection…)
 * es dirección de arte que prompts.ts compone.
 */
import type { StyleConfig, VisualTypeSpec } from './types'

/* Tipos visuales comunes (etiqueta ES + prompt EN verbatim por encadre). */
const VISUAL_TYPES: Record<string, VisualTypeSpec> = {
  hero_result: {
    label: 'Hero / resultado',
    prompt: 'hero shot of the finished hair result, full healthy glossy hair with elegant movement, premium editorial beauty photography.',
  },
  macro_detail: {
    label: 'Macro detalle',
    prompt: 'extreme macro hair detail shot: fiber texture, ends or root zone, shallow depth of field, crisp realistic hair strands, tactile quality.',
  },
  hands_process: {
    label: 'Manos al proceso',
    prompt: 'professional stylist hands working on the hair — separating a section, applying color or analyzing density — precise elegant hands, editorial process photography.',
  },
  tools: {
    label: 'Herramientas',
    prompt: 'professional hair tools still life — comb, scissors, sectioning clips, brush — arranged on a neutral premium surface, editorial still life.',
  },
  product: {
    label: 'Producto',
    prompt: 'beauty product still life: one or two professional haircare products, minimal editorial composition, soft shadows.',
  },
  extensions_material: {
    label: 'Material de extensiones',
    prompt: 'hair extension material on a professional tray: wefts, clips, tone-matching swatches, densities, editorial still life.',
  },
  lifestyle: {
    label: 'Lifestyle beauty',
    prompt: 'cropped lifestyle beauty portrait: shoulders or profile, hair falling over clothing, elegant natural movement, fashion magazine photography.',
  },
  salon_env: {
    label: 'Salón',
    prompt: 'salon environment detail: mirror reflection, styling chair or trolley, subtle cinematic lighting, editorial atmosphere.',
  },
  before_after: {
    label: 'Antes / después',
    prompt: 'before/after hair transition in a single refined editorial composition, honest contrast.',
  },
}

export function visualTypeSpec(type: string): VisualTypeSpec {
  return VISUAL_TYPES[type] ?? VISUAL_TYPES.hero_result
}

export function visualTypeLabel(type: string): string {
  return visualTypeSpec(type).label
}

/* ──────────────────────── ESTILO #01 — EDITORIAL HAIR LUXE ─────────────────── */

const EDITORIAL_HAIR_LUXE: StyleConfig = {
  id: 'editorial-hair-luxe',
  name: 'Editorial Hair Luxe',
  tagline: 'Editorial de belleza para tu salón.',
  description: 'Fotografía premium neutra, tipografía de revista de moda y una sola idea por slide. Elegante sin resultar ostentoso.',
  mood: ['Premium', 'Editorial', 'Sofisticado', 'Moderno'],
  status: 'live',
  accentColor: '#8a6d5a',
  referenceImages: [
    '/carruseles/refs/editorial-hair-luxe/r5.jpg',
    '/carruseles/refs/editorial-hair-luxe/r2.jpg',
    '/carruseles/refs/editorial-hair-luxe/r3.jpg',
    '/carruseles/refs/editorial-hair-luxe/r1.jpg',
  ],
  palette: {
    tokens: [
      { name: 'Arena', hex: '#C8B09A' },
      { name: 'Taupe', hex: '#8a6d5a' },
      { name: 'Chocolate', hex: '#4a3428' },
      { name: 'Crema', hex: '#F4EDE3' },
      { name: 'Negro cálido', hex: '#1D1713' },
    ],
    rules: [
      'Paleta neutra cálida: beige, arena, taupe, marrón, chocolate, crema, blanco roto.',
      'Nunca colores excesivamente saturados.',
      'Texto en blanco roto (off-white); overlay oscuro suave solo si hace falta para legibilidad.',
    ],
  },
  typography: {
    serif: 'high contrast fashion serif (Didot / Bodoni contemporary style), with elegant italic accents',
    sans: 'clean modern sans-serif in wide-tracked uppercase for subtitles, explanations and CTA',
    italicAccent: 'the italic serif is reserved for one highlighted phrase per slide (never full paragraphs)',
    rules: [
      'Titular serif muy grande; frase editorial en cursiva de alto impacto; explicación sans pequeña en mayúsculas; CTA pequeño visible.',
      'Nunca todas las frases con el mismo peso; negrita solo en palabras estratégicas.',
      'Contraste de jerarquía siempre: TÍTULO PRINCIPAL > frase editorial > explicación > CTA.',
    ],
  },
  copyStyle: {
    hook:
      'El hook conecta con problema, deseo, error, creencia, contradicción o identificación. Frases cortas y visuales como "Más claro no siempre significa más bonito." o "Si tu melena se ve vacía aunque sea larga…". PROHIBIDO empezar con "¿Sabías que...", "Hoy te contamos" o "3 tips para".',
    body: 'Una sola idea por slide. Título + máximo 1-3 líneas de explicación. Frases claras, guardables, específicas. Nunca párrafos.',
    cta: 'CTA conversacional y específico: "¿Quieres que valoremos tu caso? Escríbenos.", "Reserva tu valoración.", "¿Cuál encaja contigo?".',
    rules: [
      'Estructura HOOK → VALOR → CIERRE → CTA distribuida inteligentemente en las slides.',
      'Una idea principal por slide; el texto se respira.',
    ],
  },
  photoDirection: {
    types: VISUAL_TYPES,
    rotation: [
      { length: 2, sequence: ['lifestyle', 'hero_result'] },
      { length: 3, sequence: ['lifestyle', 'macro_detail', 'hero_result'] },
      { length: 4, sequence: ['lifestyle', 'macro_detail', 'hands_process', 'hero_result'] },
      { length: 5, sequence: ['lifestyle', 'macro_detail', 'hands_process', 'tools', 'hero_result'] },
      { length: 6, sequence: ['lifestyle', 'macro_detail', 'hands_process', 'extensions_material', 'product', 'hero_result'] },
    ],
  },
  layoutRules: [
    'Una idea principal por slide; generosos márgenes, espacio negativo, respiración editorial.',
    'Composición variable según la fotografía: izquierda, centro, esquina superior, zona inferior o asimétrica — nunca una plantilla fija repetida.',
  ],
  graphicElements: [
    'flechas editoriales dibujadas a mano para señalar raíz, puntas, dimensión, volumen o una zona concreta del cabello',
    'numeraciones editoriales 01. 02. 03. para listas; [A] [B] [C] para perfiles/opciones',
    'subrayados finos, líneas editoriales, comillas y pequeños labels sans en mayúsculas',
    'máximo 1 recurso gráfico por slide, con función explicativa',
  ],
  negativeRules: [
    'nada de stickers, elementos infantiles, iconos de librería o decoración sin función',
    'nunca destruir la fotografía para hacer hueco al texto',
    'no todos los bloques de texto con el mismo peso',
    'sin párrafos largos: una idea por slide',
  ],
  imagePromptBase:
    'Premium editorial beauty photography. Warm neutral palette. Taupe, beige, cream, dark brown. Realistic professional hair photography. Natural skin and hair textures. High-end beauty magazine aesthetic. Soft cinematic salon lighting. Subtle shadows. High contrast fashion serif typography combined with modern clean sans-serif. Elegant italic serif accents. Off-white typography. Strong hierarchy. Generous margins. Asymmetric editorial layout. Minimal graphic elements. No template look. No Canva aesthetic. Photorealistic. Sharp hair detail. No artificial AI-looking hair.',
}

/* ───────── ESTILOS PRÓXIMAMENTE (la escala ya está preparada) ────────
   status:'soon' los muestra deshabilitados en el picker con el diseño ya
   definido: activar = añadir imágenes de referencia + status:'live'.       */

const ESTUDIO_LIMPIO: StyleConfig = {
  ...EDITORIAL_HAIR_LUXE,
  id: 'estudio-limpio',
  name: 'Estudio Limpio',
  tagline: 'Herramientas y producto, con aire.',
  description: 'Bodegón de peluquería sobre fondo claro: tijeras, peines, producto y manos. Mucho espacio limpio para el texto. Ideal para consejos y educación.',
  mood: ['Limpio', 'Minimal', 'Profesional'],
  status: 'live',
  accentColor: '#7A1832',
  // Fotos propias de la app (catálogo /foto-inspo): solo como muestra del estilo.
  referenceImages: ['/carruseles/refs/estudio-limpio/m1.jpg', '/carruseles/refs/estudio-limpio/m2.jpg', '/carruseles/refs/estudio-limpio/m3.jpg'],
  palette: {
    tokens: [
      { name: 'Blanco', hex: '#FFFFFF' },
      { name: 'Papel', hex: '#F7F4EF' },
      { name: 'Ink', hex: '#22201E' },
      { name: 'Cherry', hex: '#7A1832' },
    ],
    rules: [
      'Fondos blancos y luz natural suave.',
      'Texto en ink; acentos cherry mínimos.',
    ],
  },
  typography: {
    serif: 'refined display serif',
    sans: 'geometric sans-serif with generous tracking',
    italicAccent: 'italic serif for one emotional phrase per slide',
    rules: ['Jerarquía simple: titular + 1 línea de apoyo.'],
  },
  copyStyle: {
    hook: 'Frases directas y cercanas, pregunta real de la clienta.',
    body: 'Una idea por slide, lenguaje llano.',
    cta: 'CTA cálido y específico.',
    rules: ['Sin tecnicismos innecesarios.'],
  },
  photoDirection: {
    types: VISUAL_TYPES,
    rotation: [
      { length: 3, sequence: ['lifestyle', 'hands_process', 'hero_result'] },
      { length: 4, sequence: ['lifestyle', 'tools', 'hands_process', 'hero_result'] },
    ],
  },
  layoutRules: ['Composición centrada, márgenes amplios.'],
  graphicElements: ['líneas finas', 'labels en mayúsculas'],
  negativeRules: ['sin elementos decorativos', 'una idea por slide'],
  imagePromptBase:
    'Clean bright still-life photography of professional hairdressing: scissors, combs, brushes, tint bowls, product bottles and expert hands, on plain light paper or soft grey seamless backgrounds. Soft natural window light with gentle shadows. Minimal, calm, editorial product-photo look. Large clean negative space. Photorealistic, premium. No template look, no stickers, no logos.',
}

const BRAVE_BURDEOS: StyleConfig = {
  ...EDITORIAL_HAIR_LUXE,
  id: 'brave-burdeos',
  name: 'Brave Burdeos',
  tagline: 'El carácter de tu marca.',
  description: 'Abre y cierra en burdeos con titular contundente; en medio, fotos cálidas de resultado. Con carácter, para posicionar y vender.',
  mood: ['Con carácter', 'Sólido', 'Directo'],
  status: 'live',
  accentColor: '#591427',
  referenceImages: ['/carruseles/refs/brave-burdeos/m1.jpg', '/carruseles/refs/brave-burdeos/m2.jpg', '/carruseles/refs/brave-burdeos/m3.jpg'],
  palette: {
    tokens: [
      { name: 'Burdeos', hex: '#591427' },
      { name: 'Crema', hex: '#FFFDF5' },
      { name: 'Buttermilk', hex: '#FFF1B5' },
      { name: 'Ink', hex: '#22201E' },
    ],
    rules: [
      'Bloques de burdeos profundo con texto crema.',
      'Acentos butter para destacar una frase.',
    ],
  },
  typography: {
    serif: 'bold contemporary serif for statements',
    sans: 'heavy sans-serif (extra bold) for hooks',
    italicAccent: 'italic serif to soften one key phrase',
    rules: ['El peso es el mensaje: titulares que se imponen.'],
  },
  copyStyle: {
    hook: 'Declaraciones y contrafrases que posicionan.',
    body: 'Frases cortuísimas, afirmativas.',
    cta: 'CTA de venta directa pero conversacional.',
    rules: ['Afirmar, no sugerir.'],
  },
  photoDirection: {
    types: VISUAL_TYPES,
    rotation: [
      { length: 3, sequence: ['hero_result', 'macro_detail', 'lifestyle'] },
      { length: 4, sequence: ['hero_result', 'salon_env', 'hands_process', 'lifestyle'] },
    ],
  },
  layoutRules: ['Bloques plenos de color, texto protagonista.'],
  graphicElements: ['numeraciones grandes 01. 02. 03.', 'labels butter'],
  negativeRules: ['sin stickers', 'no mezclar más de dos paletas'],
  imagePromptBase:
    'Bold editorial beauty photography with warm burgundy and cream tones in styling, wardrobe and backgrounds, dramatic but flattering contrast. Premium salon branding feel. Strong composition with generous calm areas. Photorealistic hair. No template look, no stickers, no logos.',
}


/* Referencias de Jota (oct-2026), solo como guía de composición; las muestras
   del picker son slides propias de la app con fotos del banco. */
const SILENCIO_AUTOR: StyleConfig = {
  ...EDITORIAL_HAIR_LUXE,
  id: 'silencio-autor',
  name: 'Silencio de Autor',
  tagline: 'Verdades de salón, dichas con calma.',
  description: 'Una frase centrada en mitad de la foto, serif estrecha con una palabra manuscrita, y debajo el texto fino. Fotos tranquilas y de cerca: melena, nuca, producto en la mano. Para educar con autoridad.',
  mood: ['Sereno', 'De autor', 'Educativo'],
  status: 'live',
  accentColor: '#E8DCCB',
  referenceImages: ['/carruseles/refs/silencio-autor/m1.jpg', '/carruseles/refs/silencio-autor/m2.jpg', '/carruseles/refs/silencio-autor/m3.jpg'],
  palette: {
    tokens: [
      { name: 'Arena', hex: '#CDBFAE' },
      { name: 'Piedra', hex: '#8C8279' },
      { name: 'Blanco', hex: '#FFFFFF' },
      { name: 'Tinta', hex: '#2B1A1F' },
    ],
    rules: ['Fotos apagadas, tonos arena, gris y marrón.', 'Texto siempre blanco y centrado.'],
  },
  typography: {
    serif: 'condensed high-contrast serif',
    sans: 'light geometric sans for body',
    italicAccent: 'one script word at the start of the headline',
    rules: ['Titular de 2–3 líneas en el centro; texto fino debajo; frase final en mayúsculas pequeñas.'],
  },
  copyStyle: {
    hook: 'Una verdad que contradice lo que la clienta cree («Un buen corte puede hacer más por tu pelo que diez productos»).',
    body: 'Explica en 2–3 frases cortas, tono sereno de experto.',
    cta: 'Cierre reflexivo, sin vender a gritos.',
    rules: ['Marca con **asteriscos** la primera palabra para la letra manuscrita.'],
  },
  photoDirection: {
    types: VISUAL_TYPES,
    rotation: [
      { length: 3, sequence: ['macro_detail', 'lifestyle', 'product'] },
      { length: 4, sequence: ['macro_detail', 'lifestyle', 'product', 'tools'] },
    ],
  },
  layoutRules: ['Texto en el centro; la foto deja el centro tranquilo.'],
  graphicElements: ['etiqueta pequeña en mayúsculas espaciadas'],
  negativeRules: ['sin colores saturados', 'sin cajas ni stickers'],
  imagePromptBase:
    'Quiet, muted editorial hair photography in sand, stone grey and soft brown tones: close crops of hair texture, the back of a head or nape, a hand holding a serum dropper or scissors cutting a strand, still life of products. Low contrast, soft diffused light, slightly desaturated, film-like calm. The CENTER of the frame must be calm and uncluttered so white text can sit there. Photorealistic. No logos, no text.',
}

const POSTER_PORTADA: StyleConfig = {
  ...EDITORIAL_HAIR_LUXE,
  id: 'poster-portada',
  name: 'Póster Portada',
  tagline: 'Tu salón en portada de revista.',
  description: 'Foto enmarcada sobre papel claro y un titular enorme partido en dos que pisa las esquinas del marco. Perfecto para presentar a tu equipo, una clienta, un servicio estrella o una fecha.',
  mood: ['Revista', 'Actual', 'Con presencia'],
  status: 'live',
  accentColor: '#E8C552',
  referenceImages: ['/carruseles/refs/poster-portada/m1.jpg', '/carruseles/refs/poster-portada/m2.jpg', '/carruseles/refs/poster-portada/m3.jpg'],
  palette: {
    tokens: [
      { name: 'Papel', hex: '#ECEAE6' },
      { name: 'Oro', hex: '#E8C552' },
      { name: 'Tinta', hex: '#1D1416' },
      { name: 'Burdeos', hex: '#591427' },
    ],
    rules: ['Papel gris claro, titular oro o burdeos, texto en tinta.'],
  },
  typography: {
    serif: 'none',
    sans: 'extra bold extended sans in uppercase',
    italicAccent: 'none',
    rules: ['Titular de 1–3 palabras partido en dos bloques.'],
  },
  copyStyle: {
    hook: 'Nombre o palabra potente de 1–3 palabras («Balayage | Natural»).',
    body: 'Dos o tres líneas cortas en mayúsculas.',
    cta: 'Directo: reserva, fecha o lugar.',
    rules: ['Titulares muy cortos: el tamaño es el mensaje.'],
  },
  photoDirection: {
    types: VISUAL_TYPES,
    rotation: [
      { length: 3, sequence: ['hero_result', 'lifestyle', 'hero_result'] },
      { length: 4, sequence: ['hero_result', 'lifestyle', 'macro_detail', 'hero_result'] },
    ],
  },
  layoutRules: ['Foto enmarcada; titular en las esquinas superior izquierda e inferior derecha.'],
  graphicElements: ['marco de papel', 'texto pequeño en mayúsculas abajo a la izquierda'],
  negativeRules: ['sin degradados', 'sin más de dos colores de texto'],
  imagePromptBase:
    'Natural, intimate portrait photography of a woman with beautiful hair against a plain muted grey or olive wall, soft window light, slightly desaturated warm tones, like a casual high-end selfie or magazine portrait. Head and shoulders, subject centered with some space at the top-left and bottom-right corners. Photorealistic. No logos, no text.',
}

/** Registro de estilos en orden de presentación. */
export const STYLE_REGISTRY: StyleConfig[] = [EDITORIAL_HAIR_LUXE, SILENCIO_AUTOR, POSTER_PORTADA, ESTUDIO_LIMPIO, BRAVE_BURDEOS]

export function getStyle(id: string): StyleConfig | undefined {
  return STYLE_REGISTRY.find(s => s.id === id)
}

/** Estilos activos para el picker (los 'soon' van aparte para la UI). */
export function liveStyles(): StyleConfig[] {
  return STYLE_REGISTRY.filter(s => s.status === 'live')
}

export function soonStyles(): StyleConfig[] {
  return STYLE_REGISTRY.filter(s => s.status === 'soon')
}

export { VISUAL_TYPES }