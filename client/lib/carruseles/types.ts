/**
 * CARRUSELES PREMIUM — contrato de tipos.
 *
 * Sistema escalable: la UI nunca hardcodea estilos. Un estilo visual es DATA
 * (ver lib/carruseles/styles.ts): añadir 20, 50 o 100 estilos es añadir objetos
 * al registro + sus imágenes de referencia. La app los consume sin cambios.
 *
 * La app compone cada slide con: STYLE CONFIG + USER TOPIC + APPROVED COPY +
 * SLIDE ROLE + OPTIONAL SIGNATURE (lib/carruseles/prompts.ts).
 */

// ── Tipos visuales de fotografía (rotación anti-repetición) ──────────────────

export type VisualType =
  | 'hero_result'         // melena completa / movimiento
  | 'macro_detail'        // textura, puntas, raíz, brillo
  | 'hands_process'       // manos del profesional trabajando
  | 'tools'               // herramientas profesionales
  | 'product'             // still life de producto
  | 'extensions_material' // mechones / integración / color matching
  | 'lifestyle'           // perfil, hombros, cabello sobre ropa
  | 'salon_env'           // espejo, silla, entorno
  | 'before_after'        // transición

export interface VisualTypeSpec {
  /** Etiqueta corta en español para wireframe/UI ("Macro densidad"). */
  label: string
  /** Verbatim al prompt de imagen para este tipo de encadre. */
  prompt: string
}

// ── Estilo visual (config) ────────────────────────────────────────────────────

export interface StylePaletteToken {
  name: string
  hex: string
}

export interface StyleCopySpec {
  /** Verbatim: instrucción de hooks para el prompt de copy. */
  hook: string
  body: string
  cta: string
  /** Reglas adicionales de la voz del estilo. */
  rules: string[]
}

export interface StyleTypographySpec {
  /** Verbatim para prompt de imagen (p.ej. "high contrast fashion serif"). */
  serif: string
  sans: string
  /** Cómo se usan los acentos en cursiva (frases destacadas). */
  italicAccent: string
  rules: string[]
}

export interface StylePhotoDirection {
  types: Partial<Record<VisualType, VisualTypeSpec>>
  /**
   * Secuencias preferidas de rotación por nº de slides.
   * Se elige la que encaja (4 slides = 4 tipos distintos, sin repetir).
   */
  rotation: { length: number; sequence: VisualType[] }[]
}

export interface StyleConfig {
  id: string
  name: string
  /** Frase corta que vende el estilo en el picker. */
  tagline: string
  description: string
  /** Palabras de sensación visual para el picker. */
  mood: string[]
  /** 'live' muestra el estilo; 'soon' lo muestra deshabilitado ("Próximamente"). */
  status: 'live' | 'soon'
  /** Acento de UI para este estilo (token de globals.css). */
  accentColor: string
  /** Rutas /carruseles/refs/<id>/*.jpg — 2 a 4+ imágenes reales. */
  referenceImages: string[]
  palette: { tokens: StylePaletteToken[]; rules: string[] }
  typography: StyleTypographySpec
  copyStyle: StyleCopySpec
  photoDirection: StylePhotoDirection
  /** Verbatim al prompt de imagen (composición y jerarquía editorial). */
  layoutRules: string[]
  /** Recursos permitidos: flechas editoriales, numeraciones 01., labels. */
  graphicElements: string[]
  /** Qué NO debe hacer nunca el output. */
  negativeRules: string[]
  /** Bloque STYLE SYSTEM que entra verbatim al prompt de imagen de cada slide. */
  imagePromptBase: string
}

// ── Copy aprobado ─────────────────────────────────────────────────────────────

export type SlideRole = 'hook' | 'desarrollo' | 'cierre' | 'cta'

export interface CopySlide {
  n: number
  role: SlideRole
  /** Texto exacto que se renderiza en la imagen. Editable inline. */
  text: string
  /** Encuadre previsto (rotación fotográfica) que la IA Propone. */
  visual: VisualType
  /** Línea de apoyo opcional (sans pequeña) — p.ej. subrayado con datos. */
  support?: string
}

export interface CopyProposal {
  slides: CopySlide[]
  /** CTA propuesto (editable, sustituible por ajustes opcionales). */
  cta: string
  /** Caption para el post de Instagram (opcional en el output). */
  caption?: string
}

// ── Ajustes opcionales (CTA / firma) ─────────────────────────────────────────

export type CtaMode = 'auto' | 'escribenos' | 'reserva' | 'comenta' | 'guarda' | 'comparte' | 'comenta_palabra' | 'sin_cta' | 'manual'

export interface CtaOverride {
  mode: CtaMode
  /** Palabra para "Comenta una palabra". */
  word?: string
  /** Texto exacto para 'manual'. */
  text?: string
}

export interface Signature {
  on: boolean
  /** "@salon", "Salón X" o texto libre. */
  text: string
}

// ── Draft + generación ───────────────────────────────────────────────────────

export type DraftView = 'style' | 'studio' | 'generating' | 'result'

export interface CarouselDraft {
  styleId: string | null
  topic: string
  topicChips: string[]
  slideCount: number | 'auto'
  proposal: CopyProposal | null
  ctaOverride: CtaOverride | null
  signature: Signature
  view: DraftView
}

export type SlideStatus = 'pending' | 'generating' | 'ok' | 'error' | 'unavailable'

export interface SlideResult {
  index: number
  text: string
  support?: string
  visual: VisualType
  status: SlideStatus
  /** URL firmada (24h) de la imagen generada. */
  imageUrl?: string
  /** Path en el bucket para persistir y re-signar. */
  imagePath?: string
  error?: string
  /** Carrusel 2.0: diseño editable (fondo + capas de texto). */
  design?: import('./composer').SlideDesign
}

// ── API /api/carruseles/slide ────────────────────────────────────────────────

export interface SlideRequestPayload {
  styleId: string
  draftId: string
  index: number
  slide: Pick<CopySlide, 'text' | 'support' | 'visual'>
  total: number
  signature: Signature
}