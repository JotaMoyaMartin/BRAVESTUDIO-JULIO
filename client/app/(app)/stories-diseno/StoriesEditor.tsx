'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download,
  Image as ImageIcon, Layers, Maximize2, Move,
  Palette, Pencil, RotateCcw, Sparkles, Wand2, X,
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

import SlideCanvas, { CANVAS_W, CANVAS_H } from './SlideCanvas'
import { CatalogTemplate, TextKind } from './StoriesDisenoCatalog'
import {
  StoryDesignElement, StoryDesignSlide, StoryBrandTokens, StoryPhotoFrame,
  elementAdminLocked, elementMaxLength, hasUserPerm,
} from '@/lib/stories-diseno/types'
import { STORY_FONTS } from '@/lib/stories-diseno/fonts'
import { clampFrame, boxFor, frameFromPan } from '@/lib/stories-diseno/transform'
import {
  adaptSequenceWithAI, RewriteMode, rewriteWithAI, clampLines,
} from '@/lib/ai/prompts/stories-design'
import { BrandFullContextInput } from '@/lib/ai/brand-context'

/**
 * EDITOR DE USUARIA (full-screen 3 paneles desktop / mobile-first móvil).
 * Simple por diseño: solo objetos con role editable/ai/replaceable/brand y
 * solo dentro de constraints. La plantilla es intactable; los cambios viven
 * en sesión (export antes de salir).
 */

const EXPORT_RATIO = CANVAS_W / 320

const AI_MODES: { mode: RewriteMode; label: string }[] = [
  { mode: 'short', label: 'Más corto' },
  { mode: 'direct', label: 'Más directo' },
  { mode: 'elegant', label: 'Más elegante' },
  { mode: 'selling', label: 'Más vendedor' },
  { mode: 'educational', label: 'Más educativo' },
]

interface Props {
  template: CatalogTemplate
  packTitle: string
  brand: BrandFullContextInput | null
  hasBrand: boolean
  onClose: () => void
}

export default function StoriesEditor({ template, packTitle, brand, hasBrand, onClose }: Props) {
  const toast = useToast()
  // ── estado ──
  const [idx, setIdx] = useState(0)
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(template.slides.map(s => [String(s.order), {}])))
  const [frames, setFrames] = useState<Record<string, StoryPhotoFrame>>({})
  // Posición de los elementos movidos por la usuaria (solo textos/badges)
  const [posEdits, setPosEdits] = useState<Record<string, { x: number; y: number }>>({})
  // Tipografía elegida por la usuaria por elemento (default = la del diseño)
  const [fontEdits, setFontEdits] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [aiBusy, setAiBusy] = useState<RewriteMode | 'seq' | null>(null)
  const [exportBusy, setExportBusy] = useState(false)
  const exportRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // canvas fit
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [stage, setStage] = useState({ w: 360, h: 620 })

  const slide: StoryDesignSlide = template.slides[Math.min(idx, template.slides.length - 1)]
  const contents = edits[String(slide.order)] ?? {}
  const selected = useMemo(
    () => slide.elements.find(e => e.id === selectedId && e.visible !== false) ?? null,
    [slide.elements, selectedId],
  )
  const brandTokens: StoryBrandTokens = {
    salon_name: brand?.salon_name || undefined,
    service: brand?.service_to_promote || undefined,
    ig: undefined,
  }

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const ro = new ResizeObserver(() => {
      const r = node.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setStage({ w: r.width, h: r.height })
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const isMobile = stage.w < 700
  const scale = isMobile
    ? Math.min((stage.w - 20) / CANVAS_W, Math.max(0.12, (stage.h - 16) / CANVAS_H))
    : Math.min(0.42, (stage.w - 24) / CANVAS_W, (stage.h - 24) / CANVAS_H)

  /* ── helpers de edición ── */
  const orderKey = String(slide.order)

  function setElement(el: StoryDesignElement, content: string) {
    setEdits(prev => ({ ...prev, [orderKey]: { ...(prev[orderKey] ?? {}), [el.id]: content } }))
  }

  function openElement(el: StoryDesignElement) {
    setSelectedId(el.id)
    setDraft(edits[orderKey]?.[el.id] ?? el.content ?? '')
  }

  /* ── mover elementos (drag + flechas) ── */

  /** ¿La usuaria puede mover este elemento? (permiso 'move' o fallback por rol) */
  const canMove = (el: StoryDesignElement): boolean =>
    !elementAdminLocked(el) &&
    (el.type === 'text' || el.type === 'badge') &&
    hasUserPerm(el, 'move')

  /** Foto: ¿reemplazable / reencuadrable / zoom? (permiso explícito o rol replaceable) */
  const canReplacePhoto = (el: StoryDesignElement): boolean =>
    !elementAdminLocked(el) && el.type === 'image' &&
    (el.userPermissions ? hasUserPerm(el, 'replace') : el.role === 'replaceable')
  const canRecropPhoto = (el: StoryDesignElement): boolean =>
    !elementAdminLocked(el) && el.type === 'image' &&
    (el.userPermissions ? hasUserPerm(el, 'recrop') : el.role === 'replaceable')
  const canZoomPhoto = (el: StoryDesignElement): boolean =>
    !elementAdminLocked(el) && el.type === 'image' &&
    (el.userPermissions ? hasUserPerm(el, 'zoom') : el.role === 'replaceable')

  /** Texto/badge que la usuaria puede escribir (permiso 'edit' o fallback por rol). */
  const canEditText = (el: StoryDesignElement): boolean =>
    !elementAdminLocked(el) &&
    (el.type === 'text' || el.type === 'badge') &&
    (el.userPermissions ? hasUserPerm(el, 'edit') : el.role === 'editable' || el.role === 'ai' || el.role === 'brand')

  const posOf = (el: StoryDesignElement) => posEdits[el.id] ?? el.position

  function clampPos(el: StoryDesignElement, x: number, y: number) {
    return {
      x: Math.round(Math.max(8, Math.min(CANVAS_W - el.size.w - 8, x))),
      y: Math.round(Math.max(8, Math.min(CANVAS_H - el.size.h - 8, y))),
    }
  }

  function nudge(el: StoryDesignElement, dx: number, dy: number) {
    const cur = posOf(el)
    setPosEdits(prev => ({ ...prev, [el.id]: clampPos(el, cur.x + dx, cur.y + dy) }))
  }

  /** Drag de la posición del elemento seleccionado (pointer capture en overlay). */
  function moveStart(el: StoryDesignElement, ev: React.PointerEvent) {
    ev.preventDefault()
    const startX = ev.clientX, startY = ev.clientY
    const start = posOf(el)
    let moved = false
    function onMove(e: PointerEvent) {
      moved = true
      const next = clampPos(el, start.x + (e.clientX - startX) / scale, start.y + (e.clientY - startY) / scale)
      setPosEdits(prev => ({ ...prev, [el.id]: next }))
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!moved) setSelectedId(null) // tap sin arrastre = deselecciona
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function saveEdit() {
    if (!selected) return
    const next = draft.trim().slice(0, elementMaxLength(selected))
    setElement(selected, next)
    setSelectedId(null)
  }

  /* ──IA ── */
  function kindOf(el: StoryDesignElement, slideIndex: number, total: number): TextKind {
    if (slideIndex === 0 && el.position.y < 800 && el.size.h >= 90) return 'gancho'
    if (slideIndex === total - 1 && el.position.y > 1000) return 'cierre'
    if (el.type === 'badge') return 'opcion'
    return 'cuerpo'
  }

  async function runAI(el: StoryDesignElement, mode?: RewriteMode) {
    setAiBusy(mode ?? 'direct')
    const out = await rewriteWithAI({
      text: draft || el.content || '',
      maxLength: elementMaxLength(el),
      maxLines: el.constraints?.maxLines,
      kind: kindOf(el, idx, template.slides.length),
      mode,
      purpose: el.aiConfig?.purpose,
      brand,
    })
    setAiBusy(null)
    if (out) {
      setDraft(clampLines(out, el.constraints?.maxLines).slice(0, elementMaxLength(el)))
      toast.show('He reescrito el texto para tu salón — revísalo y ajusta lo que quieras.', 'success')
    } else {
      toast.show('La IA no está disponible ahora. Ajusta el texto a mano — el esbozo ya sirve tal cual.', 'info')
    }
  }

  async function adaptSequence() {
    setAiBusy('seq')
    const payloads = template.slides.map((s, i) => ({
      index: i + 1,
      name: s.name ?? '',
      purpose: s.purpose ?? 'explain',
      slots: s.elements
        .filter(e => e.visible !== false && e.type === 'text' && canEditText(e))
        .map(e => ({
          id: e.id,
          text: edits[String(s.order)]?.[e.id] ?? e.content ?? '',
          maxLength: elementMaxLength(e),
          maxLines: e.constraints?.maxLines,
          kind: kindOf(e, i, template.slides.length),
          purpose: e.aiConfig?.purpose,
        })),
    })).filter(s => s.slots.length > 0)
    const result = payloads.length > 0 && await adaptSequenceWithAI({ templateTitle: template.title, slides: payloads, brand })
    setAiBusy(null)
    if (!result) {
      toast.show('La IA de secuencia no está disponible ahora. Prueba en un rato o edita a mano.', 'info')
      return
    }
    let applied = 0
    setEdits(prev => {
      const next = { ...prev }
      for (const [id, text] of Object.entries(result)) {
        const s = template.slides.find(sl => sl.elements.some(e => e.id === id))
        if (!s) continue
        const key = String(s.order)
        next[key] = { ...(next[key] ?? {}), [id]: text }
        applied++
      }
      return next
    })
    toast.show(`He adaptado los textos de la secuencia a tu salón (${applied} bloques) — revísalos antes de descargar.`, 'success')
  }

  /* ── fotos ── */
  function onPhotoPick(el: StoryDesignElement, file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setElement(el, String(reader.result))
      setFrames(prev => ({ ...prev, [el.id]: { zoom: 1, dx: 0, dy: 0 } }))
      setSelectedId(null)
      toast.show('Foto puesta. Puedes reencuadrarla tocándola y deslizando (y el zoom con el control).', 'success')
    }
    reader.readAsDataURL(file)
  }

  const frameOf = (el: StoryDesignElement) => frames[el.id] ?? el.frame ?? { zoom: 1, dx: 0, dy: 0 }
  const setFrame = (el: StoryDesignElement, f: StoryPhotoFrame) =>
    setFrames(prev => ({ ...prev, [el.id]: clampFrame(f) }))

  /** Pan de la foto seleccionada (pointer capture sobre la overlay del slot). */
  function panStart(el: StoryDesignElement, ev: React.PointerEvent) {
    ev.preventDefault()
    const startX = ev.clientX, startY = ev.clientY
    const start = frameOf(el)
    const box = boxFor(el, scale)
    let moved = false
    function onMove(e: PointerEvent) {
      moved = true
      const next = frameFromPan(start, (startX - e.clientX) / scale, (startY - e.clientY) / scale, box.width, box.height)
      setFrames(prev => ({ ...prev, [el.id]: next }))
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!moved) setSelectedId(null) // tap sin arrastre = deselecciona
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /* ── export ── */
  async function exportSlide(order: number) {
    const node = exportRefs.current[String(order)]
    if (!node) return null
    const { toPng } = await import('html-to-image')
    return toPng(node, { pixelRatio: EXPORT_RATIO, skipFonts: false })
  }

  function download(png: string, name: string) {
    const a = document.createElement('a')
    a.href = png
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function exportOne() {
    setExportBusy(true)
    try {
      const png = await exportSlide(slide.order)
      if (png) download(png, `brave-${template.slug}-${String(slide.order).padStart(2, '0')}.png`)
      toast.show('Historia exportada a PNG (1080×1920). Súbelas por orden a Instagram.', 'success')
    } catch {
      toast.show('No se pudo exportar la historia. Prueba de nuevo.', 'info')
    }
    setExportBusy(false)
  }

  async function exportAll() {
    setExportBusy(true)
    try {
      for (const s of template.slides) {
        const png = await exportSlide(s.order)
        if (png) download(png, `brave-${template.slug}-${String(s.order).padStart(2, '0')}.png`)
        await new Promise(r => setTimeout(r, 350))
      }
      toast.show(`Secuencia completa (${template.slides.length} historias) descargada. Súbelas por orden.`, 'success')
    } catch {
      toast.show('No se pudo terminar la exportación. Prueba de nuevo.', 'info')
    }
    setExportBusy(false)
  }

  /* ── panel de propiedades ── */
  const isPhoto = selected?.type === 'image'
  const isText = !!(selected && canEditText(selected))
  const movable = !!(selected && canMove(selected))

  const hasMaxLinesWarning = selected && selected.constraints?.maxLines
    ? draft.split('\n').length > selected.constraints.maxLines
    : false

  const panel = selected && (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-cherry-dark flex items-center gap-2">
          {isPhoto ? <ImageIcon size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
          {isPhoto ? 'Foto del hueco' : selected.role === 'ai' ? 'Texto que BRÄVE adapta con IA' : selected.role === 'editable' ? 'Texto editable' : 'Sin edición'}
        </p>
        <button type="button" onClick={() => setSelectedId(null)} aria-label="Cerrar" style={{ background: 'transparent', border: 'none' }}>
          <X size={16} className="text-cherry-dark opacity-60" />
        </button>
      </div>

      {isPhoto ? (
        <div className="space-y-3">
          {canZoomPhoto(selected) && frameOf(selected).zoom > 1.01 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-cherry-dark opacity-60 w-12">Zoom {frameOf(selected).zoom.toFixed(1)}×</span>
              <input
                type="range" min={1} max={3} step={0.1} value={frameOf(selected).zoom}
                onChange={(e) => setFrame(selected, { ...frameOf(selected), zoom: Number(e.target.value) })}
                className="flex-1 cursor-pointer" aria-label="Zoom de la foto"
              />
              <button type="button" onClick={() => setFrame(selected, { zoom: 1, dx: 0, dy: 0 })} className="text-cherry" title="Reencuadre original" aria-label="Reencuadre original">
                <RotateCcw size={14} />
              </button>
            </div>
          )}
          <p className="text-[11px] text-cherry-dark opacity-55 leading-snug">
            Arrastra la foto para reencuadrarla {frameOf(selected).zoom <= 1.01 && '(amplía con el zoom)'}.
          </p>
          {canReplacePhoto(selected) && (
            <div className="flex items-center gap-2">
              {selected.content && (
                <Button size="sm" variant="secondary" icon={<Maximize2 size={13} />} onClick={() => { setElement(selected, ''); setFrames(p => ({ ...p, [selected.id]: { zoom: 1, dx: 0, dy: 0 } })) }}>
                  Quitar foto
                </Button>
              )}
              <label className="inline-flex">
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={(e) => onPhotoPick(selected, e.target.files?.[0] ?? null)}
                />
                <span className="inline-flex items-center gap-2 text-[13px] font-bold cursor-pointer" style={{ color: 'var(--color-cherry)' }}>
                  <ImageIcon size={16} aria-hidden="true" /> {selected.content ? 'Cambiar foto' : 'Elegir foto'}
                </span>
              </label>
            </div>
          )}
        </div>
      ) : isText ? (
        <>
          {movable && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-cherry-dark flex items-center gap-1.5 opacity-70">
                <Move size={13} aria-hidden="true" /> Posición
              </span>
              <div className="flex items-center gap-1">
                {([['up', 0, -40], ['left', -40, 0], ['right', 40, 0], ['down', 0, 40]] as const).map(([dir, dx, dy]) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => nudge(selected, dx, dy)}
                    className="p-1.5 rounded-[var(--radius-sm)] bg-warm-gray text-cherry-dark"
                    aria-label={`Mover ${dir === 'up' ? 'arriba' : dir === 'down' ? 'abajo' : dir === 'left' ? 'a la izquierda' : 'a la derecha'}`}
                  >
                    {dir === 'up' ? <ChevronUp size={14} /> : dir === 'down' ? <ChevronDown size={14} /> : dir === 'left' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold text-cherry-dark opacity-70 mb-1">Tipografía</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setFontEdits(prev => { const n = { ...prev }; delete n[selected!.id]; return n })}
                className="px-2 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-semibold"
                style={{
                  background: fontEdits[selected!.id] ? 'var(--color-warm-gray)' : 'var(--color-buttermilk)',
                  outline: fontEdits[selected!.id] ? '1px solid rgba(122,24,50,0.08)' : '2px solid var(--color-cherry)',
                  color: 'var(--color-cherry-dark)',
                }}
              >
                Por defecto
              </button>
              {STORY_FONTS.map(f => {
                const active = fontEdits[selected!.id] === f.css
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFontEdits(prev => ({ ...prev, [selected!.id]: f.css }))}
                    className="px-2 py-1.5 rounded-[var(--radius-sm)] text-[13px] truncate"
                    style={{
                      background: active ? 'var(--color-buttermilk)' : 'var(--color-warm-gray)',
                      outline: active ? '2px solid var(--color-cherry)' : '1px solid rgba(122,24,50,0.08)',
                      color: 'var(--color-cherry-dark)',
                      fontFamily: f.css,
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, elementMaxLength(selected)))}
            rows={3}
            className="w-full text-[14px] p-3 rounded-[var(--radius-sm)] resize-none focus:outline-none"
            style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.15)', color: 'var(--color-ink)', fontFamily: 'inherit' }}
          />
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-cherry-dark opacity-55">
            <span>
              {draft.length}/{elementMaxLength(selected)}{selected.constraints?.maxLines ? ` · máx ${selected.constraints.maxLines} líneas` : ''}
              {hasMaxLinesWarning && <strong className="ml-1 opacity-90">{selected.constraints?.maxLines} líneas: recorta un poco</strong>}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AI_MODES.map(m => (
              <button
                key={m.mode}
                type="button"
                disabled={aiBusy !== null}
                onClick={() => runAI(selected, m.mode)}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold cursor-pointer disabled:opacity-40"
                style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', border: '1px solid rgba(122,24,50,0.08)' }}
              >
                {m.label}
              </button>
            ))}
            <button
              type="button"
              disabled={aiBusy !== null}
              onClick={() => runAI(selected)}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-bold cursor-pointer disabled:opacity-40 inline-flex items-center gap-1"
              style={{ background: 'rgba(122,24,50,0.08)', color: 'var(--color-cherry-dark)' }}
            >
              <Sparkles size={11} aria-hidden="true" /> {aiBusy && aiBusy !== 'seq' ? 'Pensando…' : 'Regenerar'}
            </button>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" onClick={saveEdit}>Guardar</Button>
          </div>
          {!hasBrand && (
            <p className="text-[11px] text-cherry-dark opacity-55 leading-snug">
              Completa tu <strong>Mi Marca</strong> para que la IA escriba con tu tono y servicios. El esbozo actual ya es utilizable.
            </p>
          )}
        </>
      ) : (
        <p className="text-[12px] text-cherry-dark opacity-55 leading-snug">
          Este elemento es parte del diseño fijado por BRÄVE — no se puede editar.
        </p>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-cream flex flex-col">
      {/* Toolbar superior */}
      <div className="flex items-center gap-2.5 px-3 sm:px-5 h-14 flex-shrink-0" style={{ borderBottom: '1px solid rgba(122,24,50,0.08)', background: 'var(--color-cream)' }}>
        <button type="button" onClick={onClose} className="text-[13px] font-bold text-cherry inline-flex items-center gap-1.5" style={{ background: 'none', border: 'none', padding: 0 }}>
          <ArrowLeft size={15} aria-hidden="true" /> <span className="hidden sm:inline">{packTitle}</span>
        </button>
        <p className="text-[13px] sm:text-[15px] font-extrabold text-cherry-dark truncate hidden sm:block">{template.title}</p>
        <span className="ml-auto text-[11px] font-semibold text-cherry-dark opacity-50 whitespace-nowrap hidden sm:inline">
          Story {idx + 1} de {template.slides.length} · 1080×1920
        </span>
        <Button size="sm" variant="secondary" icon={<Wand2 size={13} />} loading={aiBusy === 'seq'} disabled={aiBusy !== null} onClick={adaptSequence}>
          <span className="hidden sm:inline">Adaptar textos con IA</span><span className="sm:hidden">Adaptar IA</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Terminar y salir"><X size={14} /></Button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Panel izquierdo: páginas */}
        <div className="hidden md:flex w-24 flex-col items-center gap-2 py-4 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid rgba(122,24,50,0.08)' }}>
          {template.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setIdx(i); setSelectedId(null); setDraft('') }}
              className="rounded-[10px] overflow-hidden p-0 flex-shrink-0"
              style={{ outline: i === idx ? '3px solid var(--color-cherry)' : '1.5px solid rgba(122,24,50,0.14)', outlineOffset: 1, cursor: 'pointer' }}
              aria-label={`Story ${i + 1}`}
              aria-pressed={i === idx}
            >
              <MiniPage slide={s} edits={edits} width={64} posEdits={posEdits} fontEdits={fontEdits} />
            </button>
          ))}
          {template.slides.length > 1 && (
            <div className="flex items-center gap-1 mt-1 pt-2 text-[10px] font-bold text-cherry-dark opacity-50" style={{ borderTop: '1px solid rgba(122,24,50,0.08)' }}>
              <Layers size={10} /> {template.slides.length}
            </div>
          )}
        </div>

        {/* Centro: canvas */}
        <div ref={stageRef} className="flex-1 flex items-center justify-center min-h-0 px-2 py-3 overflow-hidden">
          <div style={{ position: 'relative' }} className="rounded-[36px]" >
            <div className="rounded-[32px] overflow-hidden" style={{ boxShadow: '0 30px 70px rgba(46,8,18,0.3)' }}>
              <SlideCanvas
                key={`${template.slug}-${slide.order}`}
                slide={slide}
                scale={scale}
                contents={contents}
                photoFrames={frames}
                brandTokens={brandTokens}
                positions={posEdits}
                fontOverrides={fontEdits}
                interactive
                selectedId={selectedId}
                onElementClick={(el) => { if (selectedId !== el.id) { openElement(el) } }}
              />
            </div>
            {/* Overlay de paneo para la foto seleccionada (encima del canvas, caja exacta) */}
            {selected?.type === 'image' && canRecropPhoto(selected) && (() => {
              const box = boxFor(selected, scale)
              return (
                <div
                  onPointerDown={(ev) => panStart(selected, ev)}
                  style={{
                    position: 'absolute',
                    left: box.left, top: box.top, width: box.width, height: box.height,
                    transform: `rotate(${box.rotation}deg)`,
                    borderRadius: 24,
                    cursor: 'grab', zIndex: 30,
                    outline: '2px dashed rgba(122,24,50,0.4)', outlineOffset: 3, pointerEvents: 'auto',
                    background: 'transparent',
                  }}
                  aria-label="Arrastra para reencuadrar"
                />
              )
            })()}
            {/* Overlay de movimiento para textos/badges seleccionados (arrastrar para reposicionar) */}
            {selected && canMove(selected) && (() => {
              const box = boxFor({ ...selected, position: posOf(selected) }, scale)
              return (
                <div
                  onPointerDown={(ev) => moveStart(selected, ev)}
                  style={{
                    position: 'absolute',
                    left: box.left, top: box.top, width: box.width, height: box.height,
                    transform: `rotate(${box.rotation}deg)`,
                    borderRadius: 24,
                    cursor: 'move', zIndex: 30,
                    outline: '2px dashed rgba(122,24,50,0.4)', outlineOffset: 3, pointerEvents: 'auto',
                    background: 'transparent',
                    touchAction: 'none',
                  }}
                  aria-label="Arrastra para mover"
                />
              )
            })()}
          </div>
        </div>

        {/* Panel derecho: propiedades (desktop) */}
        <div className="hidden md:block w-80 flex-shrink-0 overflow-y-auto p-4" style={{ borderLeft: '1px solid rgba(122,24,50,0.08)' }}>
          {panel ?? <EmptyPanel template={template} onAdapt={adaptSequence} adapting={aiBusy === 'seq'} />}
        </div>
      </div>

      {/* Barra inferior: navegación + descargas (desktop) */}
      {!isMobile && (
        <div className="flex items-center justify-center gap-2.5 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(122,24,50,0.08)' }}>
          <Button variant="primary" onClick={() => exportOne()} loading={exportBusy} icon={<Download size={14} />}>
            Descargar esta historia
          </Button>
          {template.slides.length > 1 && (
            <Button variant="secondary" onClick={() => exportAll()} loading={exportBusy} icon={<Download size={14} />}>
              Descargar las {template.slides.length}
            </Button>
          )}
          <p className="text-[11px] text-cherry-dark opacity-55 max-w-xs leading-snug text-center">
            Toca los textos o la foto para cambiarlos. Los cambios viven en esta sesión: descarga antes de salir.
          </p>
        </div>
      )}

      {/* Móvil: páginas en carrusel + panel como bottom sheet + toolbar inferior */}
      {isMobile && (
        <>
          <div className="flex gap-2 px-2 pb-2 overflow-x-auto flex-shrink-0" style={{ borderTop: '1px solid rgba(122,24,50,0.08)', paddingTop: 8 }}>
            {template.slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setIdx(i); setSelectedId(null); setDraft('') }}
                className="rounded-[8px] overflow-hidden flex-shrink-0"
                style={{ outline: i === idx ? '3px solid var(--color-cherry)' : '1.5px solid rgba(122,24,50,0.14)', outlineOffset: 1, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                aria-label={`Story ${i + 1}`}
              >
                <MiniPage slide={s} edits={edits} width={36} posEdits={posEdits} fontEdits={fontEdits} />
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 py-2 px-2 flex-shrink-0 overflow-x-auto" style={{ borderTop: '1px solid rgba(122,24,50,0.08)' }}>
            <Button size="sm" variant="primary" onClick={() => exportOne()} loading={exportBusy} icon={<Download size={13} />}>Esta</Button>
            <Button size="sm" variant="secondary" onClick={() => exportAll()} loading={exportBusy} icon={<Download size={13} />}>Descargar las {template.slides.length}</Button>
          </div>
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="fixed inset-x-0 bottom-0 z-[60]"
                style={{ maxHeight: '72vh', overflowY: 'auto' }}
              >
                <div className="rounded-t-[24px] p-4 pb-6" style={{ background: 'white', boxShadow: '0 -12px 40px rgba(42,11,18,0.25)' }}>
                  <div className="w-10 h-1.5 rounded-full mx-auto mb-3" style={{ background: 'rgba(42,11,18,0.15)' }} aria-hidden="true" />
                  {panel}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Slides ocultos para export — mismo tamaño (320) que el export ratio */}
      <div style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden="true">
        {template.slides.map(s => (
          <SlideCanvas
            key={`export-${s.order}`}
            slide={s}
            scale={320 / CANVAS_W}
            contents={edits[String(s.order)] ?? {}}
            photoFrames={frames}
            brandTokens={brandTokens}
            positions={posEdits}
            fontOverrides={fontEdits}
            frameRef={node => { exportRefs.current[String(s.order)] = node }}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Miniatura de página (panel izquierdo / carrusel móvil) ── */
function MiniPage({
  slide, edits, width, posEdits = {}, fontEdits = {},
}: {
  slide: StoryDesignSlide
  edits: Record<string, Record<string, string>>
  width: number
  posEdits?: Record<string, { x: number; y: number }>
  fontEdits?: Record<string, string>
}) {
  const scale = width / CANVAS_W
  return (
    <SlideCanvas
      slide={slide}
      scale={scale}
      contents={edits[String(slide.order)] ?? {}}
      positions={posEdits}
      fontOverrides={fontEdits}
    />
  )
}

function EmptyPanel({ template, onAdapt, adapting }: { template: CatalogTemplate; onAdapt: () => void; adapting: boolean }) {
  const aiCount = template.slides.reduce((n, s) => n + s.elements.filter(e => e.role === 'ai' && e.type === 'text').length, 0)
  return (
    <div className="space-y-4">
      <p className="text-[13px] font-bold text-cherry-dark flex items-center gap-2"><Palette size={14} aria-hidden="true" /> Plantilla "{template.title}"</p>
      <p className="text-[12px] text-cherry-dark opacity-65 leading-relaxed">
        Toca cualquier texto marcado en el canvas para editarlo, o la foto para reencuadrar y cambiarla.
      </p>
      {aiCount > 0 && (
        <div className="rounded-[var(--radius-sm)] p-3 space-y-2" style={{ background: 'var(--color-buttermilk)' }}>
          <p className="text-[12px] font-bold text-cherry-dark">{aiCount} textos listos para adaptar con IA</p>
          <Button size="sm" variant="secondary" loading={adapting} onClick={onAdapt} icon={<Wand2 size={13} />}>
            Adaptar textos con IA
          </Button>
          <p className="text-[10px] text-cherry-dark opacity-60 leading-snug">
            Reescribe toda la secuencia seguida (gancho → explicación → CTA) con tu salón.
          </p>
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] text-cherry-dark opacity-50">
        <Badge tone="buttermilk">{template.slides.length} stories</Badge>
        <Badge tone="cherry">{template.category}</Badge>
      </div>
    </div>
  )
}