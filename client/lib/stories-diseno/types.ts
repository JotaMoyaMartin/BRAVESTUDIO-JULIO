/**
 * STORIES DISEÑO — tipos v2 (mini-Canva de Stories para salones).
 *
 * Modelo mental del producto:
 *   - ADMIN/BRÄVE (diseñador): builder visual → construye TEMPLATES como
 *     composiciones de CAPAS (fondo, foto, overlay, titular, chips, CTA,
 *     firma) con roles y constraints → publica.
 *   - USUARIA (estilista): GALERÍA visual → elige plantilla ("ya está
 *     diseñado por un profesional") → la adapta: textos con IA (contexto de
 *     marca), fotos propias, colores permitidos → exporta la secuencia.
 *   - La usuaria NO puede destruir el diseño: solo objetos con role
 *     editable/ai/replaceable/brand y solo dentro de los constraints.
 *
 * Decisiones de producto (8-oct-2026, rework):
 *   - El schema guarda COMPOSICIONES (capas con tipos + roles), nunca JPG.
 *   - Rendering DOM por capas en `SlideCanvas` — mismo renderer para
 *     galería, editor usuaria, builder admin y export (html-to-image).
 *   - Una template = una SECUENCIA de stories (page/slide con purpose para
 *     la IA de secuencia: gancho → explicación → solución → CTA).
 *   - `constraints` (maxLength/maxLines) mandan: la IA no puede devolver
 *     contenido que los rompa (clamping client-side siempre).
 *   - Todo evoluciona en `story_design_templates.slides` (jsonb) → los
 *     campos nuevos son opcionales y NO requieren migración.
 *   - IA SIEMPRE con contexto de marca (lib/ai/brand-context.ts) via los
 *     clientes canónicos (generateAIContent + extractJSON; no 4º cliente).
 */

export type StoryElementType =
  | 'text'      // texto suelto (titulares, párrafos)
  | 'image'     // slot de foto con máscara (full-bleed o marco)
  | 'shape'     // rect/gradiente/overlay/placa (backgrounds del propio elemento)
  | 'line'      // línea decorativa (shape fino con semántica propia)
  | 'badge'     // píldora con padding (categorías, CTA chico, opciones)
  | 'icon'      // icono del whitelist BRÄVE (lib/stories-diseno/icons.ts)
  | 'background'// fondo del slide (normalmente implícito: slide.background)
  | 'sticker'   // decoración fija (emoji/glyph grande)
  | 'group'     // agrupación lógica: mueve/rota a sus hijos (parentId)

/**
 * Rol de la capa — define qué puede hacer la usuaria y qué hace la IA:
 *  - fixed: parte del diseño (BRÄVE la pone); usuaria NO la toca.
 *  - editable: la usuaria cambia el texto.
 *  - ai: texto que BRÄVE rellena/adapta con IA (contexto de marca).
 *  - replaceable: imagen con slot (muestra del template o foto de la usuaria).
 *  - brand: se rellena desde Mi Marca (tokens {{salon_name}}, {{ig}}…).
 *  - decorative: visual fijo puro (overlays, líneas, marcos) — no interactivo.
 */
export type StoryElementRole = 'fixed' | 'editable' | 'ai' | 'replaceable' | 'brand' | 'decorative'

export type StoryAssetType = 'sample_photo' | 'user_photo' | 'solid' | 'gradient'

/** Propósito editorial para la IA (por elemento y por slide). */
export type StoryAiPurpose = 'hook' | 'explain' | 'solution' | 'cta' | 'poll' | 'promo' | 'education'

/** Límites que mandan sobre el diseño (IA y manuales). */
export interface StoryElementConstraints {
  /** Máximo de caracteres (el editor clampa SIEMPRE). */
  maxLength?: number
  /** Opcional: mínimo razonable (la IA intenta superar; no clampa). */
  minLength?: number
  /** Máximo de líneas — la IA lo respeta y el editor advierte. */
  maxLines?: number
}

/** Config de IA del elemento (la usa la adaptación por bloque). */
export interface StoryElementAiConfig {
  purpose?: StoryAiPurpose
  /** Índices en frío: qué debe decir (ej. "menciona el servicio protagonista"). */
  hints?: string[]
}

/** Encuadre de foto dentro de su máscara (estado por sesión de usuaria). */
export interface StoryPhotoFrame {
  /** 1 = encaja justo en la máscara (cover). >1 = zoom digital. */
  zoom: number
  /** Offset en % del tamaño de la máscara (negativo = hacia la izquierda/arriba). */
  dx: number
  dy: number
}

/**
 * Permisos de la USUARIA FINAL sobre el elemento — SEPARADO del lock del
 * editor admin (`adminLocked`). El diseñador los marca elemento a elemento
 * ("Permisos en plantilla"); los defaults se derivan del rol.
 */
export interface StoryUserPermissions {
  /** Puede cambiar el contenido (texto/emoji). */
  edit?: boolean
  /** Puede mover el elemento. */
  move?: boolean
  /** Puede redimensionar. */
  resize?: boolean
  /** Puede eliminar la capa. */
  del?: boolean
  /** Puede cambiar el color. */
  colorEdit?: boolean
  /** Solo imágenes: puede sustituir la foto. */
  replace?: boolean
  /** Solo imágenes: puede reencuadrar (pan dentro de la máscara). */
  recrop?: boolean
  /** Solo imágenes: puede aplicar zoom al encuadre. */
  zoom?: boolean
  /** Puede regenerar el contenido con IA. */
  aiEdit?: boolean
}

/** defaults de StoryUserPermissions por rol (función pura, usada por admin/usuaria/IA). */
export function defaultUserPermissions(role: StoryElementRole, type: StoryElementType): StoryUserPermissions {
  if (role === 'fixed' || role === 'decorative') return {}
  if (role === 'brand' || role === 'ai' || role === 'editable') {
    return { edit: type !== 'image', colorEdit: type === 'text' || type === 'badge' || type === 'shape' || type === 'line', aiEdit: role === 'ai' || role === 'brand' }
  }
  // replaceable
  return { replace: type === 'image', recrop: true, zoom: true }
}

/**
 * ¿Puede la usuaria hacer X con este elemento? Defaults del rol + overrides de
 * "Permisos en plantilla" (userPermissions pisa el default clave a clave).
 * Único gate del editor de usuaria — el admin SIEMPRE puede todo.
 */
export function hasUserPerm(el: StoryDesignElement, key: keyof StoryUserPermissions): boolean {
  const merged: StoryUserPermissions = { ...defaultUserPermissions(el.role, el.type), ...(el.userPermissions ?? {}) }
  return Boolean(merged[key])
}

/**
 * Máscara del slot de foto (el clipeo del renderer): rect = cuadro,
 * rounded = cuadro con radius del estilo, circle = círculo. Formas
 * especiales (polaroid, arco…) se componen a mano con grupos + marcos.
 */
export type StoryImageMask = 'rect' | 'rounded' | 'circle'

export interface StoryDesignElement {
  id: string
  type: StoryElementType
  role: StoryElementRole
  /** Nombre humano de la capa (panel de capas del builder). */
  name?: string
  /** Id del grupo padre (type 'group' compone; los hijos viven en la lista plana). */
  parentId?: string
  /** Posición y tamaño en px sobre el lienzo 9:16 (1080×1920). */
  position: { x: number; y: number }
  size: { w: number; h: number }
  /** Rotación en grados (sentido horario, origen centro). */
  rotation?: number
  /**
   * Orden de render explícito (mayor = encima). Si se omite en TODOS los
   * elementos del slide, el renderer usa el orden legacy (backgrounds al
   * fondo, luego por y) — compatibilidad con plantillas seed antiguas.
   */
  zIndex?: number
  /** Estilos inline (color, fontSize, fontWeight, background, gradient…). */
  style: Record<string, string | number>
  /** Contenido inicial: texto, src de imagen muestra o token {{marca}}. */
  content?: string
  /** Texto/hint cuando el slot está vacío (ej. "Toca para subir foto"). */
  placeholder?: string
  /** Límite de caracteres (alias legacy de constraints.maxLength). */
  maxLength?: number
  /** Constraints que manda el diseño (maxLength/maxLines). */
  constraints?: StoryElementConstraints
  /** Config de IA del elemento. */
  aiConfig?: StoryElementAiConfig
  /** Para images replaceable: qué puede poner la usuaria en el slot. */
  allowedAssetTypes?: StoryAssetType[]
  /** Encuadre por defecto de la foto (el editor usuaria lo sobreescribe en sesión). */
  frame?: StoryPhotoFrame
  /** Máscara del slot de foto (imágenes). Por defecto 'rect' (compat). */
  mask?: StoryImageMask
  /** Lock del EDITOR ADMIN (evita mover accidentalmente; desbloqueable). Alias legacy: locked. */
  adminLocked?: boolean
  /** Alias legacy de adminLocked (plantillas seed) — solo lectura para compat. */
  locked?: boolean
  /** Qué puede hacer la usuaria final (defaults según rol; nunca usar 'locked' para esto). */
  userPermissions?: StoryUserPermissions
  /** Visible (admin puede apagar capas sin borrarlas). */
  visible?: boolean
}

/** adminLocked del elemento (alias legacy `locked` → adminLocked). */
export function elementAdminLocked(e: StoryDesignElement): boolean {
  return e.adminLocked ?? e.locked ?? false
}

export type StorySlideLayoutType =
  | 'full-photo'
  | 'split'
  | 'text-only'
  | 'quote'
  | 'list'
  | 'poll'
  | 'question-box'

/** Purpose de la página dentro de la secuencia (IA de secuencia). */
export type StorySlidePurpose = StoryAiPurpose | 'opening'

export interface StoryDesignSlide {
  id: string
  templateId: string
  order: number
  /** Fondo: color, gradiente o src de imagen de ejemplo. */
  background: string
  layoutType: StorySlideLayoutType
  elements: StoryDesignElement[]
  /** Nombre humano de la página ("Portada", "Explicación"…). */
  name?: string
  /** Rol de la página en la secuencia — lo usa la IA de secuencia. */
  purpose?: StorySlidePurpose
}

export type StoryTemplateStatus = 'draft' | 'published' | 'archived'

export interface StoryDesignTemplate {
  id: string
  title: string
  slug: string
  /** Categoría editorial (chips de la galería: vender, agenda, tratamientos…). */
  category: string
  description: string
  /** Portada opcional; si no hay, la app renderiza el slide 1 como miniatura. */
  coverImage: string | null
  isLocked: boolean
  status: StoryTemplateStatus
  /** Versión del schema/diseño (sube al editar en el builder). */
  version?: number
  slides: StoryDesignSlide[]
  tags: string[]
  /** Cómo la recomienda BRÄVE (dirección, no catálogo). */
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

/* ── Tokens de marca insertables (role 'brand') ── */

export interface StoryBrandTokens {
  /** {{salon_name}} */
  salon_name?: string
  /** {{ig}} — usuario de Instagram sin @ */
  ig?: string
  /** {{service}} — servicio a promocionar */
  service?: string
}

/** Sustituye tokens de marca en un texto (puro). Tokens sin dato → cadena vacía. */
export function applyBrandTokens(text: string, tokens?: StoryBrandTokens | null): string {
  if (!tokens) return text
  const map: Record<string, string | undefined> = {
    salon_name: tokens.salon_name,
    ig: tokens.ig,
    service: tokens.service,
  }
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, key: string) => {
    const v = map[key]
    return v !== undefined && v !== '' ? (key === 'ig' ? `@${v.replace(/^@/, '')}` : v) : ''
  })
}

/** maxLength efectivo del elemento (constraints > maxLength legacy > 400). */
export function elementMaxLength(e: StoryDesignElement): number {
  return e.constraints?.maxLength ?? e.maxLength ?? 400
}