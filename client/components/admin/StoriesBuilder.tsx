'use client'

/**
 * STORIES BUILDER — mini-Canva admin de Stories Diseño (1080×1920, v2 capas).
 *
 * Tres paneles con el mismo contrato que /stories-diseno:
 *   · Izquierda: PÁGINAS (miniaturas SlideCanvas reales + reorden dnd-kit) y
 *     CAPAS en orden de render; el drag reasigna zIndex 0..n-1; ojo/lock/borrar.
 *   · Centro: lienzo SlideCanvas (no interactivo) + plano de transformación del
 *     elemento seleccionado (move/resize/rotate vía lib/stories-diseno/transform).
 *   · Derecha: propiedades de la PÁGINA y del ELEMENTO (rol, constraints,
 *     aiConfig, estilos numéricos y de color).
 *
 * Persistencia: SOLO PATCH /api/stories-diseno/admin/templates/:id con
 * { slides: [{ order, background, layoutType, name?, purpose?, elements[] }] }.
 * Los slides de la DB (jsonb) se parsean con defaults robustos y el maxLength
 * legacy se migra a constraints.maxLength (nunca se escriben duplicados).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import Moveable from 'react-moveable'
import type { OnDrag, OnDragEnd, OnResize, OnResizeEnd, OnRotate, OnRotateEnd } from 'react-moveable'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  ArrowLeft,
  Save,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Type,
  Tag,
  ImagePlus,
  PictureInPicture2,
  Square,
  SquareStack,
  Minus,
  Sparkles,
  Sticker as StickerIcon,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Ruler,
  AlignCenterHorizontal,
  AlignCenterVertical,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  Send,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import SlideCanvas, { CANVAS_W, CANVAS_H, isEditableElement } from '@/app/(app)/stories-diseno/SlideCanvas'
import { STORY_ICONS } from '@/lib/stories-diseno/icons'
import { STORY_FONTS } from '@/lib/stories-diseno/fonts'
import {
  screenToCanvas,
  applyMove,
} from '@/lib/stories-diseno/transform'
import {
  defaultUserPermissions,
  elementAdminLocked,
  hasUserPerm,
} from '@/lib/stories-diseno/types'
import type {
  StoryAiPurpose,
  StoryAssetType,
  StoryDesignElement,
  StoryDesignSlide,
  StoryElementConstraints,
  StoryElementRole,
  StoryElementType,
  StoryImageMask,
  StoryUserPermissions,
  StorySlideLayoutType,
  StorySlidePurpose,
} from '@/lib/stories-diseno/types'

/* ── Constantes ──────────────────────────────────────────────────────────── */

/** Fondo por defecto = cream de la app (valor como DATO del slide: se exporta a PNG fuera de la app). */
const DEFAULT_BG = '#FFFDF5'

const ALL_TYPES: readonly StoryElementType[] = ['text', 'image', 'shape', 'line', 'badge', 'icon', 'background', 'sticker', 'group']
const ALL_ROLES: readonly StoryElementRole[] = ['fixed', 'editable', 'ai', 'replaceable', 'brand', 'decorative']
const AI_PURPOSE_VALUES: readonly StoryAiPurpose[] = ['hook', 'explain', 'solution', 'cta', 'poll', 'promo', 'education']
const LAYOUT_VALUES: readonly StorySlideLayoutType[] = ['full-photo', 'split', 'text-only', 'quote', 'list', 'poll', 'question-box']
const PAGE_PURPOSE_VALUES: readonly StorySlidePurpose[] = ['opening', ...AI_PURPOSE_VALUES]

const ROLES_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: 'fixed', label: 'fixed — diseño BRÄVE', desc: 'Parte del diseño; la usuaria no la toca.' },
  { value: 'editable', label: 'editable — usuaria', desc: 'La usuaria cambia el contenido.' },
  { value: 'ai', label: 'ai — rellena la IA', desc: 'La IA la rellena con contexto de marca.' },
  { value: 'replaceable', label: 'replaceable — hueco de foto', desc: 'Muestra de la plantilla o foto de la usuaria.' },
  { value: 'brand', label: 'brand — Mi Marca', desc: 'Se rellena desde Mi Marca ({{salon_name}}, {{ig}}…).' },
  { value: 'decorative', label: 'decorative — visual fijo', desc: 'Visual puro (overlays, líneas, marcos); no interactivo.' },
]

const LAYOUT_OPTIONS: { value: string; label: string }[] = [
  { value: 'full-photo', label: 'Foto a sangre' },
  { value: 'split', label: 'Dividida' },
  { value: 'text-only', label: 'Solo texto' },
  { value: 'quote', label: 'Cita' },
  { value: 'list', label: 'Lista' },
  { value: 'poll', label: 'Encuesta' },
  { value: 'question-box', label: 'Caja de preguntas' },
]

const AI_PURPOSE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Ninguno' },
  { value: 'hook', label: 'Gancho' },
  { value: 'explain', label: 'Explicación' },
  { value: 'solution', label: 'Solución' },
  { value: 'cta', label: 'CTA' },
  { value: 'poll', label: 'Encuesta' },
  { value: 'promo', label: 'Promoción' },
  { value: 'education', label: 'Educación' },
]

const PAGE_PURPOSE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Ninguno' },
  { value: 'opening', label: 'Apertura' },
  { value: 'hook', label: 'Gancho' },
  { value: 'explain', label: 'Explicación' },
  { value: 'solution', label: 'Solución' },
  { value: 'cta', label: 'CTA' },
  { value: 'poll', label: 'Encuesta' },
  { value: 'promo', label: 'Promoción' },
  { value: 'education', label: 'Educación' },
]

const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '—' },
  ...Object.keys(STORY_ICONS).map(k => ({ value: k, label: k.replace(/_/g, ' ') })),
]

const TYPE_LABEL: Record<StoryElementType, string> = {
  text: 'Texto',
  image: 'Foto',
  shape: 'Forma',
  line: 'Línea',
  badge: 'Badge',
  icon: 'Icono',
  background: 'Fondo',
  sticker: 'Sticker',
  group: 'Grupo',
}

type ElementKind = Exclude<StoryElementType, 'background'>
/** Kinds que puede añadir el panel: kinds reales + compuestos (presets de foto/fondo). */
type AddKind = ElementKind | 'photo-full' | 'photo-hero' | 'bg-solid'
/** Grupo "Foto": huecos de imagen listos (a sangre 1080×1920, hero banner, cuadro). */
const PHOTO_PRESETS: { kind: AddKind; label: string; icon: ReactNode }[] = [
  { kind: 'photo-full', label: 'Foto a sangre', icon: <ImagePlus size={13} /> },
  { kind: 'photo-hero', label: 'Hero', icon: <PictureInPicture2 size={13} /> },
  { kind: 'image', label: 'Cuadro', icon: <Square size={13} /> },
]
const ADD_PRESETS: { kind: AddKind; label: string; icon: ReactNode }[] = [
  { kind: 'text', label: 'Texto', icon: <Type size={13} /> },
  { kind: 'badge', label: 'Badge', icon: <Tag size={13} /> },
  { kind: 'bg-solid', label: 'Fondo', icon: <SquareStack size={13} /> },
  { kind: 'shape', label: 'Forma', icon: <Square size={13} /> },
  { kind: 'line', label: 'Línea', icon: <Minus size={13} /> },
  { kind: 'icon', label: 'Icono', icon: <Sparkles size={13} /> },
  { kind: 'sticker', label: 'Sticker', icon: <StickerIcon size={13} /> },
]
/** Stickers rápidos a 1 clic para el contenido de un elemento sticker. */
const STICKER_CHIPS = ['✨', '✦', '⭐', '💅', '✂️', '🪮', '💗', '🔥', '💧', '🧴'] as const

const PAGE_THUMB_SCALE = 46 / CANVAS_W
const MIN_SIZE = 24

const FIELD = 'w-full min-w-0 px-2.5 py-1.5 text-xs bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'
const LABEL = 'block text-[10px] font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-0.5'
const PANEL_TITLE = 'text-[10px] font-semibold uppercase tracking-widest text-cherry-dark opacity-60'

/* ── Utilidades puras ────────────────────────────────────────────────────── */

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function numOr(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return fallback
}

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

let uidSeq = 0
function uid(prefix: string): string {
  uidSeq += 1
  return `${prefix}-${Date.now().toString(36)}-${uidSeq.toString(36)}`
}

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const out = list.slice()
  const [item] = out.splice(from, 1)
  if (item !== undefined) out.splice(Math.max(0, Math.min(to, out.length)), 0, item)
  return out
}

/** Orden de render de las capas (igual que SlideCanvas: zIndex si hay, legacy si no). */
function renderOrder(els: StoryDesignElement[]): StoryDesignElement[] {
  const hasZ = els.some(e => e.zIndex != null)
  return [...els].sort((a, b) => {
    if (hasZ) return (a.zIndex ?? 50) - (b.zIndex ?? 50)
    const wA = a.type === 'background' ? 0 : 1
    const wB = b.type === 'background' ? 0 : 1
    if (wA !== wB) return wA - wB
    return a.position.y - b.position.y
  })
}

/** Lista de capas en orden de render inverso (la de más encima primero). */
function layerList(slide: StoryDesignSlide): StoryDesignElement[] {
  return renderOrder(slide.elements).reverse()
}

/** Da zIndex a todos según su orden de render actual (preserva el aspecto visual). */
function ensureZIndexes(els: StoryDesignElement[]): StoryDesignElement[] {
  if (els.every(e => e.zIndex != null)) return els
  return renderOrder(els).map((e, i) => ({ ...e, zIndex: i }))
}

function reindex(list: StoryDesignSlide[]): StoryDesignSlide[] {
  return list.map((s, i) => ({ ...s, order: i + 1 }))
}

/** Bbox que envuelve a los hijos de un grupo (la caja del grupo en el lienzo). */
function groupBbox(els: StoryDesignElement[]): { x: number; y: number; w: number; h: number } | null {
  if (els.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const e of els) {
    minX = Math.min(minX, e.position.x)
    minY = Math.min(minY, e.position.y)
    maxX = Math.max(maxX, e.position.x + e.size.w)
    maxY = Math.max(maxY, e.position.y + e.size.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** Valor numérico de un estilo que puede llegar como string CSS ('-2px', '1.3'). */
function numFromStyle(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

/** fontFamily del estilo SOLO si coincide con una tipografía del catálogo ('' = por defecto de la app). */
function fontCssOf(el: StoryDesignElement): string {
  const ff = el.style.fontFamily
  return typeof ff === 'string' && STORY_FONTS.some(f => f.css === ff) ? ff : ''
}

/* ── Parseo robusto de los slides de la DB ───────────────────────────────── */

const MASK_VALUES = ['rect', 'rounded', 'circle'] as const

/** Parse de userPermissions: solo claves conocidas y booleanos. */
function parseUserPermissions(o: unknown): StoryUserPermissions | undefined {
  if (!isObj(o)) return undefined
  const out: StoryUserPermissions = {}
  const keys = ['edit', 'move', 'resize', 'del', 'colorEdit', 'replace', 'recrop', 'zoom', 'aiEdit'] as const
  for (const k of keys) {
    if (o[k] === true) out[k] = true
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function parseElementLoose(e: unknown, index: number): StoryDesignElement {
  const o = isObj(e) ? e : {}
  const style: Record<string, string | number> = {}
  if (isObj(o.style)) {
    for (const [k, v] of Object.entries(o.style)) {
      if (typeof v === 'string' || typeof v === 'number') style[k] = v
    }
  }
  let constraints: StoryElementConstraints | undefined
  if (isObj(o.constraints)) {
    const c: StoryElementConstraints = {}
    if (typeof o.constraints.maxLength === 'number') c.maxLength = o.constraints.maxLength
    if (typeof o.constraints.minLength === 'number') c.minLength = o.constraints.minLength
    if (typeof o.constraints.maxLines === 'number') c.maxLines = o.constraints.maxLines
    if (Object.keys(c).length > 0) constraints = c
  }
  // maxLength legacy → constraints.maxLength (nunca se escriben duplicados)
  const legacyMaxLength = typeof o.maxLength === 'number' ? o.maxLength : undefined
  if (constraints?.maxLength === undefined && legacyMaxLength !== undefined) {
    constraints = { ...constraints, maxLength: legacyMaxLength }
  }
  let aiConfig: StoryDesignElement['aiConfig']
  if (isObj(o.aiConfig)) {
    const purpose = pickEnum(o.aiConfig.purpose, AI_PURPOSE_VALUES, '' as StoryAiPurpose) || undefined
    const hints = Array.isArray(o.aiConfig.hints)
      ? o.aiConfig.hints.filter((h): h is string => typeof h === 'string')
      : undefined
    if (purpose || (hints && hints.length > 0)) {
      aiConfig = { ...(purpose ? { purpose } : {}), ...(hints && hints.length ? { hints } : {}) }
    }
  }
  let frame: StoryDesignElement['frame']
  if (isObj(o.frame)) frame = { zoom: numOr(o.frame.zoom, 1), dx: numOr(o.frame.dx, 0), dy: numOr(o.frame.dy, 0) }
  let allowedAssetTypes: StoryAssetType[] | undefined
  if (Array.isArray(o.allowedAssetTypes)) {
    const types = o.allowedAssetTypes.filter(
      (a): a is StoryAssetType =>
        typeof a === 'string' && (['sample_photo', 'user_photo', 'solid', 'gradient'] as readonly string[]).includes(a)
    )
    if (types.length > 0) allowedAssetTypes = types
  }
  return {
    id: typeof o.id === 'string' && o.id ? o.id : `el-legacy-${index}-${Math.random().toString(36).slice(2, 6)}`,
    type: pickEnum(o.type, ALL_TYPES, 'text'),
    role: pickEnum(o.role, ALL_ROLES, 'editable'),
    name: typeof o.name === 'string' && o.name ? o.name : undefined,
    position: {
      x: numOr(isObj(o.position) ? o.position.x : undefined, 0),
      y: numOr(isObj(o.position) ? o.position.y : undefined, 0),
    },
    size: {
      w: numOr(isObj(o.size) ? o.size.w : undefined, 100),
      h: numOr(isObj(o.size) ? o.size.h : undefined, 100),
    },
    rotation: typeof o.rotation === 'number' && Number.isFinite(o.rotation) ? o.rotation : undefined,
    zIndex: typeof o.zIndex === 'number' && Number.isFinite(o.zIndex) ? o.zIndex : undefined,
    style,
    content: o.content === undefined ? undefined : String(o.content),
    placeholder: typeof o.placeholder === 'string' ? o.placeholder : undefined,
    constraints,
    aiConfig,
    allowedAssetTypes,
    frame,
    mask: pickEnum(o.mask, MASK_VALUES, '' as StoryImageMask) || undefined,
    parentId: typeof o.parentId === 'string' && o.parentId ? o.parentId : undefined,
    adminLocked: o.adminLocked === true || o.locked === true,
    userPermissions: parseUserPermissions(o.userPermissions),
    visible: o.visible === false ? false : undefined,
  }
}

export function parseSlidesLoose(source: unknown, templateId: string): StoryDesignSlide[] {
  const arr = Array.isArray(source) ? source : []
  const slides: StoryDesignSlide[] = arr.map((raw, i) => {
    const o = isObj(raw) ? raw : {}
    const elSource = Array.isArray(o.elements) ? o.elements : []
    return {
      id: typeof o.id === 'string' && o.id ? o.id : `pg-${i + 1}-${Math.random().toString(36).slice(2, 6)}`,
      templateId,
      order: numOr(o.order, i + 1),
      background: typeof o.background === 'string' && o.background ? o.background : DEFAULT_BG,
      layoutType: pickEnum(o.layoutType, LAYOUT_VALUES, 'text-only'),
      name: typeof o.name === 'string' && o.name ? o.name : undefined,
      purpose: pickEnum(o.purpose, PAGE_PURPOSE_VALUES, '' as StorySlidePurpose) || undefined,
      elements: elSource.map((el, j) => parseElementLoose(el, j)),
    }
  })
  return slides.sort((a, b) => a.order - b.order)
}

/** Primer slide parseado (para las miniaturas del tab). */
export function firstSlideOf(source: unknown, templateId: string): StoryDesignSlide | null {
  return parseSlidesLoose(source, templateId)[0] ?? null
}

/* ── Serialización EXACTA del PATCH ──────────────────────────────────────── */

function serializeElement(e: StoryDesignElement): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: e.id,
    type: e.type,
    role: e.role,
    position: e.position,
    size: e.size,
    style: e.style,
  }
  if (e.name) out.name = e.name
  if (e.rotation != null) out.rotation = e.rotation
  if (e.zIndex != null) out.zIndex = e.zIndex
  if (e.content !== undefined) out.content = e.content
  if (e.placeholder) out.placeholder = e.placeholder
  if (e.constraints && Object.keys(e.constraints).length > 0) out.constraints = e.constraints
  if (e.aiConfig && (e.aiConfig.purpose || (e.aiConfig.hints && e.aiConfig.hints.length > 0))) out.aiConfig = e.aiConfig
  if (e.allowedAssetTypes) out.allowedAssetTypes = e.allowedAssetTypes
  if (e.mask) out.mask = e.mask
  if (e.parentId) out.parentId = e.parentId
  if (e.adminLocked) out.adminLocked = true
  if (e.userPermissions && Object.keys(e.userPermissions).length > 0) out.userPermissions = e.userPermissions
  if (e.frame) out.frame = e.frame
  if (e.adminLocked) out.adminLocked = true
  if (e.visible !== undefined) out.visible = e.visible
  return out
}

function serializeSlides(list: StoryDesignSlide[]): Record<string, unknown>[] {
  return list.map((s, i) => {
    const out: Record<string, unknown> = {
      order: i + 1,
      background: s.background,
      layoutType: s.layoutType,
      elements: s.elements.map(serializeElement),
    }
    if (s.name) out.name = s.name
    if (s.purpose) out.purpose = s.purpose
    return out
  })
}

/* ── Presets de "Añadir" (kinds reales y compuestos) ─────────────────────── */

function preset(kind: AddKind, id: string): StoryDesignElement {
  switch (kind) {
    case 'text':
      return {
        id, type: 'text', role: 'ai',
        position: { x: 90, y: 540 }, size: { w: 900, h: 220 },
        style: { color: '#2A0B12', fontSize: 64, fontWeight: 700, lineHeight: 1.15, textAlign: 'center' },
        content: '', placeholder: 'Escribe aquí…',
        constraints: { maxLength: 220 },
      }
    case 'badge':
      return {
        id, type: 'badge', role: 'editable',
        position: { x: 280, y: 840 }, size: { w: 520, h: 92 },
        style: {
          background: 'rgba(255,241,181,0.92)', color: '#591427', fontSize: 34,
          fontWeight: 800, paddingLeft: 40, paddingTop: 20, borderRadius: 24, textAlign: 'center',
        },
        content: '', placeholder: 'Texto del badge…',
        constraints: { maxLength: 40 },
      }
    case 'image':
      return {
        id, type: 'image', role: 'replaceable',
        position: { x: 120, y: 640 }, size: { w: 840, h: 640 },
        mask: 'rounded',
        style: { borderRadius: 28, background: 'rgba(42,11,18,0.08)' },
        content: '', placeholder: 'Hueco de foto',
      }
    case 'shape':
      return {
        id, type: 'shape', role: 'decorative',
        position: { x: 390, y: 810 }, size: { w: 300, h: 300 },
        style: { background: 'rgba(122,24,50,0.10)' },
      }
    case 'group':
      return {
        id, type: 'group', role: 'fixed',
        position: { x: 240, y: 640 }, size: { w: 600, h: 760 },
        style: {},
      }
    case 'line':
      return {
        id, type: 'line', role: 'fixed',
        position: { x: 430, y: 860 }, size: { w: 220, h: 6 },
        style: { background: '#7A1832', borderRadius: 3 },
      }
    case 'sticker':
      return {
        id, type: 'sticker', role: 'fixed',
        position: { x: 430, y: 740 }, size: { w: 220, h: 220 },
        style: { fontSize: 140 }, content: '✨',
      }
    case 'icon':
      return {
        id, type: 'icon', role: 'fixed',
        position: { x: 460, y: 770 }, size: { w: 160, h: 160 },
        style: { fontSize: 96, color: '#7A1832' }, content: 'destello',
      }
    case 'photo-full':
      return {
        id, type: 'image', role: 'replaceable',
        position: { x: 0, y: 0 }, size: { w: 1080, h: 1920 },
        style: { background: 'rgba(42,11,18,0.08)' },
        placeholder: 'Toca para subir foto',
        allowedAssetTypes: ['user_photo'],
      }
    case 'photo-hero':
      return {
        id, type: 'image', role: 'replaceable',
        position: { x: 0, y: 420 }, size: { w: 1080, h: 620 },
        style: { borderRadius: 36, background: 'rgba(42,11,18,0.08)' },
        placeholder: 'Hueco de foto (hero)',
        allowedAssetTypes: ['user_photo'],
      }
    case 'bg-solid':
      return {
        id, type: 'shape', role: 'decorative',
        position: { x: 0, y: 0 }, size: { w: 1080, h: 1920 },
        style: { background: '#FFF3CF' },
      }
  }
}

/* ── API helper (mismo patrón que el tab) ────────────────────────────────── */

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = isObj(data) && typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

/* ── Campos reutilizables del panel de propiedades ───────────────────────── */

/** Botón chico de herramienta para la fila de transformación del panel. */
function ToolBtn({ title, onClick, disabled, children, active }: { title: string; onClick: () => void; disabled?: boolean; children: ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={('p-1.5 rounded-[var(--radius-sm)] border border-soft transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center ') + (active ? 'bg-[var(--color-buttermilk)] text-cherry' : 'bg-warm-gray text-cherry-dark hover:bg-buttermilk')}
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )
}

function NumInput({
  value, onChange, step, min, max, placeholder,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  step?: number
  min?: number
  max?: number
  placeholder?: string
}) {
  const [raw, setRaw] = useState<string | null>(null)
  const external = value === undefined ? '' : String(value)
  // Al cambiar el valor externo (drag en el lienzo), descartamos el texto local.
  useEffect(() => { setRaw(null) }, [external])
  return (
    <input
      type="number"
      value={raw !== null ? raw : external}
      onChange={e => {
        const txt = e.target.value
        setRaw(txt)
        if (txt === '') { onChange(undefined); return }
        const n = Number(txt)
        if (Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max)) onChange(n)
      }}
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      inputMode="numeric"
      className={FIELD}
    />
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={FIELD} />
}

function TextAreaField({ value, onChange, rows, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={FIELD + ' resize-none'} />
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={FIELD + ' cursor-pointer'}>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

/** Solo para color y background del style: picker (hex) + input de texto al lado. */
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value)
  return (
    <div className="flex items-center gap-1.5">
      <label
        className="relative w-7 h-7 rounded-[var(--radius-sm)] border border-soft overflow-hidden flex-shrink-0"
        style={{ background: isHex ? value : 'var(--color-warm-gray)' }}
        title={isHex ? 'Cambiar color' : 'Soporta rgba() y gradientes CSS'}
      >
        {isHex && (
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Elegir color"
          />
        )}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="#hex / rgba() / gradiente"
        className={FIELD + ' font-mono'}
      />
    </div>
  )
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-cherry-dark cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--color-cherry)' }} />
      {label}
    </label>
  )
}

/** Fila reordenable vertical: draggable + droppable en el mismo nodo (patrón @dnd-kit/core del repo). */
function ListRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={node => { setNodeRef(node); setDropRef(node) }}
      {...attributes}
      {...listeners}
      className={isOver ? 'outline-2 outline-dashed outline-cherry rounded-[var(--radius-sm)]' : 'touch-none'}
      style={{ opacity: isDragging ? 0.45 : 1, touchAction: 'none' }}
    >
      {children}
    </div>
  )
}

/* ── Interacción del lienzo: react-moveable ──────────────────────────────── */
/* Moveable controla el frame (drag/resize/rotate + snapping y guías). Los
   handlers escriben left/top/width/height DIRECTO en el nodo (coords de
   canvas: el contenedor interno va escalado, así px=node = px de canvas) y
   el commit a estado se hace UNA vez en el *End con las funciones puras de
   transform.ts (round + clamp). Así el drag va a 60fps sin re-render y el
   historial (undo) recibe un solo push por gesto. */

/** Snapshot del elemento al empezar un gesto de Moveable (con hijos si es grupo). */
interface MoveGesture {
  pos: { x: number; y: number }
  size: { w: number; h: number }
  children?: StoryDesignElement[]
}

/* ── Props ───────────────────────────────────────────────────────────────── */

export interface StoriesBuilderProps {
  templateId: string
  title: string
  /** Status actual de la plantilla (badge + botón Publicar). */
  status?: string
  initialSlides: unknown[]
  onClose: () => void
  onSaved?: (slides: StoryDesignSlide[]) => void
  onStatusChange?: (status: string) => void
}

export default function StoriesBuilder(props: StoriesBuilderProps) {
  // El tab de admin no tiene ToastProvider: el builder se monta con el suyo.
  return (
    <ToastProvider>
      <BuilderWorkspace {...props} />
    </ToastProvider>
  )
}

/* ── Workspace (toda la lógica viva) ─────────────────────────────────────── */

function BuilderWorkspace({ templateId, title, status, initialSlides, onClose, onSaved, onStatusChange }: StoriesBuilderProps) {
  const toast = useToast()
  const [slides, setSlides] = useState<StoryDesignSlide[]>(() =>
    parseSlidesLoose(Array.isArray(initialSlides) ? initialSlides : [], templateId)
  )
  const [activePageId, setActivePageId] = useState(() => slides[0]?.id ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Selección secundaria (shift-click sobre capas/lienzo) para AGRUPAR.
  const [multiIds, setMultiIds] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  // Autosave: idle → saving → saved | error (el header muestra el estado).
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [publishing, setPublishing] = useState(false)
  const [pubStatus, setPubStatus] = useState(status ?? 'draft')
  // Preview "Vista como usuaria": mismo renderer, gates de la usuaria, sin edición.
  const [previewMode, setPreviewMode] = useState(false)
  const [uploading, setUploading] = useState(false) // subida de foto de muestra (elemento image)
  const [error, setError] = useState('')
  const [baseScale, setBaseScale] = useState(0.2)
  const [zoom, setZoom] = useState(1)
  const [showGuides, setShowGuides] = useState(true)
  const scale = Math.max(0.02, baseScale * zoom)
  // Undo/redo: historial de slides con dedupe + coalescing de escritura
  const pastRef = useRef<StoryDesignSlide[][]>([])
  const futureRef = useRef<StoryDesignSlide[][]>([])
  const [histTick, setHistTick] = useState(0)
  const lastPushAt = useRef(0)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const scaleRef = useRef(scale)
  // Nodos DOM por elemento id (los registros SlideCanvas); Moveable los usa de target
  const elementRefs = useRef<Map<string, HTMLElement | null>>(new Map())
  const [selectedNode, setSelectedNode] = useState<HTMLElement | null>(null)

  const activeIdx = slides.findIndex(s => s.id === activePageId)
  const activeSlide = activeIdx >= 0 ? slides[activeIdx] : null
  const selectedEl = activeSlide?.elements.find(e => e.id === selectedId) ?? null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  /* Escala base del lienzo por tamaño disponible del stage (zoom multiplica) */
  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const update = () => {
      const rect = node.getBoundingClientRect()
      const s = Math.min(0.5, (rect.width - 24) / CANVAS_W, (rect.height - 24) / CANVAS_H)
      setBaseScale(Math.max(0.02, s))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { scaleRef.current = scale }, [scale])

  /* Nodo DOM del elemento seleccionado → target de Moveable */
  useEffect(() => {
    setSelectedNode(elementRefs.current.get(selectedId ?? '') ?? null)
  }, [selectedId, activePageId, slides])

  /* Atajos: ⌘Z/⇧⌘Z deshacer/rehacer · Supr elimina la capa · Escape deselecciona */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault()
        if (ev.shiftKey) redo()
        else undo()
        return
      }
      if (typing) return
      if (ev.key === 'Escape') {
        setSelectedId(null)
        setMultiIds([])
        return
      }
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedId && activeSlide) {
        ev.preventDefault()
        removeElement(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ── Undo / redo (historial de la página, cap 60, dedupe) ── */
  function pushHistory(prev: StoryDesignSlide[], force = false) {
    const now = Date.now()
    const coalesce = !force && now - lastPushAt.current < 1200 // escritura continua (typing)
    const last = pastRef.current[pastRef.current.length - 1]
    if (!coalesce && (!last || JSON.stringify(last) !== JSON.stringify(prev))) {
      pastRef.current.push(prev)
      if (pastRef.current.length > 60) pastRef.current.shift()
    }
    lastPushAt.current = now
    futureRef.current = []
    setHistTick(t => t + 1)
  }
  function undo() {
    const prev = pastRef.current.pop()
    if (!prev) return
    futureRef.current.push(slides)
    setSlides(prev)
    setDirty(true)
    setHistTick(t => t + 1)
  }
  function redo() {
    const next = futureRef.current.pop()
    if (!next) return
    pastRef.current.push(slides)
    setSlides(next)
    setDirty(true)
    setHistTick(t => t + 1)
  }

  /* Mutadores */
  const mutateElement = useCallback((pageId: string, elId: string, fn: (el: StoryDesignElement) => StoryDesignElement, force = false) => {
    setSlides(prev => {
      pushHistory(prev, force)
      return prev.map(s => {
        if (s.id !== pageId) return s
        return { ...s, elements: s.elements.map(e => (e.id === elId ? fn(e) : e)) }
      })
    })
    setDirty(true)
  }, [])

  function patchSlide(pageId: string, patch: Partial<StoryDesignSlide>) {
    setSlides(prev => { pushHistory(prev); return prev.map(s => (s.id === pageId ? { ...s, ...patch } : s)) })
    setDirty(true)
  }

  function patchSelected(fn: (el: StoryDesignElement) => StoryDesignElement) {
    if (!activeSlide || !selectedId) return
    mutateElement(activeSlide.id, selectedId, fn)
  }

  /** Sube una foto a /admin/upload (Storage) y devuelve su URL pública. */
  async function uploadFileToUrl(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/stories-diseno/admin/upload', { method: 'POST', body: fd })
    const data: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      const dataErr = typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error?: unknown }).error)
        : ''
      throw new Error(dataErr !== '' ? dataErr : `HTTP ${res.status}`)
    }
    const url = typeof data === 'object' && data !== null && 'url' in data ? String((data as { url?: unknown }).url) : ''
    if (!url) throw new Error('Respuesta sin URL')
    return url
  }

  /** Sube una foto de muestra y la deja como content del elemento seleccionado. */
  async function uploadMuestra(file: File) {
    setUploading(true)
    try {
      const url = await uploadFileToUrl(file)
      patchSelected(el => ({ ...el, content: url }))
      toast.show('Foto subida', 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo subir', 'info')
    } finally {
      setUploading(false)
    }
  }

  /* ── Gestos del lienzo (react-moveable) ─────────────────────────────── */
  const gestureRef = useRef<MoveGesture | null>(null)

  function gestureStart() {
    if (!selectedEl) { gestureRef.current = null; return }
    gestureRef.current = {
      pos: { ...selectedEl.position },
      size: { ...selectedEl.size },
      // Grupo: snapshot de hijos — durante el drag se mueven sus NODOS también.
      children: selectedEl.type === 'group'
        ? activeSlide?.elements.filter(e => e.parentId === selectedEl.id) ?? []
        : undefined,
    }
  }

  /** Durante el gesto: mueve el NODO (px de canvas) sin re-render. */
  function onMoveableDrag(ev: OnDrag) {
    const st = gestureRef.current
    if (!st) return
    const txc = (ev.beforeTranslate?.[0] ?? 0) / scaleRef.current
    const tyc = (ev.beforeTranslate?.[1] ?? 0) / scaleRef.current
    const node = ev.target as HTMLElement
    node.style.left = `${st.pos.x + txc}px`
    node.style.top = `${st.pos.y + tyc}px`
    // Grupo: el bbox arrastra a sus hijos (escritura directa en nodos).
    for (const kid of st.children ?? []) {
      const kn = elementRefs.current.get(kid.id)
      if (kn) {
        kn.style.left = `${kid.position.x + txc}px`
        kn.style.top = `${kid.position.y + tyc}px`
      }
    }
  }

  function onMoveableDragEnd(ev: OnDragEnd) {
    const st = gestureRef.current
    gestureRef.current = null
    if (!st || !selectedEl || !activeSlide || !ev.isDrag) return
    const bt = (ev.lastEvent as { beforeTranslate?: number[] } | undefined)?.beforeTranslate
    const dx = Math.round((bt?.[0] ?? 0) / scaleRef.current)
    const dy = Math.round((bt?.[1] ?? 0) / scaleRef.current)
    if (dx === 0 && dy === 0) return
    if (selectedEl.type === 'group') {
      commitGroupMove(activeSlide.id, selectedEl.id, dx, dy)
    } else if (selectedEl.parentId) {
      commitChildMove(activeSlide.id, selectedEl.id, dx, dy)
    } else {
      mutateElement(activeSlide.id, selectedEl.id, el => applyMove(el, dx, dy), true)
    }
  }

  /** Commit: mover grupo = delta a él Y a sus hijos (un solo push de historial). */
  function commitGroupMove(pageId: string, gid: string, dx: number, dy: number) {
    setSlides(prev => {
      pushHistory(prev, true)
      return prev.map(s => (s.id !== pageId ? s : {
        ...s,
        elements: s.elements.map(e => (e.id === gid || e.parentId === gid ? applyMove(e, dx, dy) : e)),
      }))
    })
    setDirty(true)
  }

  /** Commit: mover un hijo de grupo = delta al hijo + re-encuadre del bbox del grupo. */
  function commitChildMove(pageId: string, elId: string, dx: number, dy: number) {
    setSlides(prev => {
      pushHistory(prev, true)
      return prev.map(s => {
        if (s.id !== pageId) return s
        const els = s.elements.map(e => (e.id === elId ? applyMove(e, dx, dy) : e))
        const moved = els.find(e => e.id === elId)
        const gid = moved?.parentId
        if (!gid) return { ...s, elements: els }
        const bb = groupBbox(els.filter(e => e.parentId === gid))
        const els2 = bb
          ? els.map(e => (e.id === gid ? { ...e, position: { x: bb.x, y: bb.y }, size: { w: bb.w, h: bb.h } } : e))
          : els
        return { ...s, elements: els2 }
      })
    })
    setDirty(true)
  }

  function onMoveableResize(ev: OnResize) {
    const st = gestureRef.current
    if (!st) return
    const node = ev.target as HTMLElement
    const k = scaleRef.current
    const w = Math.max(MIN_SIZE, Math.round(ev.width / k))
    const h = Math.max(MIN_SIZE, Math.round(ev.height / k))
    node.style.width = `${w}px`
    node.style.height = `${h}px`
    node.style.left = `${st.pos.x + (ev.drag?.beforeTranslate?.[0] ?? 0) / k}px`
    node.style.top = `${st.pos.y + (ev.drag?.beforeTranslate?.[1] ?? 0) / k}px`
  }

  function onMoveableResizeEnd(ev: OnResizeEnd) {
    const st = gestureRef.current
    gestureRef.current = null
    if (!st || !selectedEl || !activeSlide || !ev.isDrag) return
    const le = ev.lastEvent as { width?: number; height?: number; drag?: { beforeTranslate?: number[] } } | undefined
    if (!le) return
    const k = scaleRef.current
    const w = Math.max(MIN_SIZE, Math.round((le.width ?? st.size.w) / k))
    const h = Math.max(MIN_SIZE, Math.round((le.height ?? st.size.h) / k))
    const x = Math.max(-Math.round(w / 2), Math.round(st.pos.x + (le.drag?.beforeTranslate?.[0] ?? 0) / k))
    const y = Math.max(0, Math.round(st.pos.y + (le.drag?.beforeTranslate?.[1] ?? 0) / k))
    mutateElement(activeSlide.id, selectedEl.id, el => ({ ...el, position: { x, y }, size: { w, h } }), true)
  }

  function onMoveableRotate(ev: OnRotate) {
    const node = ev.target as HTMLElement
    node.style.transform = `rotate(${ev.beforeRotate}deg)`
  }


  function onMoveableRotateEnd(ev: OnRotateEnd) {
    gestureRef.current = null
    if (!selectedEl || !activeSlide || !ev.isDrag) return
    const deg = (ev.lastEvent as { beforeRotate?: number } | undefined)?.beforeRotate
    if (deg === undefined) return
    const rotation = Math.round(((deg % 360) + 360) % 360)
    mutateElement(activeSlide.id, selectedEl.id, el => ({ ...el, rotation: rotation === 0 ? undefined : rotation }), true)
  }

  /* Páginas */
  function selectPage(id: string) {
    setActivePageId(id)
    setSelectedId(null)
    setMultiIds([])
  }

  function addPage() {
    const page: StoryDesignSlide = {
      id: uid('pg'), templateId, order: slides.length + 1,
      background: DEFAULT_BG, layoutType: 'text-only', elements: [],
    }
    setSlides(prev => { pushHistory(prev); return reindex([...prev, page]) })
    setActivePageId(page.id)
    setSelectedId(null)
    setDirty(true)
  }

  function duplicatePage(pageId: string) {
    const src = slides.find(s => s.id === pageId)
    if (!src) return
    const copy: StoryDesignSlide = {
      ...src,
      id: uid('pg'),
      name: src.name ? `${src.name} (copia)` : undefined,
      elements: src.elements.map(e => ({
        ...e,
        id: uid('el'),
        position: { ...e.position },
        size: { ...e.size },
        style: { ...e.style },
        constraints: e.constraints ? { ...e.constraints } : undefined,
        aiConfig: e.aiConfig ? { ...e.aiConfig, hints: e.aiConfig.hints ? [...e.aiConfig.hints] : undefined } : undefined,
        frame: e.frame ? { ...e.frame } : undefined,
      })),
    }
    setSlides(prev => {
      pushHistory(prev)
      const i = prev.findIndex(s => s.id === pageId)
      const next = [...prev]
      next.splice(i + 1, 0, copy)
      return reindex(next)
    })
    setActivePageId(copy.id)
    setSelectedId(null)
    setDirty(true)
  }

  function removePage(pageId: string, visualIdx: number) {
    if (!window.confirm('¿Eliminar esta página? Será definitiva al pulsar «Guardar».')) return
    pushHistory(slides)
    const remaining = reindex(slides.filter(s => s.id !== pageId))
    setSlides(remaining)
    if (activePageId === pageId) {
      setActivePageId(remaining[Math.max(0, Math.min(visualIdx, remaining.length - 1))]?.id ?? '')
      setSelectedId(null)
    }
    setDirty(true)
  }

  function handlePageDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setSlides(prev => {
      pushHistory(prev)
      const from = prev.findIndex(s => s.id === String(active.id))
      const to = prev.findIndex(s => s.id === String(over.id))
      if (from < 0 || to < 0) return prev
      return reindex(arrayMove(prev, from, to))
    })
    setDirty(true)
  }

  /* Capas: el drag reasigna zIndex 0..n-1 (n-1 = encima) según la nueva posición */
  function handleLayerDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id || !activeSlide) return
    const list = layerList(activeSlide)
    const from = list.findIndex(el => el.id === String(active.id))
    const to = list.findIndex(el => el.id === String(over.id))
    if (from < 0 || to < 0 || from === to) return
    const nextOrder = arrayMove(list, from, to)
    const zOf = new Map<string, number>()
    nextOrder.forEach((el, i) => zOf.set(el.id, nextOrder.length - 1 - i))
    patchSlide(activeSlide.id, {
      elements: activeSlide.elements.map(el => ({ ...el, zIndex: zOf.get(el.id) ?? el.zIndex ?? 0 })),
    })
  }

  function addElement(kind: AddKind, opts?: { position?: { x: number; y: number }; overrides?: Partial<StoryDesignElement> }) {
    if (!activeSlide) return
    // Garantiza zIndex en TODA la página (mismo orden visual). El fondo sólido va
    // AL FONDO (por debajo de todas las capas); el resto se coloca encima de todas.
    const els = ensureZIndexes(activeSlide.elements)
    const zs = els.map(e => e.zIndex ?? 0)
    const el: StoryDesignElement = {
      ...preset(kind, uid('el')),
      ...(opts?.overrides ?? {}),
      ...(opts?.position ? { position: opts.position } : {}),
      zIndex: els.length === 0
        ? 0
        : kind === 'bg-solid'
          ? Math.min(...zs) - 1
          : Math.max(...zs) + 1,
    }
    patchSlide(activeSlide.id, { elements: [...els, el] })
    setSelectedId(el.id)
  }

  /* ── Soltar foto/texto EN el lienzo (petición Jota 8-oct): arrastrar desde
     el escritorio/Finder → se SUBE la foto a Storage automáticamente y queda
     como elemento de la plantilla (Guardar la persiste en la DB). ── */
  const [dropOver, setDropOver] = useState(false)

  function dropAt(ev: React.DragEvent): { x: number; y: number } {
    const rect = canvasWrapRef.current?.getBoundingClientRect()
    if (!rect) return { x: 200, y: 400 }
    const { dx, dy } = screenToCanvas(ev.clientX - rect.left, ev.clientY - rect.top, scaleRef.current)
    return { x: Math.round(dx), y: Math.round(dy) }
  }

  function clampDropAt(at: { x: number; y: number }, w: number, h: number) {
    return {
      x: Math.max(8, Math.min(CANVAS_W - w - 8, at.x - Math.round(w / 2))),
      y: Math.max(8, Math.min(CANVAS_H - h - 8, at.y - Math.round(h / 2))),
    }
  }

  async function stageDrop(ev: React.DragEvent) {
    ev.preventDefault()
    setDropOver(false)
    if (!activeSlide) return
    const dt = ev.dataTransfer
    const at = dropAt(ev)
    const file = dt.files && dt.files.length > 0 ? dt.files[0] : null
    if (file && file.type.startsWith('image/')) {
      // Foto soltada → subir YA (auto-storage) y crear el hueco con esa URL
      setUploading(true)
      try {
        const url = await uploadFileToUrl(file)
        addElement('image', { position: clampDropAt(at, 640, 640), overrides: { content: url, name: 'Foto (soltada)' } })
        toast.show('Foto subida y colocada — pulsa Guardar para dejarla en la plantilla.', 'success')
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'No se pudo subir la foto', 'info')
      } finally {
        setUploading(false)
      }
      return
    }
    const text = dt.getData('text/plain').trim()
    if (text) {
      addElement('text', { position: clampDropAt(at, 900, 220), overrides: { content: text.slice(0, 400), name: 'Texto (soltado)' } })
      toast.show('Texto añadido — pulsa Guardar para dejarlo en la plantilla.', 'success')
      return
    }
    if (file || dt.types.length > 0) {
      toast.show('Solo fotos y texto: suelta una imagen o un texto.', 'info')
    }
  }

  function removeElement(elId: string) {
    if (!activeSlide) return
    const wasSelected = selectedId === elId
    setSlides(prev => {
      pushHistory(prev, true)
      return prev.map(s => {
        if (s.id !== activeSlide.id) return s
        const child = s.elements.find(e => e.id === elId)
        let els = s.elements.filter(e => e.id !== elId && e.parentId !== elId)
        // Si era hijo de grupo, la caja del grupo se re-encuadra a los hijos restantes.
        if (child?.parentId) {
          const bb = groupBbox(els.filter(e => e.parentId === child.parentId))
          if (bb) els = els.map(e => (e.id === child.parentId ? { ...e, position: { x: bb.x, y: bb.y }, size: { w: bb.w, h: bb.h } } : e))
        }
        return { ...s, elements: els }
      })
    })
    if (wasSelected) setSelectedId(null)
    setDirty(true)
  }

  function toggleElementVisible(elId: string) {
    if (!activeSlide) return
    mutateElement(activeSlide.id, elId, el => ({ ...el, visible: el.visible === false }))
  }

  /* Selección: primaria + shift-click secundaria (agrupar) */
  function selectLayer(id: string, additive: boolean) {
    if (additive && selectedId && id !== selectedId) {
      setMultiIds(cur => (cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]))
      return
    }
    setSelectedId(id)
    setMultiIds([])
  }

  function handleElementClick(el: StoryDesignElement, ev?: ReactMouseEvent<HTMLElement>) {
    selectLayer(el.id, Boolean(ev?.shiftKey))
  }

  function toggleElementLocked(elId: string) {
    if (!activeSlide) return
    mutateElement(activeSlide.id, elId, el => ({ ...el, adminLocked: !elementAdminLocked(el), locked: undefined }))
  }

  /* Acciones de transformación de la capa seleccionada */

  /** Copia profunda de un elemento (para duplicar capa, grupo o hijos). */
  function cloneElementCopy(e: StoryDesignElement, id: string, parentId: string | undefined, zIndex: number, dx = 40, dy = 40): StoryDesignElement {
    return {
      ...e,
      id,
      parentId,
      zIndex,
      name: e.name ? `${e.name} (copia)` : undefined,
      position: { x: e.position.x + dx, y: e.position.y + dy },
      size: { ...e.size },
      style: { ...e.style },
      constraints: e.constraints ? { ...e.constraints } : undefined,
      aiConfig: e.aiConfig ? { ...e.aiConfig, hints: e.aiConfig.hints ? [...e.aiConfig.hints] : undefined } : undefined,
      frame: e.frame ? { ...e.frame } : undefined,
      userPermissions: e.userPermissions ? { ...e.userPermissions } : undefined,
    }
  }

  function duplicateSelectedElement() {
    if (!activeSlide || !selectedEl) return
    const zMax = Math.max(0, ...activeSlide.elements.map(e => e.zIndex ?? 0))
    // Grupo: duplica a sus hijos también (respetando el desplazamiento del grupo).
    if (selectedEl.type === 'group') {
      const gid = uid('gr')
      const kids = activeSlide.elements.filter(e => e.parentId === selectedEl.id)
      const kidCopies = kids.map((e, i) => cloneElementCopy(e, uid('el'), gid, zMax + 1 + i, 40, 40))
      const groupCopy: StoryDesignElement = cloneElementCopy({ ...selectedEl }, gid, undefined, zMax + kids.length + 1, 40, 40)
      patchSlide(activeSlide.id, { elements: [...activeSlide.elements, ...kidCopies, { ...groupCopy, userPermissions: undefined }] })
      setSelectedId(gid)
      return
    }
    const copy = cloneElementCopy(selectedEl, uid('el'), selectedEl.parentId ?? undefined, (selectedEl.zIndex ?? 0) + 0.5)
    patchSlide(activeSlide.id, { elements: [...ensureZIndexes([...activeSlide.elements, copy])] })
    setSelectedId(copy.id)
  }

  /* Grupos: crear (selección + shift-clicks) y deshacer. */
  function groupSelection() {
    if (!activeSlide || !selectedId) return
    const ids = new Set([selectedId, ...multiIds])
    const members = activeSlide.elements.filter(e => ids.has(e.id) && e.type !== 'group' && !e.parentId)
    if (members.length < 2) {
      toast.show('Para agrupar, selecciona una capa y añade otras con shift-click.', 'info')
      return
    }
    const bb = groupBbox(members)
    if (!bb) return
    const zMax = Math.max(0, ...activeSlide.elements.map(e => e.zIndex ?? 0))
    const group: StoryDesignElement = {
      id: uid('gr'), type: 'group', role: 'fixed',
      position: { x: bb.x, y: bb.y }, size: { w: bb.w, h: bb.h },
      style: {}, name: 'Grupo', zIndex: zMax + 1,
    }
    setSlides(prev => prev.map(s => (s.id !== activeSlide.id ? s : {
      ...s,
      elements: [...s.elements.map(e => (ids.has(e.id) && e.type !== 'group' ? { ...e, parentId: group.id } : e)), group],
    })))
    setSelectedId(group.id)
    setMultiIds([])
    setDirty(true)
    toast.show('Capas agrupadas — se mueven como una sola.', 'success')
  }

  function ungroupSelectedElement() {
    if (!activeSlide || !selectedEl || selectedEl.type !== 'group') return
    const gid = selectedEl.id
    setSlides(prev => prev.map(s => (s.id !== activeSlide.id ? s : {
      ...s,
      elements: s.elements.filter(e => e.id !== gid).map(e => (e.parentId === gid ? { ...e, parentId: undefined } : e)),
    })))
    setSelectedId(null)
    setMultiIds([])
    setDirty(true)
  }

  /** Reordena la capa por zIndex relativo al listado renderizado (renderOrder). */
  function reorderZIndex(dir: 'front' | 'back' | 'up' | 'down') {
    if (!activeSlide || !selectedEl) return
    const ordered = renderOrder(activeSlide.elements)
    const idx = ordered.findIndex(e => e.id === selectedEl.id)
    if (idx < 0) return
    const to = dir === 'front'
      ? ordered.length - 1
      : dir === 'back'
        ? 0
        : dir === 'up'
          ? Math.min(ordered.length - 1, idx + 1)
          : Math.max(0, idx - 1)
    if (to === idx) return
    const finalOrder = arrayMove(ordered, idx, to)
    const zOf = new Map<string, number>()
    finalOrder.forEach((el, i) => zOf.set(el.id, i))
    patchSlide(activeSlide.id, {
      elements: activeSlide.elements.map(el => ({ ...el, zIndex: zOf.get(el.id) ?? el.zIndex ?? 0 })),
    })
  }

  /** Centra la capa en el eje (manteniendo su y rotación y tamaño). Grupo/hijo: delta conjunto. */
  function centerSelectedElement(axis: 'h' | 'v') {
    if (!activeSlide || !selectedEl) return
    const nx = axis === 'h' ? Math.round((CANVAS_W - selectedEl.size.w) / 2) : selectedEl.position.x
    const ny = axis === 'v' ? Math.round((CANVAS_H - selectedEl.size.h) / 2) : selectedEl.position.y
    const dx = nx - selectedEl.position.x
    const dy = ny - selectedEl.position.y
    if (dx === 0 && dy === 0) return
    if (selectedEl.type === 'group') commitGroupMove(activeSlide.id, selectedEl.id, dx, dy)
    else if (selectedEl.parentId) commitChildMove(activeSlide.id, selectedEl.id, dx, dy)
    else mutateElement(activeSlide.id, selectedEl.id, el => ({ ...el, position: { x: nx, y: ny } }), true)
  }

  /* ── Persistencia: PATCH same-origin con estados (Guardando/Guardado/Error) ── */
  const slidesRef = useRef(slides)
  useEffect(() => { slidesRef.current = slides })

  async function persistSlides(list: StoryDesignSlide[], opts?: { silent?: boolean }): Promise<boolean> {
    setSaveState('saving')
    try {
      await api(`/api/stories-diseno/admin/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: serializeSlides(list) }),
      })
      // Si hubo mutaciones durante el vuelo, el autosave sigue encendido.
      if (JSON.stringify(slidesRef.current) === JSON.stringify(list)) {
        setDirty(false)
        onSaved?.(list)
      } else {
        setDirty(true)
      }
      setSaveState('saved')
      if (!opts?.silent) toast.show('Plantilla guardada', 'success')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error guardando'
      setError(msg)
      setSaveState('error')
      if (!opts?.silent) toast.show('No se pudo guardar la plantilla', 'info')
      return false
    }
  }

  async function save() {
    setError('')
    setSaveState('idle')
    await persistSlides(slides)
  }

  /* Autosave: 2.5s tras el último cambio (silent; el estado lo pinta el header). */
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => { persistSlides(slides, { silent: true }) }, 2500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, slides])

  /* Publicar: congela la composición (published_slides + versión) para la galería. */
  async function publish() {
    if (!window.confirm('¿Publicar la plantilla? Se congela esta composición para las usuarias (versión guardada en la galería).')) return
    setPublishing(true)
    setError('')
    try {
      const data = await api(`/api/stories-diseno/admin/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: serializeSlides(slides), status: 'published' }),
      })
      setPubStatus('published')
      onStatusChange?.('published')
      setSaveState('saved')
      setDirty(false)
      onSaved?.(slides)
      const pubData = data as { version?: number | null } | null
      toast.show(
        pubData?.version ? `Publicado — versión ${pubData.version} congelada en la galería` : 'Publicada en la galería (sin versionado todavía)',
        'success',
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error publicando'
      setError(msg)
      toast.show('No se pudo publicar la plantilla', 'info')
    } finally {
      setPublishing(false)
    }
  }

  /* Duplicar la plantilla entera (copia draft en el mismo pack). */
  async function duplicateTemplate() {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Duplicar con la última versión guardada?')) return
    try {
      await api(`/api/stories-diseno/admin/templates/${templateId}`, { method: 'POST' })
      toast.show('Plantilla duplicada — la copia (draft) está en el mismo pack.', 'success')
      onClose()
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo duplicar', 'info')
    }
  }

  function tryClose() {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir de todas formas?')) return
    onClose()
  }

  const layerItems = activeSlide ? layerList(activeSlide) : []
  const isTextContent = selectedEl?.type === 'text' || selectedEl?.type === 'badge'
  const activeFont = selectedEl ? fontCssOf(selectedEl) : ''
  const selectedIsGroup = selectedEl?.type === 'group'
  // Permisos EFECTIVOS para la usuaria (defaults del rol + overrides guardados).
  const selectedPerm: StoryUserPermissions | null = selectedEl
    ? { ...defaultUserPermissions(selectedEl.role, selectedEl.type), ...(selectedEl.userPermissions ?? {}) }
    : null

  function permToggle(key: keyof StoryUserPermissions) {
    if (!selectedEl) return
    patchSelected(el => {
      const base = { ...defaultUserPermissions(el.role, el.type), ...(el.userPermissions ?? {}) }
      return { ...el, userPermissions: { ...base, [key]: !base[key] } }
    })
  }

  function permReset() {
    patchSelected(el => {
      const out = { ...el }
      delete out.userPermissions
      return out
    })
  }

  /** Nodos DOM de las OTRAS capas visibles — guidelines de snapping de Moveable. */
  function guidelineNodes(): HTMLElement[] {
    if (!activeSlide) return []
    const out: HTMLElement[] = []
    for (const e of activeSlide.elements) {
      if (e.id === selectedId || e.visible === false) continue
      const n = elementRefs.current.get(e.id)
      if (n) out.push(n)
    }
    return out
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden" style={{ background: 'var(--color-cream)' }}>
      {/* Header */}
      <header className="flex items-center gap-3 flex-shrink-0 h-14 px-4 border-b border-soft bg-cream">
        <Button size="sm" variant="ghost" icon={<ArrowLeft size={14} />} onClick={tryClose}>
          Volver
        </Button>
        <h1 className="text-sm font-bold text-cherry-dark truncate max-w-[260px]">{title}</h1>
        {activeSlide && (
          <span className="text-xs text-cherry-dark opacity-50 flex-shrink-0">
            Página {activeIdx + 1} de {slides.length}
          </span>
        )}
        {dirty && <Badge tone="buttermilk" className="flex-shrink-0">Sin guardar</Badge>}
        {saveState === 'saving' && <span className="text-[11px] text-cherry-dark opacity-60 flex-shrink-0">Guardando…</span>}
        {saveState === 'error' && <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: 'var(--color-danger, #B42318)' }}>Error al guardar</span>}
        {pubStatus !== 'draft' && <Badge tone="green" className="flex-shrink-0">Publicada</Badge>}
        <div className="ml-auto flex items-center gap-2 min-w-0">
          {error && <span className="text-[11px] text-danger truncate max-w-[240px]">{error}</span>}
          {/* Undo/redo */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={undo}
              disabled={pastRef.current.length === 0}
              className="p-1.5 rounded-[var(--radius-sm)] bg-warm-gray text-cherry-dark hover:bg-buttermilk disabled:opacity-30 disabled:cursor-not-allowed"
              title="Deshacer (⌘Z)"
              aria-label="Deshacer"
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={redo}
              disabled={futureRef.current.length === 0}
              className="p-1.5 rounded-[var(--radius-sm)] bg-warm-gray text-cherry-dark hover:bg-buttermilk disabled:opacity-30 disabled:cursor-not-allowed"
              title="Rehacer (⇧⌘Z)"
              aria-label="Rehacer"
            >
              <Redo2 size={14} />
            </button>
          </div>
          {/* Zoom del lienzo */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setZoom(z => Math.max(0.5, Math.round(z * 100 - 12) / 100))}
              className="p-1.5 rounded-[var(--radius-sm)] bg-warm-gray text-cherry-dark hover:bg-buttermilk"
              title="Alejar"
              aria-label="Alejar"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] tabular-nums text-cherry-dark opacity-60 w-9 text-center" title="Zoom actual">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(3, Math.round(z * 100 + 12) / 100))}
              className="p-1.5 rounded-[var(--radius-sm)] bg-warm-gray text-cherry-dark hover:bg-buttermilk"
              title="Acercar"
              aria-label="Acercar"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className={('p-1.5 rounded-[var(--radius-sm)] text-cherry-dark transition-colors flex items-center ') + (zoom === 1 ? 'bg-buttermilk' : 'bg-warm-gray hover:bg-buttermilk')}
              title="Ajustar al lienzo disponible"
              aria-label="Ajustar zoom"
            >
              <Maximize size={14} />
            </button>
            <button
              onClick={() => setShowGuides(g => !g)}
              className={('p-1.5 rounded-[var(--radius-sm)] text-cherry-dark transition-colors flex items-center ') + (showGuides ? 'bg-buttermilk' : 'bg-warm-gray hover:bg-buttermilk')}
              title="Mostrar/ocultar guías (márgenes seguros y ejes)"
              aria-label="Guías del lienzo"
            >
              <Ruler size={14} />
            </button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Eye size={14} />}
            onClick={() => setPreviewMode(true)}
            disabled={!activeSlide}
            className="flex-shrink-0"
            title="Vista como usuaria: qué puede tocar cada estilista"
          >
            Vista usuaria
          </Button>
          <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={duplicateTemplate} className="flex-shrink-0" title="Duplicar la plantilla entera (copia draft)">
            Duplicar
          </Button>
          <Button size="sm" variant="secondary" loading={publishing} onClick={publish} icon={publishing ? undefined : <Send size={14} />} className="flex-shrink-0" title="Publicar: congela la composición para la galería">
            Publicar
          </Button>
          <Button size="sm" loading={saveState === 'saving'} onClick={save} icon={saveState === 'saving' ? undefined : <Save size={14} />} className="flex-shrink-0">
            Guardar
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── Izquierda: Páginas + Capas + Añadir ── */}
        <aside className="w-[260px] flex-shrink-0 border-r border-soft bg-cream flex flex-col min-h-0">
          {/* Páginas */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
            <p className={PANEL_TITLE}>Páginas</p>
            <button
              onClick={addPage}
              className="p-1.5 rounded-[var(--radius-sm)] bg-buttermilk text-cherry-dark hover:opacity-80"
              title="Añadir página"
              aria-label="Añadir página"
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3">
            {slides.length === 0 ? (
              <p className="py-4 text-xs text-center text-cherry-dark opacity-50">Sin páginas — añade la primera.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageDragEnd}>
                {slides.map((page, i) => (
                  <ListRow key={page.id} id={page.id}>
                    <div
                      className="flex items-center gap-2 mb-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-grab"
                      style={{
                        background: page.id === activePageId ? 'var(--color-buttermilk)' : 'var(--color-warm-gray)',
                        outline: page.id === activePageId ? '2px solid var(--color-cherry)' : 'none',
                      }}
                    >
                      <button
                        onClick={() => selectPage(page.id)}
                        className="flex-shrink-0 overflow-hidden rounded-[3px] border border-soft"
                        title="Editar esta página"
                        aria-label={'Editar página ' + (i + 1)}
                      >
                        <SlideCanvas slide={page} scale={PAGE_THUMB_SCALE} />
                      </button>
                      <button onClick={() => selectPage(page.id)} className="flex-1 min-w-0 text-left">
                        <span className="block text-xs font-semibold text-cherry-dark truncate">
                          {page.name || `Página ${i + 1}`}
                        </span>
                        <span className="block text-[10px] text-cherry-dark opacity-50">
                          {page.elements.length} {page.elements.length === 1 ? 'capa' : 'capas'}
                        </span>
                      </button>
                      <button
                        onClick={() => duplicatePage(page.id)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-cherry-dark hover:opacity-70"
                        title="Duplicar página"
                        aria-label="Duplicar página"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => removePage(page.id, i)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-danger hover:opacity-70"
                        title="Eliminar página"
                        aria-label="Eliminar página"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </ListRow>
                ))}
              </DndContext>
            )}
          </div>

          {/* Capas */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-t border-soft">
            <p className={PANEL_TITLE}>Capas</p>
            <span className="text-[10px] text-cherry-dark opacity-40">{layerItems.length}</span>
          </div>
          <div className="flex-[0.8] min-h-0 overflow-y-auto px-3">
            {!activeSlide || layerItems.length === 0 ? (
              <p className="py-3 text-xs text-center text-cherry-dark opacity-50">
                {activeSlide ? 'Sin capas todavía.' : 'Selecciona una página.'}
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLayerDragEnd}>
                {layerItems.map(el => (
                  <ListRow key={el.id} id={el.id}>
                    <div
                      className="flex items-center gap-1.5 mb-1 px-1.5 py-1 rounded-[var(--radius-sm)] cursor-grab"
                      style={{
                        background: el.id === selectedId ? 'var(--color-buttermilk)' : multiIds.includes(el.id) ? 'var(--color-buttermilk)' : 'var(--color-warm-gray)',
                        outline: el.id === selectedId ? '1.5px solid var(--color-cherry)' : multiIds.includes(el.id) ? '1px dashed var(--color-cherry)' : 'none',
                        opacity: el.visible === false ? 0.55 : 1,
                      }}
                    >
                      <button
                        onClick={ev => selectLayer(el.id, ev.shiftKey)}
                        className="flex-1 min-w-0 text-left"
                        title="Seleccionar capa (shift-click: sumar para agrupar)"
                      >
                        <span className="block text-xs font-semibold text-cherry-dark truncate">
                          {el.name || `${TYPE_LABEL[el.type]}`}
                        </span>
                        <span className="block text-[10px] text-cherry-dark opacity-50">
                          {TYPE_LABEL[el.type]} · {el.role}
                        </span>
                      </button>
                      <button
                        onClick={() => toggleElementVisible(el.id)}
                        className="p-1 rounded-[var(--radius-sm)] text-cherry-dark hover:opacity-70"
                        title={el.visible === false ? 'Mostrar' : 'Ocultar'}
                        aria-label="Visibilidad de la capa"
                      >
                        {el.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        onClick={() => toggleElementLocked(el.id)}
                        className="p-1 rounded-[var(--radius-sm)] text-cherry-dark hover:opacity-70"
                        title={elementAdminLocked(el) ? 'Desbloquear' : 'Bloquear'}
                        aria-label="Bloqueo de la capa"
                      >
                        {elementAdminLocked(el) ? <Lock size={12} /> : <LockOpen size={12} />}
                      </button>
                      <button
                        onClick={() => removeElement(el.id)}
                        className="p-1 rounded-[var(--radius-sm)] text-danger hover:opacity-70"
                        title="Eliminar capa"
                        aria-label="Eliminar capa"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </ListRow>
                ))}
              </DndContext>
            )}
          </div>

          {/* Añadir elementos (dos grupos: Foto y el resto) */}
          <div className="px-3 py-2.5 border-t border-soft flex-shrink-0">
            <p className={PANEL_TITLE + ' mb-1.5'}>Añadir</p>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-cherry-dark opacity-40 mb-1">Foto</p>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {PHOTO_PRESETS.map(p => (
                <button
                  key={p.kind}
                  onClick={() => addElement(p.kind)}
                  disabled={!activeSlide}
                  className="flex flex-col items-center gap-0.5 py-1.5 rounded-[var(--radius-sm)] border border-soft bg-warm-gray text-cherry-dark hover:bg-buttermilk transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title={'Añadir ' + p.label.toLowerCase()}
                >
                  {p.icon}
                  <span className="text-[10px] font-semibold leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {ADD_PRESETS.map(p => (
                <button
                  key={p.kind}
                  onClick={() => addElement(p.kind)}
                  disabled={!activeSlide}
                  className="flex flex-col items-center gap-0.5 py-1.5 rounded-[var(--radius-sm)] border border-soft bg-warm-gray text-cherry-dark hover:bg-buttermilk transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title={'Añadir ' + p.label.toLowerCase()}
                >
                  {p.icon}
                  <span className="text-[10px] font-semibold">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Centro: lienzo ── */}
        <main
          className="relative flex-1 min-w-0 bg-warm-gray"
          // Evita que el navegador abra una foto soltada fuera del lienzo
          onDragOver={ev => ev.preventDefault()}
          onDrop={ev => ev.preventDefault()}
        >
          <div
            ref={stageRef}
            className={'absolute inset-0 flex items-start justify-center ' + (zoom > 1 ? 'overflow-auto p-3' : 'overflow-hidden items-center')}
          >
            {activeSlide ? (
              <div
                ref={canvasWrapRef}
                className="relative shadow-strong flex-shrink-0"
                onDragOver={ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; setDropOver(true) }}
                onDragLeave={ev => { if (!ev.currentTarget.contains(ev.relatedTarget as Node)) setDropOver(false) }}
                onDrop={stageDrop}
                style={{ width: CANVAS_W * scale, height: CANVAS_H * scale, marginBottom: zoom > 1 ? 'auto' : undefined, marginTop: zoom > 1 ? 'auto' : undefined, outline: dropOver ? '3px dashed var(--color-cherry)' : 'none', outlineOffset: 4 }}
              >
                <SlideCanvas
                  key={activeSlide.id}
                  slide={activeSlide}
                  scale={scale}
                  interactive
                  allSelectable
                  elementRefs={elementRefs}
                  selectedId={selectedId}
                  onElementClick={handleElementClick}
                />
                {/* Aviso de drop activo (arrastrar foto/texto desde fuera) */}
                {dropOver && (
                  <div
                    className="absolute inset-x-0 top-3 z-20 flex justify-center"
                    style={{ pointerEvents: 'none' }}
                    aria-hidden="true"
                  >
                    <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--color-cherry)' }}>
                      Suelta: la foto se sube y queda aquí
                    </span>
                  </div>
                )}
                {/* Guías editoriales: márgenes seguros + ejes centrales */}
                {showGuides && (
                  <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}
                    aria-hidden="true"
                  >
                    <div style={{ position: 'absolute', left: 96 * scale, top: 96 * scale, width: CANVAS_W * scale - 192 * scale, height: CANVAS_H * scale - 192 * scale, border: '1px dashed var(--color-cherry)', opacity: 0.22 }} />
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--color-cherry)', opacity: 0.18 }} />
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--color-cherry)', opacity: 0.18 }} />
                  </div>
                )}
                {/* Frame de transformación react-moveable del elemento seleccionado */}
                <Moveable
                  target={selectedNode}
                  container={canvasWrapRef.current}
                  draggable
                  resizable={!selectedIsGroup}
                  rotatable={!selectedIsGroup}
                  origin={false}
                  Snappable
                  useResizeObserver={!!selectedNode}
                  keepRatio={false}
                  renderDirections={['nw', 'ne', 'sw', 'se']}
                  elementGuidelines={guidelineNodes()}
                  verticalGuidelines={[CANVAS_W / 2]}
                  horizontalGuidelines={[CANVAS_H / 2]}
                  bounds={{ left: 0, top: 0, right: CANVAS_W * scale, bottom: CANVAS_H * scale, position: 'css' }}
                  onDragStart={gestureStart}
                  onDrag={onMoveableDrag}
                  onDragEnd={onMoveableDragEnd}
                  onResizeStart={gestureStart}
                  onResize={onMoveableResize}
                  onResizeEnd={onMoveableResizeEnd}
                  onRotateStart={gestureStart}
                  onRotate={onMoveableRotate}
                  onRotateEnd={onMoveableRotateEnd}
                />
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-cherry-dark opacity-60">Esta plantilla no tiene páginas todavía.</p>
                <Button size="sm" icon={<Plus size={14} />} onClick={addPage}>Añadir página</Button>
              </div>
            )}
          </div>
        </main>

        {/* ── Derecha: propiedades ── */}
        <aside className="w-[320px] flex-shrink-0 border-l border-soft bg-cream overflow-y-auto min-h-0">
          {/* Bloque PÁGINA */}
          {activeSlide && (
            <section className="p-4 border-b border-soft space-y-2.5">
              <p className={PANEL_TITLE}>Página</p>
              <Field label="Nombre">
                <TextInput
                  value={activeSlide.name ?? ''}
                  onChange={v => patchSlide(activeSlide.id, { name: v || undefined })}
                  placeholder="Portada, Explicación…"
                />
              </Field>
              <Field label="Fondo (color / gradiente)">
                <ColorField
                  value={activeSlide.background}
                  onChange={v => patchSlide(activeSlide.id, { background: v || DEFAULT_BG })}
                />
              </Field>
              <Field label="Propósito">
                <SelectInput
                  value={activeSlide.purpose ?? ''}
                  onChange={v => patchSlide(activeSlide.id, { purpose: (v || undefined) as StorySlidePurpose | undefined })}
                  options={PAGE_PURPOSE_OPTIONS}
                />
              </Field>
              <Field label="Layout">
                <SelectInput
                  value={activeSlide.layoutType}
                  onChange={v => patchSlide(activeSlide.id, { layoutType: v as StorySlideLayoutType })}
                  options={LAYOUT_OPTIONS}
                />
              </Field>
            </section>
          )}

          {/* Bloque ELEMENTO */}
          <section className="p-4 space-y-2.5 pb-12">
            <p className={PANEL_TITLE}>Elemento</p>
            {!selectedEl ? (
              <p className="text-xs text-cherry-dark opacity-50">
                {activeSlide ? 'Selecciona una capa para editar sus propiedades.' : 'Añade una página para empezar.'}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge tone="cherry">{TYPE_LABEL[selectedEl.type]}</Badge>
                  <span className="text-[10px] text-cherry-dark opacity-50 truncate">{selectedEl.id}</span>
                </div>

                <Field label="Nombre de la capa">
                  <TextInput
                    value={selectedEl.name ?? ''}
                    onChange={v => patchSelected(el => ({ ...el, name: v || undefined }))}
                    placeholder="Titular, CTA…"
                  />
                </Field>

                <Field label="Rol">
                  <SelectInput
                    value={selectedEl.role}
                    onChange={v => patchSelected(el => ({ ...el, role: v as StoryElementRole }))}
                    options={ROLES_OPTIONS}
                  />
                  <p className="text-[10px] text-cherry-dark opacity-60 mt-0.5">
                    {ROLES_OPTIONS.find(r => r.value === selectedEl.role)?.desc}
                  </p>
                </Field>

                <div className="flex items-center gap-4">
                  <CheckField
                    label="Fija en el lienzo"
                    checked={elementAdminLocked(selectedEl)}
                    onChange={() => toggleElementLocked(selectedEl.id)}
                  />
                  <CheckField
                    label="Visible"
                    checked={selectedEl.visible !== false}
                    onChange={() => toggleElementVisible(selectedEl.id)}
                  />
                </div>

                {/* Transformaciones */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <ToolBtn title="Duplicar capa" onClick={duplicateSelectedElement}><Copy size={13} /></ToolBtn>
                  {selectedIsGroup
                    ? <ToolBtn title="Desagrupar (las capas vuelven a sueltos)" onClick={ungroupSelectedElement}><UngroupIcon size={13} /></ToolBtn>
                    : <ToolBtn title="Agrupar: selección + shift-click en otras capas" onClick={groupSelection}><GroupIcon size={13} /></ToolBtn>}
                  <ToolBtn title="Centrar en horizontal" onClick={() => centerSelectedElement('h')}><AlignCenterHorizontal size={13} /></ToolBtn>
                  <ToolBtn title="Centrar en vertical" onClick={() => centerSelectedElement('v')}><AlignCenterVertical size={13} /></ToolBtn>
                  <ToolBtn title="Al frente" onClick={() => reorderZIndex('front')}><ChevronsUp size={13} /></ToolBtn>
                  <ToolBtn title="Avanzar una capa" onClick={() => reorderZIndex('up')}><ChevronUp size={13} /></ToolBtn>
                  <ToolBtn title="Retrasar una capa" onClick={() => reorderZIndex('down')}><ChevronDown size={13} /></ToolBtn>
                  <ToolBtn title="Al fondo" onClick={() => reorderZIndex('back')}><ChevronsDown size={13} /></ToolBtn>
                  <ToolBtn title={selectedEl.adminLocked ? 'Desbloquear (editor)' : 'Bloquear en el editor (evita moverla sin querer)'} onClick={() => mutateElement(activeSlide!.id, selectedEl.id, el => ({ ...el, adminLocked: !el.adminLocked }), true)} active={selectedEl.adminLocked === true}>
                    {selectedEl.adminLocked ? <Lock size={13} /> : <LockOpen size={13} />}
                  </ToolBtn>
                  {multiIds.length > 0 && (
                    <span className="self-center px-2 py-0.5 rounded-full text-[10px] font-bold text-cherry-dark" style={{ background: 'var(--color-buttermilk)' }}>
                      {multiIds.length + 1} seleccionadas · Agrupar
                    </span>
                  )}
                </div>

                {selectedIsGroup && (
                  <p className="text-[10px] text-cherry-dark opacity-60">
                    Grupo de {activeSlide?.elements.filter(e => e.parentId === selectedEl.id).length ?? 0} capas — arrastra la caja para moverlas juntas. Desagrupa para editar cada capa.
                  </p>
                )}

                {/* Permisos de la USUARIA en la plantilla — SEPARADOS del lock de editor.
                    Se muestran solo los relevantes al tipo; defaults según el rol. */}
                {!selectedIsGroup && (
                  <div className="pt-1.5 space-y-1 border-t border-soft">
                    <div className="flex items-center justify-between">
                      <p className={PANEL_TITLE}>Permisos en plantilla</p>
                      {selectedEl.userPermissions && (
                        <button
                          onClick={permReset}
                          className="text-[10px] text-cherry-dark opacity-60 hover:opacity-90 underline"
                          title="Volver a los permisos por defecto del rol"
                        >
                          Restaurar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {(selectedEl.type === 'text' || selectedEl.type === 'badge'
                        ? [{ k: 'edit' as const, l: 'Edita el texto' }]
                        : selectedEl.type === 'image'
                          ? [
                              { k: 'replace' as const, l: 'Reemplaza la foto' },
                              { k: 'recrop' as const, l: 'Reencuadra' },
                              { k: 'zoom' as const, l: 'Zoom' },
                            ]
                          : selectedEl.type === 'sticker'
                            ? [{ k: 'edit' as const, l: 'Cambia el emoji' }]
                            : []
                      ).map(r => (
                        <CheckField key={r.k} label={r.l} checked={!!selectedPerm?.[r.k]} onChange={() => permToggle(r.k)} />
                      ))}
                      {selectedEl.type !== 'image' && selectedEl.type !== 'group' && !(
                        selectedEl.type === 'text' || selectedEl.type === 'badge'
                      ) && (
                        <CheckField label="Cambia el color" checked={!!selectedPerm?.colorEdit} onChange={() => permToggle('colorEdit')} />
                      )}
                      <CheckField label="La mueve" checked={!!selectedPerm?.move} onChange={() => permToggle('move')} />
                      {!selectedIsGroup && (
                        <CheckField label="Cambia tamaño" checked={!!selectedPerm?.resize} onChange={() => permToggle('resize')} />
                      )}
                      {!selectedIsGroup && (
                        <CheckField label="La elimina" checked={!!selectedPerm?.del} onChange={() => permToggle('del')} />
                      )}
                      {(selectedEl.role === 'ai' || selectedEl.role === 'brand') && (
                        <CheckField label="La IA la modifica" checked={!!selectedPerm?.aiEdit} onChange={() => permToggle('aiEdit')} />
                      )}
                    </div>
                  </div>
                )}

                {/* Contenido según tipo */}
                {(selectedEl.type === 'text' || selectedEl.type === 'badge') && (
                  <>
                    <Field label="Contenido">
                      <TextAreaField
                        rows={3}
                        value={selectedEl.content ?? ''}
                        onChange={v => patchSelected(el => ({ ...el, content: v }))}
                        placeholder="Texto…"
                      />
                    </Field>
                    <Field label="Tipografía">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => patchSelected(el => {
                            const style = { ...el.style }
                            delete style.fontFamily
                            return { ...el, style }
                          })}
                          className="w-full px-2 py-1.5 text-xs text-cherry-dark rounded-[var(--radius-sm)] border border-soft bg-warm-gray hover:bg-buttermilk transition-colors truncate"
                          style={{ outline: activeFont === '' ? '2px solid var(--color-cherry)' : 'none' }}
                          title="Fuente por defecto de la app"
                        >
                          Por defecto
                        </button>
                        {STORY_FONTS.map(f => (
                          <button
                            key={f.key}
                            onClick={() => patchSelected(el => ({ ...el, style: { ...el.style, fontFamily: f.css } }))}
                            className="w-full px-2 py-1.5 text-xs text-cherry-dark rounded-[var(--radius-sm)] border border-soft bg-warm-gray hover:bg-buttermilk transition-colors truncate"
                            style={{ fontFamily: f.css, outline: activeFont === f.css ? '2px solid var(--color-cherry)' : 'none' }}
                            title={'Tipografía ' + f.label}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Placeholder">
                      <TextInput
                        value={selectedEl.placeholder ?? ''}
                        onChange={v => patchSelected(el => ({ ...el, placeholder: v || undefined }))}
                        placeholder="Texto de ejemplo del hueco"
                      />
                    </Field>
                  </>
                )}
                {selectedEl.type === 'image' && (
                  <>
                    <Field label="Subir foto de muestra">
                      <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-warm-gray border-[1.5px] border-soft rounded-[var(--radius-sm)] text-cherry-dark hover:bg-buttermilk transition-colors cursor-pointer select-none">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={e => {
                            const f = e.target.files?.[0]
                            e.target.value = ''
                            if (f) uploadMuestra(f)
                          }}
                        />
                        <ImagePlus size={13} />
                        <span>{uploading ? 'Subiendo…' : 'Subir foto…'}</span>
                      </label>
                    </Field>
                    <Field label="URL foto muestra">
                      <TextInput
                        value={selectedEl.content ?? ''}
                        onChange={v => patchSelected(el => ({ ...el, content: v }))}
                        placeholder="https://…"
                      />
                    </Field>
                    <Field label="Máscara de la foto">
                      <div className="flex gap-1">
                        {(['rect', 'rounded', 'circle'] as const).map(m => (
                          <ToolBtn
                            key={m}
                            title={m === 'rect' ? 'Cuadrado' : m === 'rounded' ? 'Esquinas redondeadas' : 'Círculo'}
                            active={(selectedEl.mask ?? (numFromStyle(selectedEl.style.borderRadius) ? 'rounded' : 'rect')) === m}
                            onClick={() => patchSelected(el => ({ ...el, mask: m }))}
                          >
                            <span className="text-[11px] font-semibold px-0.5">{m === 'rect' ? 'Rect' : m === 'rounded' ? 'Redon.' : 'Círculo'}</span>
                          </ToolBtn>
                        ))}
                      </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Ajuste (object-fit)">
                        <SelectInput
                          value={typeof selectedEl.style.objectFit === 'string' ? selectedEl.style.objectFit : 'cover'}
                          onChange={v => patchSelected(el => {
                            const style = { ...el.style }
                            if (v === 'cover') delete style.objectFit
                            else style.objectFit = v
                            return { ...el, style }
                          })}
                          options={[
                            { value: 'cover', label: 'Llenar (cover)' },
                            { value: 'contain', label: 'Contener (contain)' },
                          ]}
                        />
                      </Field>
                      <Field label="Redondeo (px)">
                        <NumInput
                          value={numFromStyle(selectedEl.style.borderRadius)}
                          min={0}
                          onChange={v => patchSelected(el => {
                            const style = { ...el.style }
                            const rounded = Math.round(v ?? 0)
                            if (rounded > 0) style.borderRadius = rounded
                            else delete style.borderRadius
                            return { ...el, style: style, mask: rounded > 0 ? 'rounded' : 'rect' }
                          })}
                        />
                      </Field>
                    </div>
                    <Field label="Sombra">
                      <div className="flex gap-1">
                        <ToolBtn
                          title="Sin sombra"
                          active={!selectedEl.style.boxShadow}
                          onClick={() => patchSelected(el => {
                            const style = { ...el.style }
                            delete style.boxShadow
                            return { ...el, style }
                          })}
                        ><span className="text-[11px] font-semibold px-0.5">—</span></ToolBtn>
                        <ToolBtn
                          title="Sombra suave"
                          active={selectedEl.style.boxShadow === '0 18px 44px rgba(42,11,18,0.28)'}
                          onClick={() => patchSelected(el => ({ ...el, style: { ...el.style, boxShadow: '0 18px 44px rgba(42,11,18,0.28)' } }))}
                        ><span className="text-[11px] font-semibold px-0.5">Suave</span></ToolBtn>
                        <ToolBtn
                          title="Sombra dura (polaroid)"
                          active={selectedEl.style.boxShadow === '0 6px 0 rgba(42,11,18,0.16)'}
                          onClick={() => patchSelected(el => ({ ...el, style: { ...el.style, boxShadow: '0 6px 0 rgba(42,11,18,0.16)' } }))}
                        ><span className="text-[11px] font-semibold px-0.5">Dura</span></ToolBtn>
                      </div>
                    </Field>
                    <Field label="Encuadre (zoom de la foto de muestra)">
                      <NumInput
                        value={selectedEl.frame?.zoom ?? 1}
                        step={0.1}
                        min={1}
                        max={3}
                        onChange={v => patchSelected(el => ({
                          ...el,
                          frame: { zoom: v === undefined || v < 1 ? 1 : Math.min(3, v), dx: el.frame?.dx ?? 0, dy: el.frame?.dy ?? 0 },
                        }))}
                      />
                    </Field>
                    <Field label="Placeholder">
                      <TextInput
                        value={selectedEl.placeholder ?? ''}
                        onChange={v => patchSelected(el => ({ ...el, placeholder: v || undefined }))}
                        placeholder="Toca para subir foto"
                      />
                    </Field>
                  </>
                )}
                {selectedEl.type === 'icon' && (
                  <Field label="Icono">
                    <SelectInput
                      value={selectedEl.content ?? ''}
                      onChange={v => patchSelected(el => ({ ...el, content: v }))}
                      options={ICON_OPTIONS}
                    />
                  </Field>
                )}
                {selectedEl.type === 'sticker' && (
                  <>
                    <Field label="Símbolo / emoji">
                      <TextInput
                        value={selectedEl.content ?? ''}
                        onChange={v => patchSelected(el => ({ ...el, content: v }))}
                        placeholder="✨"
                      />
                    </Field>
                    <Field label="Rápidos">
                      <div className="flex flex-wrap gap-1">
                        {STICKER_CHIPS.map(chip => (
                          <button
                            key={chip}
                            onClick={() => patchSelected(el => ({ ...el, content: chip }))}
                            className="w-7 h-7 text-base leading-none rounded-[var(--radius-sm)] border border-soft bg-warm-gray hover:bg-buttermilk transition-colors"
                            title={'Usar ' + chip}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </>
                )}

                {/* Geometría */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Field label="X">
                    <NumInput
                      value={selectedEl.position.x}
                      onChange={v => patchSelected(el => ({ ...el, position: { ...el.position, x: v ?? el.position.x } }))}
                    />
                  </Field>
                  <Field label="Y">
                    <NumInput
                      value={selectedEl.position.y}
                      onChange={v => patchSelected(el => ({ ...el, position: { ...el.position, y: v ?? el.position.y } }))}
                    />
                  </Field>
                  <Field label="Ancho">
                    <NumInput
                      value={selectedEl.size.w}
                      min={4}
                      onChange={v => patchSelected(el => ({ ...el, size: { ...el.size, w: v === undefined ? el.size.w : Math.max(4, Math.round(v)) } }))}
                    />
                  </Field>
                  <Field label="Alto">
                    <NumInput
                      value={selectedEl.size.h}
                      min={4}
                      onChange={v => patchSelected(el => ({ ...el, size: { ...el.size, h: v === undefined ? el.size.h : Math.max(4, Math.round(v)) } }))}
                    />
                  </Field>
                  <Field label="Rotación (°)">
                    <NumInput
                      value={selectedEl.rotation}
                      step={5}
                      onChange={v => patchSelected(el => ({ ...el, rotation: v === undefined ? el.rotation : Math.round(v) }))}
                    />
                  </Field>
                  <Field label="zIndex">
                    <NumInput
                      value={selectedEl.zIndex}
                      onChange={v => patchSelected(el => ({ ...el, zIndex: v === undefined ? el.zIndex : Math.round(v) }))}
                    />
                  </Field>
                </div>

                {/* Estilos */}
                <Field label="Opacidad">
                  <NumInput
                    value={numFromStyle(selectedEl.style.opacity) ?? 1}
                    step={0.05}
                    min={0}
                    max={1}
                    onChange={v => patchSelected(el => {
                      const style = { ...el.style }
                      if (v === undefined || v >= 1) delete style.opacity
                      else if (v < 0) style.opacity = 0
                      else style.opacity = v
                      return { ...el, style }
                    })}
                  />
                </Field>

                {(selectedEl.type === 'text' || selectedEl.type === 'badge' || selectedEl.type === 'sticker' || selectedEl.type === 'icon') && (
                  <>
                    {(selectedEl.type === 'text' || selectedEl.type === 'badge') && (
                      <Field label="Color del texto">
                        <ColorField
                          value={typeof selectedEl.style.color === 'string' ? selectedEl.style.color : ''}
                          onChange={v => patchSelected(el => {
                            const style = { ...el.style }
                            if (v) style.color = v
                            else delete style.color
                            return { ...el, style }
                          })}
                        />
                      </Field>
                    )}
                    {selectedEl.type === 'icon' && (
                      <Field label="Color">
                        <ColorField
                          value={typeof selectedEl.style.color === 'string' ? selectedEl.style.color : ''}
                          onChange={v => patchSelected(el => {
                            const style = { ...el.style }
                            if (v) style.color = v
                            else delete style.color
                            return { ...el, style }
                          })}
                        />
                      </Field>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Tamaño fuente">
                        <NumInput
                          value={numFromStyle(selectedEl.style.fontSize)}
                          min={8}
                          onChange={v => patchSelected(el => {
                            const style = { ...el.style }
                            if (v === undefined || v < 8) delete style.fontSize
                            else style.fontSize = v
                            return { ...el, style }
                          })}
                        />
                      </Field>
                      {(selectedEl.type === 'text' || selectedEl.type === 'badge') && (
                        <Field label="Peso (font)">
                          <NumInput
                            value={numFromStyle(selectedEl.style.fontWeight)}
                            step={100}
                            min={100}
                            max={900}
                            onChange={v => patchSelected(el => {
                              const style = { ...el.style }
                              if (v === undefined) delete style.fontWeight
                              else style.fontWeight = Math.round(v)
                              return { ...el, style }
                            })}
                          />
                        </Field>
                      )}
                    </div>
                    {(selectedEl.type === 'text' || selectedEl.type === 'badge') && (
                      <>
                        <div className="flex gap-1">
                          <ToolBtn
                            title="Itálica"
                            active={typeof selectedEl.style.fontStyle === 'string' && selectedEl.style.fontStyle === 'italic'}
                            onClick={() => patchSelected(el => {
                              const style = { ...el.style }
                              if (style.fontStyle === 'italic') delete style.fontStyle
                              else style.fontStyle = 'italic'
                              return { ...el, style }
                            })}
                          >
                            <span className="italic text-[11px] font-semibold px-0.5">Aa</span>
                          </ToolBtn>
                          <ToolBtn
                            title="MAYÚSCULAS"
                            active={typeof selectedEl.style.textTransform === 'string' && selectedEl.style.textTransform === 'uppercase'}
                            onClick={() => patchSelected(el => {
                              const style = { ...el.style }
                              if (style.textTransform === 'uppercase') delete style.textTransform
                              else style.textTransform = 'uppercase'
                              return { ...el, style }
                            })}
                          >
                            <span className="text-[11px] font-semibold px-0.5">AA</span>
                          </ToolBtn>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Espaciado (px)">
                            <NumInput
                              value={numFromStyle(selectedEl.style.letterSpacing)}
                              step={1}
                              onChange={v => patchSelected(el => {
                                const style = { ...el.style }
                                if (v === undefined) delete style.letterSpacing
                                else style.letterSpacing = v + 'px'
                                return { ...el, style }
                              })}
                            />
                          </Field>
                          <Field label="Altura línea">
                            <NumInput
                              value={numFromStyle(selectedEl.style.lineHeight)}
                              step={0.05}
                              min={0.8}
                              max={3}
                              onChange={v => patchSelected(el => {
                                const style = { ...el.style }
                                if (v === undefined) delete style.lineHeight
                                else style.lineHeight = Math.round(v * 100) / 100
                                return { ...el, style }
                              })}
                            />
                          </Field>
                        </div>
                        <Field label="Alineación">
                          <SelectInput
                            value={typeof selectedEl.style.textAlign === 'string' ? selectedEl.style.textAlign : 'left'}
                            onChange={v => patchSelected(el => ({ ...el, style: { ...el.style, textAlign: v } }))}
                            options={[
                              { value: 'left', label: 'Izquierda' },
                              { value: 'center', label: 'Centro' },
                              { value: 'right', label: 'Derecha' },
                            ]}
                          />
                        </Field>
                      </>
                    )}
                  </>
                )}

                {(selectedEl.type === 'shape' || selectedEl.type === 'line' || selectedEl.type === 'badge' || selectedEl.type === 'image') && (
                  <>
                    {(selectedEl.type === 'shape' || selectedEl.type === 'line') && (
                      <>
                        <Field label="Fondo / color">
                          <ColorField
                            value={typeof selectedEl.style.background === 'string' ? selectedEl.style.background : ''}
                            onChange={v => patchSelected(el => {
                              const style = { ...el.style }
                              if (v) style.background = v
                              else delete style.background
                              return { ...el, style }
                            })}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Borde (px)">
                            <NumInput
                              value={numFromStyle(selectedEl.style.borderWidth)}
                              min={0}
                              onChange={v => patchSelected(el => {
                                const style = { ...el.style }
                                const wpx = Math.max(0, Math.round(v ?? 0))
                                if (wpx > 0) {
                                  style.borderWidth = wpx
                                  style.borderStyle = 'solid'
                                  if (!style.borderColor) style.borderColor = '#7A1832'
                                } else {
                                  delete style.borderWidth
                                  delete style.borderStyle
                                }
                                return { ...el, style }
                              })}
                            />
                          </Field>
                          <Field label="Color del borde">
                            <ColorField
                              value={typeof selectedEl.style.borderColor === 'string' ? selectedEl.style.borderColor : ''}
                              onChange={v => patchSelected(el => {
                                const style = { ...el.style }
                                if (v) {
                                  style.borderColor = v
                                  if (!style.borderWidth) { style.borderWidth = 4; style.borderStyle = 'solid' }
                                } else {
                                  delete style.borderColor
                                }
                                return { ...el, style }
                              })}
                            />
                          </Field>
                        </div>
                      </>
                    )}
                    {selectedEl.type === 'badge' && (
                      <Field label="Fondo del badge">
                        <ColorField
                          value={typeof selectedEl.style.background === 'string' ? selectedEl.style.background : ''}
                          onChange={v => patchSelected(el => {
                            const style = { ...el.style }
                            if (v) style.background = v
                            else delete style.background
                            return { ...el, style }
                          })}
                        />
                      </Field>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Redondeo (px)">
                        <NumInput
                          value={numFromStyle(selectedEl.style.borderRadius)}
                          min={0}
                          onChange={v => patchSelected(el => {
                            const style = { ...el.style }
                            if (v === undefined) delete style.borderRadius
                            else style.borderRadius = Math.max(0, Math.round(v))
                            return { ...el, style }
                          })}
                        />
                      </Field>
                      {selectedEl.type === 'badge' && (
                        <>
                          <Field label="Padding izq.">
                            <NumInput
                              value={numFromStyle(selectedEl.style.paddingLeft)}
                              min={0}
                              onChange={v => patchSelected(el => {
                                const style = { ...el.style }
                                if (v === undefined) delete style.paddingLeft
                                else style.paddingLeft = Math.max(0, Math.round(v))
                                return { ...el, style }
                              })}
                            />
                          </Field>
                          <Field label="Padding sup.">
                            <NumInput
                              value={numFromStyle(selectedEl.style.paddingTop)}
                              min={0}
                              onChange={v => patchSelected(el => {
                                const style = { ...el.style }
                                if (v === undefined) delete style.paddingTop
                                else style.paddingTop = Math.max(0, Math.round(v))
                                return { ...el, style }
                              })}
                            />
                          </Field>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Constraints + IA (solo contenido de texto) */}
                {isTextContent && (
                  <>
                    <p className={PANEL_TITLE + ' pt-2 border-t border-soft'}>Límites &amp; IA</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Máx. caracteres">
                        <NumInput
                          value={selectedEl.constraints?.maxLength}
                          min={1}
                          placeholder="Sin límite"
                          onChange={v => patchSelected(el => {
                            const c = { ...(el.constraints ?? {}) }
                            if (v === undefined) delete c.maxLength
                            else c.maxLength = Math.max(1, Math.round(v))
                            const out = { ...el }
                            if (Object.keys(c).length > 0) out.constraints = c
                            else delete out.constraints
                            return out
                          })}
                        />
                      </Field>
                      <Field label="Máx. líneas">
                        <NumInput
                          value={selectedEl.constraints?.maxLines}
                          min={1}
                          placeholder="Sin límite"
                          onChange={v => patchSelected(el => {
                            const c = { ...(el.constraints ?? {}) }
                            if (v === undefined) delete c.maxLines
                            else c.maxLines = Math.max(1, Math.round(v))
                            const out = { ...el }
                            if (Object.keys(c).length > 0) out.constraints = c
                            else delete out.constraints
                            return out
                          })}
                        />
                      </Field>
                    </div>
                    <Field label="Propósito IA">
                      <SelectInput
                        value={selectedEl.aiConfig?.purpose ?? ''}
                        onChange={v => patchSelected(el => {
                          const ai = { ...(el.aiConfig ?? {}) }
                          if (v === '') delete ai.purpose
                          else ai.purpose = v as StoryAiPurpose
                          const out = { ...el }
                          if (ai.purpose || (ai.hints && ai.hints.length > 0)) out.aiConfig = ai
                          else delete out.aiConfig
                          return out
                        })}
                        options={AI_PURPOSE_OPTIONS}
                      />
                    </Field>
                    <Field label="Pistas IA (una por línea)">
                      <TextAreaField
                        rows={3}
                        value={(selectedEl.aiConfig?.hints ?? []).join('\n')}
                        onChange={v => patchSelected(el => {
                          const hints = v.split('\n').map(s => s.trim()).filter(Boolean)
                          const ai = { ...(el.aiConfig ?? {}) }
                          if (hints.length > 0) ai.hints = hints
                          else delete ai.hints
                          const out = { ...el }
                          if (ai.purpose || (ai.hints && ai.hints.length > 0)) out.aiConfig = ai
                          else delete out.aiConfig
                          return out
                        })}
                        placeholder="Menciona el servicio protagonista…"
                      />
                    </Field>
                  </>
                )}
              </>
            )}
          </section>
        </aside>
      </div>

      {/* Vista como usuaria: overlay full-screen con el MISMO render y los
          gates reales (fixed no tocable, editables/reemplazables marcados). */}
      {previewMode && slides.length > 0 && (
        <PreviewOverlay slides={slides} initialId={activePageId} onClose={() => setPreviewMode(false)} />
      )}
    </div>
  )
}

/* ── Vista como usuaria (preview del builder) ─────────────────────────────── */

function PreviewOverlay({ slides, initialId, onClose }: { slides: StoryDesignSlide[]; initialId: string; onClose: () => void }) {
  const [currentId, setCurrentId] = useState(initialId || slides[0]?.id || '')
  const current = slides.find(s => s.id === currentId) ?? slides[0]
  const [vw] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth))
  const [vh] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight))
  const scale = Math.max(0.05, Math.min((vw - 240) / CANVAS_W, (vh - 150) / CANVAS_H))
  const touchables = current ? current.elements.filter(e => e.visible !== false) : []
  const editables = touchables.filter(e => (e.type === 'text' || e.type === 'badge') && isEditableElement(e)).length
  const fotos = touchables.filter(e => e.type === 'image' && (e.userPermissions ? hasUserPerm(e, 'replace') : e.role === 'replaceable')).length
  const fijas = touchables.length - editables - fotos
  return (
    <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: 'var(--color-warm-gray)' }}>
      <header className="h-14 flex items-center gap-3 px-4 border-b border-soft bg-cream flex-shrink-0">
        <Button size="sm" variant="ghost" icon={<ArrowLeft size={14} />} onClick={onClose}>
          Volver al editor
        </Button>
        <p className="text-sm font-bold text-cherry-dark">Vista como usuaria</p>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-cherry-dark">
          <span className="px-2 py-1 rounded-full" style={{ background: 'var(--color-buttermilk)' }}>{editables} editables</span>
          <span className="px-2 py-1 rounded-full" style={{ background: 'var(--color-buttermilk)' }}>{fotos} fotos reemplazables</span>
          <span className="px-2 py-1 rounded-full" style={{ background: 'var(--color-warm-gray)' }}>{fijas} fijas</span>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto py-2">
        {current ? <SlideCanvas key={current.id} slide={current} scale={scale} /> : null}
      </div>
      <footer className="flex items-center justify-center gap-2 py-3 border-t border-soft bg-cream flex-shrink-0 flex-wrap px-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentId(s.id)}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold text-cherry-dark border border-soft transition-colors"
            style={{
              background: s.id === currentId ? 'var(--color-buttermilk)' : 'var(--color-warm-gray)',
              outline: s.id === currentId ? '1.5px solid var(--color-cherry)' : 'none',
            }}
          >
            {s.name || `Página ${i + 1}`}
          </button>
        ))}
      </footer>
    </div>
  )
}