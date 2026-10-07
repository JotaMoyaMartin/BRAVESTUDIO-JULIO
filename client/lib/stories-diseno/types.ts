/**
 * STORIES DISEÑO — tipos base (Fase 1: teaser/en construcción).
 *
 * Modelo mental del producto:
 *   ADMIN/BRÄVE team crea TEMPLATES (plantillas visuales) agrupadas en PACKS
 *   (secuencias con un objetivo: vender, captar, educar…) y los PUBLICA.
 *   La USUARIA elige un pack → elige plantilla → BRÄVE adapta los textos con
 *   IA (contexto de marca del salón) → cambia las fotos → edita los textos
 *   editables → exporta la secuencia story a story.
 *
 * Decisiones de producto (7-oct-2026):
 *   - NO Canva-libre: plantillas estructuradas con roles. La IA genera
 *     contenido, la plantilla controla el estilo (regla #4 del repo).
 *   - SÍ edición simple: solo los `elements` con role editable/ai/replaceable.
 *   - SÍA adaptado: los textos con role 'ai' se reescriben con el contexto
 *     de marca (lib/ai/brand-context.ts) — generador nuevo → SIEMPRE inyectar.
 *   - SÍ secuencias (packs), no slides sueltos.
 *   - NO lógica de export en Fase 1: solo tipos + página teaser.
 *
 * FASE 2 (nota técnica): selector de packs/plantillas (catálogo con portadas),
 * slots de imágenes (upload Supabase Storage o sample del pack), editor simple
 * (arrastre ligero o solo textos con maxLength), export story a story
 * (render→PNG 9:16, descarga secuencial), panel admin de plantillas/packs
 * (tablas `story_design_packs` + `story_design_templates` en Supabase, CRUD
 * admin/ + publicación). Las tablas partirán de estos tipos.
 */

export type StoryElementType = 'text' | 'image' | 'shape' | 'badge' | 'icon' | 'background' | 'sticker'

/**
 * Rol del elemento dentro de la plantilla:
 *  - fixed: parte del diseño, la usuaria no lo toca.
 *  - editable: la usuaria puede cambiar el texto.
 *  - ai: el texto lo adapta BRÄVE con IA (contexto de marca).
 *  - replaceable: imagen con slot para foto de ejemplo o propia.
 */
export type StoryElementRole = 'fixed' | 'editable' | 'ai' | 'replaceable'

export type StoryAssetType = 'sample_photo' | 'user_photo' | 'solid' | 'gradient'

export interface StoryDesignElement {
  id: string
  type: StoryElementType
  role: StoryElementRole
  /** Posición y tamaño en px sobre el lienzo 9:16 (1080×1920). */
  position: { x: number; y: number }
  size: { w: number; h: number }
  /** Estilos inline (color, fontSize, fontWeight, background…). */
  style: Record<string, string | number>
  /** Contenido inicial (texto o src de la muestra). */
  content?: string
  /** Límite de caracteres para textos editables (evita romper el diseño). */
  maxLength?: number
  /** Para images replaceable: qué puede poner la usuaria en el slot. */
  allowedAssetTypes?: StoryAssetType[]
}

export type StorySlideLayoutType =
  | 'full-photo'
  | 'split'
  | 'text-only'
  | 'quote'
  | 'list'
  | 'poll'
  | 'question-box'

export interface StoryDesignSlide {
  id: string
  templateId: string
  order: number
  /** Fondo: color, gradiente o src de imagen de ejemplo. */
  background: string
  layoutType: StorySlideLayoutType
  elements: StoryDesignElement[]
}

export type StoryTemplateStatus = 'draft' | 'published'

export interface StoryDesignTemplate {
  id: string
  title: string
  slug: string
  /** Categoría editorial de la plantilla (usar los mismos términos que TIPOS DE STORIES). */
  category: string
  description: string
  /** Portada opcional; si no hay, la app renderiza el slide 1 como miniatura. */
  coverImage: string | null
  isLocked: boolean
  status: StoryTemplateStatus
  slides: StoryDesignSlide[]
  tags: string[]
  /** Cómo la recomienda BRÄVE (dirección, no catálogo): p.ej. "para llenar huecos de agenda". */
  recommendedUse: string
  /** Estilo por defecto del pack al que pertenece (tono, tipografía, layout base). */
  defaultStyle: Record<string, string | number>
}

export type StoryPackFlowType =
  | 'single-goal'
  | 'sequence-launch'
  | 'nurture'
  | 'capture'

/** Objetivo editorial del pack (alineado a los pilares del repo). */
export type StoryPackGoal = 'vender' | 'captar' | 'educar' | 'fidelizar' | 'autoridad'

export interface StoryDesignPack {
  id: string
  title: string
  goal: StoryPackGoal
  description: string
  storyCount: number
  templates: StoryDesignTemplate[]
  /** Cómo se usa la secuencia: lanzamiento, seguimiento, día a día… */
  flowType: StoryPackFlowType
}