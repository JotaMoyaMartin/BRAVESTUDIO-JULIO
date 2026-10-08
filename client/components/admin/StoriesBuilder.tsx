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
import type { CSSProperties, ReactNode } from 'react'
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
  Square,
  Minus,
  Sparkles,
  Sticker as StickerIcon,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import SlideCanvas, { CANVAS_W, CANVAS_H } from '@/app/(app)/stories-diseno/SlideCanvas'
import { STORY_ICONS } from '@/lib/stories-diseno/icons'
import {
  screenToCanvas,
  boxFor,
  applyMove,
  applyResize,
  applyRotate,
} from '@/lib/stories-diseno/transform'
import type { Corner } from '@/lib/stories-diseno/transform'
import type {
  StoryAiPurpose,
  StoryAssetType,
  StoryDesignElement,
  StoryDesignSlide,
  StoryElementConstraints,
  StoryElementRole,
  StoryElementType,
  StorySlideLayoutType,
  StorySlidePurpose,
} from '@/lib/stories-diseno/types'

/* ── Constantes ──────────────────────────────────────────────────────────── */

/** Fondo por defecto = cream de la app (valor como DATO del slide: se exporta a PNG fuera de la app). */
const DEFAULT_BG = '#FFFDF5'

const ALL_TYPES: readonly StoryElementType[] = ['text', 'image', 'shape', 'line', 'badge', 'icon', 'background', 'sticker']
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
}

type ElementKind = Exclude<StoryElementType, 'background'>
const ADD_PRESETS: { kind: ElementKind; label: string; icon: ReactNode }[] = [
  { kind: 'text', label: 'Texto', icon: <Type size={13} /> },
  { kind: 'badge', label: 'Badge', icon: <Tag size={13} /> },
  { kind: 'image', label: 'Foto', icon: <ImagePlus size={13} /> },
  { kind: 'shape', label: 'Forma', icon: <Square size={13} /> },
  { kind: 'line', label: 'Línea', icon: <Minus size={13} /> },
  { kind: 'icon', label: 'Icono', icon: <Sparkles size={13} /> },
  { kind: 'sticker', label: 'Sticker', icon: <StickerIcon size={13} /> },
]

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

/** Valor numérico de un estilo que puede llegar como string CSS ('-2px', '1.3'). */
function numFromStyle(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

/* ── Parseo robusto de los slides de la DB ───────────────────────────────── */

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
    locked: o.locked === true,
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
  if (e.frame) out.frame = e.frame
  if (e.locked !== undefined) out.locked = e.locked
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

/* ── Presets de "Añadir" ─────────────────────────────────────────────────── */

function preset(kind: ElementKind, id: string): StoryDesignElement {
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
        style: { borderRadius: 28, background: 'rgba(42,11,18,0.08)' },
        content: '', placeholder: 'Hueco de foto',
      }
    case 'shape':
      return {
        id, type: 'shape', role: 'decorative',
        position: { x: 390, y: 810 }, size: { w: 300, h: 300 },
        style: { background: 'rgba(122,24,50,0.10)' },
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

/* ── Interacción del plano de transformación ─────────────────────────────── */

type InteractionMode = 'move' | 'resize' | 'rotate'
interface Interaction {
  mode: InteractionMode
  pageId: string
  id: string
  startEl: StoryDesignElement
  startX: number
  startY: number
  corner?: Corner
  origin?: { x: number; y: number }
}

const CORNER_CURSORS: Record<Corner, string> = { nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize' }

function cornerStyle(c: Corner): CSSProperties {
  return {
    position: 'absolute',
    width: 12,
    height: 12,
    left: c === 'nw' || c === 'sw' ? -6 : undefined,
    right: c === 'ne' || c === 'se' ? -6 : undefined,
    top: c === 'nw' || c === 'ne' ? -6 : undefined,
    bottom: c === 'sw' || c === 'se' ? -6 : undefined,
    cursor: CORNER_CURSORS[c],
    touchAction: 'none',
  }
}

/* ── Props ───────────────────────────────────────────────────────────────── */

export interface StoriesBuilderProps {
  templateId: string
  title: string
  initialSlides: unknown[]
  onClose: () => void
  onSaved?: (slides: StoryDesignSlide[]) => void
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

function BuilderWorkspace({ templateId, title, initialSlides, onClose, onSaved }: StoriesBuilderProps) {
  const toast = useToast()
  const [slides, setSlides] = useState<StoryDesignSlide[]>(() =>
    parseSlidesLoose(Array.isArray(initialSlides) ? initialSlides : [], templateId)
  )
  const [activePageId, setActivePageId] = useState(() => slides[0]?.id ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [scale, setScale] = useState(0.2)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const scaleRef = useRef(scale)
  const dragRef = useRef<Interaction | null>(null)

  const activeIdx = slides.findIndex(s => s.id === activePageId)
  const activeSlide = activeIdx >= 0 ? slides[activeIdx] : null
  const selectedEl = activeSlide?.elements.find(e => e.id === selectedId) ?? null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  /* Escala del lienzo por tamaño disponible del stage */
  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const update = () => {
      const rect = node.getBoundingClientRect()
      const s = Math.min(0.5, (rect.width - 24) / CANVAS_W, (rect.height - 24) / CANVAS_H)
      setScale(Math.max(0.02, s))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { scaleRef.current = scale }, [scale])

  /* Mutadores */
  const mutateElement = useCallback((pageId: string, elId: string, fn: (el: StoryDesignElement) => StoryDesignElement) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== pageId) return s
      return { ...s, elements: s.elements.map(e => (e.id === elId ? fn(e) : e)) }
    }))
    setDirty(true)
  }, [])

  function patchSlide(pageId: string, patch: Partial<StoryDesignSlide>) {
    setSlides(prev => prev.map(s => (s.id === pageId ? { ...s, ...patch } : s)))
    setDirty(true)
  }

  function patchSelected(fn: (el: StoryDesignElement) => StoryDesignElement) {
    if (!activeSlide || !selectedId) return
    mutateElement(activeSlide.id, selectedId, fn)
  }

  /* Drag move/resize/rotate — listeners de window, deltas vía screenToCanvas */
  const onWindowPointerMove = useCallback((ev: PointerEvent) => {
    const st = dragRef.current
    if (!st) return
    ev.preventDefault()
    const { dx, dy } = screenToCanvas(ev.clientX - st.startX, ev.clientY - st.startY, scaleRef.current)
    if (st.mode === 'move') {
      mutateElement(st.pageId, st.id, () => applyMove(st.startEl, dx, dy))
    } else if (st.mode === 'resize') {
      const keepRatio = st.startEl.type === 'image' || st.startEl.type === 'sticker' || st.startEl.type === 'icon'
      mutateElement(st.pageId, st.id, () => applyResize(st.startEl, st.corner ?? 'se', dx, dy, { keepRatio, minSize: MIN_SIZE }))
    } else if (st.origin) {
      const origin = st.origin
      mutateElement(st.pageId, st.id, () => applyRotate(st.startEl, ev.clientX, ev.clientY, origin))
    }
  }, [mutateElement])

  const endWindowInteraction = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', endWindowInteraction)
  }, [onWindowPointerMove])

  useEffect(() => {
    return () => {
      if (dragRef.current) endWindowInteraction()
    }
  }, [endWindowInteraction])

  function beginInteraction(ev: React.PointerEvent, st: Interaction) {
    ev.preventDefault()
    ev.stopPropagation()
    dragRef.current = st
    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', endWindowInteraction)
  }

  function startMove(ev: React.PointerEvent) {
    if (!selectedEl || !activeSlide) return
    beginInteraction(ev, {
      mode: 'move', pageId: activeSlide.id, id: selectedEl.id, startEl: selectedEl,
      startX: ev.clientX, startY: ev.clientY,
    })
  }

  function startResize(ev: React.PointerEvent, corner: Corner) {
    if (!selectedEl || !activeSlide) return
    beginInteraction(ev, {
      mode: 'resize', pageId: activeSlide.id, id: selectedEl.id, startEl: selectedEl, corner,
      startX: ev.clientX, startY: ev.clientY,
    })
  }

  function startRotate(ev: React.PointerEvent) {
    if (!selectedEl || !activeSlide) return
    const rect = canvasWrapRef.current?.getBoundingClientRect()
    const origin = rect
      ? {
          x: rect.left + (selectedEl.position.x + selectedEl.size.w / 2) * scaleRef.current,
          y: rect.top + (selectedEl.position.y + selectedEl.size.h / 2) * scaleRef.current,
        }
      : { x: ev.clientX, y: ev.clientY }
    beginInteraction(ev, {
      mode: 'rotate', pageId: activeSlide.id, id: selectedEl.id, startEl: selectedEl, origin,
      startX: ev.clientX, startY: ev.clientY,
    })
  }

  /* Páginas */
  function selectPage(id: string) {
    setActivePageId(id)
    setSelectedId(null)
  }

  function addPage() {
    const page: StoryDesignSlide = {
      id: uid('pg'), templateId, order: slides.length + 1,
      background: DEFAULT_BG, layoutType: 'text-only', elements: [],
    }
    setSlides(prev => reindex([...prev, page]))
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

  function addElement(kind: ElementKind) {
    if (!activeSlide) return
    // Garantiza zIndex en TODA la página (mismo orden visual) y pone el nuevo encima.
    const els = ensureZIndexes(activeSlide.elements)
    const maxZ = els.length > 0 ? Math.max(...els.map(e => e.zIndex ?? 0)) : -1
    const el: StoryDesignElement = { ...preset(kind, uid('el')), zIndex: maxZ + 1 }
    patchSlide(activeSlide.id, { elements: [...els, el] })
    setSelectedId(el.id)
  }

  function removeElement(elId: string) {
    if (!activeSlide) return
    patchSlide(activeSlide.id, { elements: activeSlide.elements.filter(e => e.id !== elId) })
    if (selectedId === elId) setSelectedId(null)
  }

  function toggleElementVisible(elId: string) {
    if (!activeSlide) return
    mutateElement(activeSlide.id, elId, el => ({ ...el, visible: el.visible === false }))
  }

  function toggleElementLocked(elId: string) {
    if (!activeSlide) return
    mutateElement(activeSlide.id, elId, el => ({ ...el, locked: !el.locked }))
  }

  /* Guardar (única persistencia) */
  async function save() {
    const list = slides
    setSaving(true)
    setError('')
    try {
      await api(`/api/stories-diseno/admin/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: serializeSlides(list) }),
      })
      setDirty(false)
      onSaved?.(list)
      toast.show('Plantilla guardada', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error guardando'
      setError(msg)
      toast.show('No se pudo guardar la plantilla', 'info')
    } finally {
      setSaving(false)
    }
  }

  function tryClose() {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir de todas formas?')) return
    onClose()
  }

  const layerItems = activeSlide ? layerList(activeSlide) : []
  const box = selectedEl ? boxFor(selectedEl, scale) : null
  const isTextContent = selectedEl?.type === 'text' || selectedEl?.type === 'badge'

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
        <div className="ml-auto flex items-center gap-3 min-w-0">
          {error && <span className="text-[11px] text-danger truncate max-w-[280px]">{error}</span>}
          <Button size="sm" loading={saving} onClick={save} icon={saving ? undefined : <Save size={14} />}>
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
                        background: el.id === selectedId ? 'var(--color-buttermilk)' : 'var(--color-warm-gray)',
                        outline: el.id === selectedId ? '1.5px solid var(--color-cherry)' : 'none',
                        opacity: el.visible === false ? 0.55 : 1,
                      }}
                    >
                      <button
                        onClick={() => setSelectedId(el.id)}
                        className="flex-1 min-w-0 text-left"
                        title="Seleccionar capa"
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
                        title={el.locked ? 'Desbloquear' : 'Bloquear'}
                        aria-label="Bloqueo de la capa"
                      >
                        {el.locked ? <Lock size={12} /> : <LockOpen size={12} />}
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

          {/* Añadir elementos */}
          <div className="px-3 py-2.5 border-t border-soft flex-shrink-0">
            <p className={PANEL_TITLE + ' mb-1.5'}>Añadir</p>
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
        <main className="relative flex-1 min-w-0 bg-warm-gray">
          <div ref={stageRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {activeSlide ? (
              <div
                ref={canvasWrapRef}
                className="relative shadow-strong"
                style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}
              >
                <SlideCanvas key={activeSlide.id} slide={activeSlide} scale={scale} />
                {/* Plano de transformación (solo el elemento seleccionado) */}
                <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                  {selectedEl && box && (
                    <div
                      onPointerDown={startMove}
                      style={{
                        position: 'absolute',
                        left: box.left,
                        top: box.top,
                        width: box.width,
                        height: box.height,
                        transform: `rotate(${box.rotation}deg)`,
                        border: '1.5px dashed var(--color-cherry)',
                        pointerEvents: 'auto',
                        cursor: 'move',
                        touchAction: 'none',
                      }}
                    >
                      {/* Asa de rotación (arriba, centro) */}
                      <div
                        className="bg-cherry"
                        style={{ position: 'absolute', left: '50%', top: -18, width: 1.5, height: 14, marginLeft: -0.75 }}
                      />
                      <div
                        onPointerDown={startRotate}
                        className="rounded-full bg-cherry border-2 border-white"
                        style={{ position: 'absolute', left: '50%', top: -24, width: 12, height: 12, marginLeft: -6, cursor: 'grab', touchAction: 'none' }}
                        aria-label="Rotar"
                      />
                      {/* Asas de esquina (resize) */}
                      {(['nw', 'ne', 'sw', 'se'] as const).map(corner => (
                        <div
                          key={corner}
                          onPointerDown={ev => startResize(ev, corner)}
                          className="bg-cherry border-2 border-white rounded-[3px]"
                          style={cornerStyle(corner)}
                          aria-label="Redimensionar"
                        />
                      ))}
                    </div>
                  )}
                </div>
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
                    label="Bloqueada"
                    checked={selectedEl.locked === true}
                    onChange={() => toggleElementLocked(selectedEl.id)}
                  />
                  <CheckField
                    label="Visible"
                    checked={selectedEl.visible !== false}
                    onChange={() => toggleElementVisible(selectedEl.id)}
                  />
                </div>

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
                    <Field label="URL foto muestra">
                      <TextInput
                        value={selectedEl.content ?? ''}
                        onChange={v => patchSelected(el => ({ ...el, content: v }))}
                        placeholder="https://…"
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
                  <Field label="Símbolo / emoji">
                    <TextInput
                      value={selectedEl.content ?? ''}
                      onChange={v => patchSelected(el => ({ ...el, content: v }))}
                      placeholder="✨"
                    />
                  </Field>
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
    </div>
  )
}