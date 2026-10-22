'use client'
// LAB — Creador de carruseles y STORIES (13-oct-2026). Ruta aislada: no
// sustituye /carrusel ni /stories, no aparece en Sidebar, sin BD (draft en
// localStorage, una key por modo).
// PÁGINA ÚNICA, mobile first: generador IA (texto, dictado por
// voz y "Ver ideas" desplegable) → editor → cuadrícula.
// La versión stories (mode='story', 9:16) añade COPIAR el texto de cada slide
// para pegarlo en el editor nativo de Instagram.
// Toda la UI en la tipografía de la app (Poppins, --font-sans por defecto);
// solo el TEXTO del slide elige serif/sans (es contenido, no UI).
// Fórmula intacta: 1 foto + 1 bloque de texto por slide, nada más.
// La foto se ajusta moviendo el CONTENIDO (focal 0–1 + zoom) y el export usa
// la MISMA fórmula (photoDrawStyle) — preview, miniaturas y PNG idénticos.
// Tope de slides: MAX_SLIDES (10) — guard en lib + UI deshabilitada.

import { useEffect, useRef, useState } from 'react'
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Crop, Download, Grid2x2, ImageOff,
  ImagePlus, Mic, Plus, RotateCcw, Sparkles, Sun, Trash2, Type, X,
} from 'lucide-react'
import PhotoSourceBar from '@/components/editor/PhotoSourceBar'
import { useDictateText } from '@/lib/speech'
import {
  applySlidePos, addSlideToDraft, buildPrompt, clampZoom,
  clearDraft, createDraft, duplicateSlideInDraft, focalToPan,
  LAB_BASE_FONT_PX, LAB_FONT_LABELS, LAB_FONT_STEPS, LAB_STORAGE_KEY, LAB_STORY_STORAGE_KEY, LabDraft, LabMode,
  LabSlide, labCanvasSize, loadDraft, MAX_SLIDES, mockSlides, nearestZoomStep, panToFocal,
  parseSlidesResult, photoDrawStyle, removeSlideInDraft, saveDraft, SLIDE_COUNT_OPTIONS,
  TOPIC_IDEAS, ZOOM_STEPS,
} from '@/lib/lab/carousel'
import { drawLabSlide, labExportFileName, labFontCss, labTextColorHex, preloadLabImage } from './drawLabSlide'
import SlideThumb from './SlideThumb'

const SOFT_MAX = 80
const TOPIC_MAX = 300
const DRAG_TAP_PX = 6

type Tab = 'texto' | 'imagen'
type Layer = 'text' | 'image' | null

const zero = (n: number) => String(n).padStart(2, '0')

/** Etiqueta de cada fuente (el botón se muestra CON su propia tipografía). */
const FONT_LABELS: Record<LabSlide['font'], string> = {
  serif: 'Serif',
  sans: 'Sans',
  arial: 'Arial',
  poppins: 'Poppins',
  bebas: 'Bebas',
  archivo: 'Archivo',
  yellowtail: 'Firma',
}

/** Copys que cambian con el modo (mismo editor, distinta pieza). */
const LABELS = {
  carousel: {
    gen: 'Genera tu carrusel con IA',
    cta: 'Generar carrusel',
    topic: 'Tema del carrusel',
    replace: 'Generar de nuevo sustituye tu carrusel actual.',
    ready: 'Tu carrusel está listo ✨ Edítalo a tu gusto abajo.',
    editor: 'Editor del carrusel',
    gridHint: 'Visualiza tu carrusel completo. Toca una slide para editarla.',
    download: 'Descargar carrusel',
  },
  story: {
    gen: 'Genera tus stories con IA',
    cta: 'Generar stories',
    topic: 'Tema de tus stories',
    replace: 'Generar de nuevo sustituye tus stories actuales.',
    ready: 'Tus stories están listas ✨ Edítalas a tu gusto abajo.',
    editor: 'Editor de stories',
    gridHint: 'Visualiza tus stories completas. Toca una para editarla y copia su texto para pegarlo en Instagram.',
    download: 'Descargar stories',
  },
} as const

export default function LabCarouselEditor({
  mode = 'carousel',
  showWordmark = true,
  brandContext,
}: {
  mode?: LabMode
  /** En producto (/carrusel) el Sidebar pone la marca — wordmark solo en LAB. */
  showWordmark?: boolean
  /** Contexto de marca (buildBrandFullContext) para la generación IA. */
  brandContext?: string
}) {
  const size = labCanvasSize(mode)
  const STORAGE_KEY = mode === 'story' ? LAB_STORY_STORAGE_KEY : LAB_STORAGE_KEY
  const STORY = mode === 'story'
  const L = LABELS[mode]

  // ── Generador ────────────────────────────────────────────────────────────
  const [ideasOpen, setIdeasOpen] = useState(false)

  // ── Generación ───────────────────────────────────────────────────────────
  const [topic, setTopic] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [genState, setGenState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [genNote, setGenNote] = useState<string | null>(null)

  // ── Dictado por voz en el textarea (Web Speech API, ya testado) ──────────
  const dictate = useDictateText('es-ES')
  const [micNote, setMicNote] = useState<string | null>(null)
  const micGotRef = useRef(false) // ¿entró alguna frase en esta sesión?
  const wasListeningRef = useRef(false)
  useEffect(() => {
    // Al terminar (botón o error del navegador): si no llegó nada → nota.
    if (dictate.listening) {
      wasListeningRef.current = true
      return
    }
    if (!wasListeningRef.current) return
    wasListeningRef.current = false
    if (!micGotRef.current) {
      setMicNote('No captamos audio — comprueba los permisos e inténtalo de nuevo.')
    }
    micGotRef.current = false
  }, [dictate.listening])

  function toggleMic() {
    if (dictate.listening) {
      dictate.stop()
      return
    }
    setMicNote(null)
    micGotRef.current = false
    const ok = dictate.start(text => {
      micGotRef.current = true
      setMicNote(null)
      setTopic(prev => (prev ? `${prev} ${text}` : text).slice(0, TOPIC_MAX))
    })
    if (!ok) setMicNote('El dictado no está disponible en este navegador.')
  }

  // ── Copiar el bloque de texto (lleva el texto a IG pegándolo en su editor) ──
  function copySlideText(i = idx) {
    const t = draft?.slides[i]?.text.trim() ?? ''
    if (!t || copiedIdx === i) return
    const done = () => setCopiedIdx(i)
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done))
      return
    }
    fallbackCopy(t, done)
  }

  /** Fallback (browsers sin clipboard API / permiso denegado): textarea oculto. */
  function fallbackCopy(text: string, onDone: () => void) {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      onDone()
    } catch {
      // Portapapeles bloqueado: no mostramos confirmación falsa.
    }
  }

  // ── Draft (slides + fotos + estilos) ─────────────────────────────────────
  const [draft, setDraft] = useState<LabDraft | null>(null)
  const [idx, setIdx] = useState(0)
  const [readyNote, setReadyNote] = useState(false) // "Tu carrusel está listo ✨"

  // ── Editor visual ────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('texto')
  const [layer, setLayer] = useState<Layer>(null)
  const [editing, setEditing] = useState(false)
  const [gridOpen, setGridOpen] = useState(false)
  const [imgDead, setImgDead] = useState(false)
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [serifFamily, setSerifFamily] = useState('"DM Serif Display", serif')
  const [sansFamily, setSansFamily] = useState('Montserrat, sans-serif')
  const [poppinsFamily, setPoppinsFamily] = useState('Poppins, sans-serif')
  const serifProbeRef = useRef<HTMLSpanElement | null>(null)
  const sansProbeRef = useRef<HTMLSpanElement | null>(null)
  const poppinsProbeRef = useRef<HTMLSpanElement | null>(null)
  const editorRef = useRef<HTMLElement | null>(null)
  const pendingScrollRef = useRef(false)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const imgElRef = useRef<HTMLImageElement | null>(null)
  const textDragRef = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null)
  const photoDragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadedAll, setDownloadedAll] = useState(false)

  // Copiar el texto del slide activo (fallo silencioso solo si el SO bloquea).
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  useEffect(() => {
    if (copiedIdx === null) return
    const t = setTimeout(() => setCopiedIdx(null), 2400)
    return () => clearTimeout(t)
  }, [copiedIdx])

  // Draft de una sesión previa: restaurar sin saltar la página.
  useEffect(() => {
    const saved = loadDraft(STORAGE_KEY)
    if (saved) {
      setDraft(saved)
      setTopic(saved.topic)
      setSlideCount(saved.slideCount)
      setIdx(0)
    }
  }, [])

  // Probe de familias canvas (una vez): el DOM y el canvas comparten family.
  useEffect(() => {
    if (serifProbeRef.current) setSerifFamily(getComputedStyle(serifProbeRef.current).fontFamily)
    if (sansProbeRef.current) setSansFamily(getComputedStyle(sansProbeRef.current).fontFamily)
    if (poppinsProbeRef.current) setPoppinsFamily(getComputedStyle(poppinsProbeRef.current).fontFamily)
  }, [])

  // Foto del slide activo: precarga con CORS (firmadas manchan el canvas) y
  // guarda dims naturales — el encuadre focal/zoom necesita el tamaño real.
  const photoSrc = draft?.slides[idx]?.photoSrc ?? null
  useEffect(() => {
    let cancelled = false
    setImgDead(false)
    setImgDims(null)
    if (!photoSrc) {
      imgElRef.current = null
      return
    }
    preloadLabImage(photoSrc).then(img => {
      if (cancelled) return
      imgElRef.current = img
      setImgDims(img ? { w: img.naturalWidth, h: img.naturalHeight } : null)
      if (!img) setImgDead(true)
    })
    return () => {
      cancelled = true
    }
  }, [photoSrc])

  // Draft recién creado (generar): bajar al editor con scroll suave.
  useEffect(() => {
    if (pendingScrollRef.current && draft && editorRef.current) {
      pendingScrollRef.current = false
      const t = setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      return () => clearTimeout(t)
    }
  }, [draft])

  // "Tu carrusel está listo ✨" se disipa solo (también al moverse de slide).
  useEffect(() => {
    if (!readyNote) return
    const t = setTimeout(() => setReadyNote(false), 6000)
    return () => clearTimeout(t)
  }, [readyNote])

  // Confirmaciones (eliminar / empezar de nuevo): se deshacen solas a los 3s.
  useEffect(() => {
    if (!confirmingDelete && !confirmingReset) return
    const t = setTimeout(() => {
      setConfirmingDelete(false)
      setConfirmingReset(false)
    }, 3000)
    return () => clearTimeout(t)
  }, [confirmingDelete, confirmingReset])

  // Cambiar de slide suelta la edición (la selección pertenece al slide viejo).
  function goTo(i: number) {
    setEditing(false)
    setLayer(null)
    setGridOpen(false)
    setConfirmingDelete(false)
    setCopiedIdx(null)
    setReadyNote(false)
    setIdx(Math.max(0, Math.min((draft?.slides.length ?? 1) - 1, i)))
  }

  // ── Generación IA ────────────────────────────────────────────────────────
  async function generate() {
    const t = topic.trim()
    if (!t || genState === 'loading') return
    setGenState('loading')
    setGenNote(null)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt(t, slideCount, undefined, brandContext) }),
      })
      let texts: string[] | null = null
      if (res.ok) {
        const data = (await res.json()) as { content?: string }
        texts = data.content ? parseSlidesResult(data.content, slideCount) : null
      }
      let note: string | null = null
      if (!texts) {
        texts = mockSlides(t, slideCount)
        note = 'IA no disponible ahora — sigue con textos de ejemplo y edítalos en el editor.'
      }
      const next = createDraft(t, slideCount, texts)
      saveDraft(next, STORAGE_KEY)
      setDraft(next)
      setIdx(0)
      setEditing(false)
      setLayer(null)
      setTab('texto')
      setGenState('idle')
      setGenNote(note)
      setReadyNote(true)
      pendingScrollRef.current = true
    } catch {
      setGenState('error')
    }
  }

  function patchText(text: string) {
    updateSlide({ text })
  }

  function resetAll() {
    clearDraft(STORAGE_KEY)
    setDraft(null)
    setTopic('')
    setSlideCount(5)
    setIdx(0)
    setEditing(false)
    setLayer(null)
    setTab('texto')
    setGenNote(null)
    setReadyNote(false)
  }

  // ── Slide activo + helpers ───────────────────────────────────────────────
  function updateSlide(patch: Partial<LabSlide>, i = idx) {
    setDraft(d => {
      if (!d) return d
      if (i < 0 || i >= d.slides.length) return d
      const slides = d.slides.map((s, j) => (j === i ? { ...s, ...patch } : s))
      const next = { ...d, slides }
      saveDraft(next, STORAGE_KEY)
      return next
    })
  }

  const slide: LabSlide | null = draft?.slides[idx] ?? draft?.slides[0] ?? null

  function setFontStep(i: number) {
    updateSlide({ fontScale: LAB_FONT_STEPS[Math.max(0, Math.min(LAB_FONT_STEPS.length - 1, i))] })
  }

  function setZoomStep(i: number) {
    updateSlide({ zoom: clampZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, i))]) })
  }

  // ── Gestión de slides (tope MAX_SLIDES) ──────────────────────────────────
  const canAdd = !!draft && draft.slides.length < MAX_SLIDES

  function handleAdd() {
    if (!draft || !canAdd) return
    const next = addSlideToDraft(draft, idx)
    saveDraft(next, STORAGE_KEY)
    setDraft(next)
    setIdx(idx + 1)
    setEditing(false)
    setLayer(null)
    setConfirmingDelete(false)
  }

  function handleDuplicate() {
    if (!draft || draft.slides.length >= MAX_SLIDES) return
    const next = duplicateSlideInDraft(draft, idx)
    saveDraft(next, STORAGE_KEY)
    setDraft(next)
    setIdx(idx + 1)
    setEditing(false)
    setLayer(null)
    setConfirmingDelete(false)
  }

  function handleDelete() {
    if (!draft || draft.slides.length <= 1) return
    const hasContent = !!slide && (!!slide.text.trim() || !!slide.photoSrc)
    if (hasContent && !confirmingDelete) {
      setConfirmingDelete(true) // segunda pulsación elimina (auto-cancela 3s)
      return
    }
    const next = removeSlideInDraft(draft, idx)
    if (next) {
      saveDraft(next, STORAGE_KEY)
      setDraft(next)
      setIdx(Math.max(0, Math.min(idx, next.slides.length - 1)))
    }
    setConfirmingDelete(false)
  }

  // ── Export (canvas propio; preview y PNG comparten photoDrawStyle) ──────
  // Family RESUELTA para el canvas del export (Arial viene del SO y no requiere probe).
  function canvasFamilyOf(font: LabSlide['font']): string {
    switch (font) {
      case 'serif':
        return serifFamily
      case 'sans':
        return sansFamily
      case 'poppins':
        return poppinsFamily
      case 'arial':
        return 'Arial, Helvetica, sans-serif'
      default:
        return poppinsFamily // el carrusel no ofrece las fuentes de Stories
    }
  }

  async function exportSlide(i0: number): Promise<void> {
    if (!draft) return
    const s = draft.slides[i0]
    const img = await preloadLabImage(s.photoSrc)
    const canvas = document.createElement('canvas')
    drawLabSlide(canvas, {
      slide: s,
      imageEl: img,
      fontFamily: canvasFamilyOf(s.font),
      mode,
    })
    await new Promise<void>(resolve => {
      canvas.toBlob(blob => {
        if (blob) {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = labExportFileName(i0, draft.slides.length, mode)
          a.click()
          URL.revokeObjectURL(a.href)
        }
        resolve()
      }, 'image/png')
    })
  }

  async function exportAll() {
    if (downloadingAll || !draft) return
    setDownloadingAll(true)
    try {
      await document.fonts.ready
      for (let i = 0; i < draft.slides.length; i++) {
        await exportSlide(i)
        await new Promise(r => setTimeout(r, 350))
      }
      setDownloadedAll(true)
      setTimeout(() => setDownloadedAll(false), 2500)
    } finally {
      setDownloadingAll(false)
    }
  }

  // ── Drag del TEXTO (refs + Pointer Events, patrón Carrusel) ──────────────
  function canvasBox() {
    return canvasRef.current?.getBoundingClientRect() ?? null
  }

  function onTextPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (layer === 'image') return // en modo foto el texto no captura (pointer-events none)
    if (!slide) return
    textDragRef.current = { x: e.clientX, y: e.clientY, ox: slide.x, oy: slide.y, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }

  function onTextPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = textDragRef.current
    const box = canvasBox()
    if (!d || !box) return
    const dx = (e.clientX - d.x) / box.width
    const dy = (e.clientY - d.y) / box.height
    if (!d.moved && Math.hypot(dx * box.width, dy * box.height) < DRAG_TAP_PX) return
    d.moved = true
    updateSlide(applySlidePos(d.ox + dx, d.oy + dy))
  }

  function onTextPointerUp() {
    const d = textDragRef.current
    textDragRef.current = null
    if (d && !d.moved) {
      // Tap = modo texto + textarea del panel (focus).
      setLayer('text')
      setTab('texto')
      setEditing(true)
      setTimeout(() => textareaRef.current?.focus(), 30)
    }
  }

  // ── Drag de la FOTO (solo en modo Ajustar foto): mueve el CONTENIDO ──────
  function onCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (layer === 'image') {
      if (imgDims) {
        photoDragRef.current = { x: e.clientX, y: e.clientY, fx: slide?.focalX ?? 0.5, fy: slide?.focalY ?? 0.5 }
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      return
    }
    // Tocar la foto cuando el texto no está activo activa "Ajustar foto"
    // (la 2ª vía de entrada junto al botón del panel Imagen).
    setLayer('image')
    setTab('imagen')
    if (editing) setEditing(false)
  }

  function onCanvasPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = photoDragRef.current
    const box = canvasBox()
    if (!d || !box || !imgDims || !slide) return
    const z = clampZoom(slide.zoom)
    const s0 = Math.max(box.width / imgDims.w, box.height / imgDims.h)
    const drawW = imgDims.w * s0 * z
    const drawH = imgDims.h * s0 * z
    const maxX = Math.max(0, (drawW - box.width) / 2)
    const maxY = Math.max(0, (drawH - box.height) / 2)
    // 1:1 con el dedo: px de drag = px de pan dentro del rango válido.
    const panX = focalToPan(d.fx, maxX) + (e.clientX - d.x)
    const panY = focalToPan(d.fy, maxY) + (e.clientY - d.y)
    updateSlide({
      focalX: maxX > 0 ? panToFocal(panX, maxX) : slide.focalX,
      focalY: maxY > 0 ? panToFocal(panY, maxY) : slide.focalY,
    })
  }

  function onCanvasPointerUp() {
    photoDragRef.current = null
  }

  function positionQuick(y: number) {
    updateSlide(applySlidePos(0.5, y))
  }

  const snappedX = Math.abs((slide?.x ?? 0.5) - 0.5) < 0.004
  const snappedY = Math.abs((slide?.y ?? 0.5) - 0.5) < 0.004
  // Misma fórmula que el export: preview y PNG comparten encuadre (WYSIWYG).
  const photoStyle =
    slide && imgDims && slide.photoSrc ? photoDrawStyle(slide, imgDims.w, imgDims.h, size.w, size.h) : null
  const hasPhoto = !!slide?.photoSrc
  const zoomIdx = nearestZoomStep(slide?.zoom ?? 1)
  const total = draft?.slides.length ?? 0
  const canDelete = !!draft && total > 1
  const atCap = !!draft && total >= MAX_SLIDES

  return (
    <div className="min-h-dvh bg-cream" style={{ color: 'var(--color-cherry-dark)' }}>
      <span ref={serifProbeRef} style={{ fontFamily: 'var(--font-dmserif)', position: 'absolute', visibility: 'hidden' }}>Aa</span>
      <span ref={sansProbeRef} style={{ fontFamily: 'var(--font-montserrat)', position: 'absolute', visibility: 'hidden' }}>Aa</span>
      <span ref={poppinsProbeRef} style={{ fontFamily: 'var(--font-poppins)', position: 'absolute', visibility: 'hidden' }}>Aa</span>

      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 flex flex-col gap-6 lg:gap-8">
        {/* Wordmark — solo en LAB; en producto lo pone el Sidebar */}
        {showWordmark && (
          <div className="flex items-center justify-between">
            <p className="font-bold text-lg" style={{ color: 'var(--color-cherry)', letterSpacing: '-0.3px' }}>
              BRÄVE Studio
            </p>
          </div>
        )}

        {/* ── Generador con IA + dictado ── */}
        <section className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3" style={{ background: 'white', border: '1.5px solid rgba(89,20,39,0.07)' }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: 'var(--color-cherry)' }}>
              <Sparkles size={16} /> {L.gen}
            </h2>
            <span className="shrink-0 text-[10px]" style={{ color: topic.length > SOFT_MAX ? 'var(--color-danger)' : 'rgba(89,20,39,0.4)' }}>
              {topic.length}/{TOPIC_MAX}
            </span>
          </div>

          {/* Tema + micrófono (Web Speech API, estados: normal / escuchando / nota) */}
          <div className="relative">
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value.slice(0, TOPIC_MAX))}
              maxLength={TOPIC_MAX}
              placeholder={STORY ? 'Ej. tips de cuidado del color en casa' : 'Ej. cómo mantener un balayage bonito más tiempo'}
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ background: 'var(--color-warm-gray)', border: '1.5px solid rgba(89,20,39,0.1)', resize: 'none', paddingRight: dictate.supported ? 56 : 12 }}
              aria-label={L.topic}
            />
            {dictate.supported && (
              <button
                onClick={toggleMic}
                className="absolute flex h-11 w-11 items-center justify-center rounded-full transition-colors"
                style={{
                  bottom: 8,
                  right: 8,
                  background: dictate.listening ? 'var(--color-cherry)' : 'white',
                  border: dictate.listening ? 'none' : '1.5px solid rgba(89,20,39,0.15)',
                  boxShadow: '0 1px 4px rgba(89,20,39,0.15)',
                }}
                aria-label={dictate.listening ? 'Parar el dictado' : 'Dictar el tema'}
                aria-pressed={dictate.listening}
              >
                <Mic
                  size={17}
                  className={dictate.listening ? 'animate-pulse' : undefined}
                  style={{ color: dictate.listening ? 'white' : 'var(--color-cherry)' }}
                />
              </button>
            )}
            {(dictate.listening || micNote) && (
              <p className="text-[11px] font-semibold mt-1.5" style={{ color: dictate.listening ? 'var(--color-cherry)' : 'var(--color-danger)' }}>
                {dictate.listening ? 'Escuchando… di tu tema y toca de nuevo para finalizar.' : micNote}
              </p>
            )}
          </div>

          {/* "Ver ideas" — despliega la lista de temas peluquería */}
          <button
            onClick={() => setIdeasOpen(v => !v)}
            className="self-start flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-semibold transition-colors"
            style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}
            aria-expanded={ideasOpen}
          >
            Ver ideas
            <ChevronDown size={14} className={ideasOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {ideasOpen && (
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_IDEAS.map(idea => (
                <button
                  key={idea}
                  onClick={() => setTopic(idea)}
                  className="rounded-full px-3 py-2 text-xs font-semibold"
                  style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}
                >
                  {idea}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(89,20,39,0.5)' }}>Nº de slides</p>
            <div className="grid grid-cols-5 gap-1.5">
              {SLIDE_COUNT_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setSlideCount(n)}
                  className="py-2.5 rounded-lg text-sm font-bold"
                  style={{
                    background: slideCount === n ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                    color: slideCount === n ? 'white' : 'var(--color-cherry-dark)',
                  }}
                  aria-pressed={slideCount === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {genState === 'error' && (
            <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>
              No se pudo generar. Reintenta en unos segundos.
            </p>
          )}
          <button
            onClick={generate}
            disabled={!topic.trim() || genState === 'loading'}
            className="btn-primary w-full justify-center text-sm py-3.5"
            style={{ opacity: !topic.trim() || genState === 'loading' ? 0.6 : 1 }}
          >
            <Sparkles size={15} />
            {genState === 'loading' ? 'Generando…' : L.cta}
          </button>
          {draft && (
            <p className="text-center text-[11px]" style={{ color: 'rgba(89,20,39,0.5)' }}>
              {L.replace}
            </p>
          )}
        </section>

        {/* ── 5 · Editor del carrusel (cuando hay draft) ── */}
        {draft && slide && (
          <section ref={editorRef} className="flex scroll-mt-4 flex-col gap-3">
            {readyNote && (
              <p
                className="rounded-xl px-3.5 py-2.5 text-sm font-bold text-white"
                style={{ background: 'var(--color-cherry)' }}
                role="status"
              >
                {L.ready}
              </p>
            )}
            {genNote && (
              <p className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)' }}>
                {genNote}
              </p>
            )}

            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-extrabold" style={{ color: 'var(--color-cherry)' }}>
                {L.editor}
              </h2>
              <p className="text-xs" style={{ color: 'rgba(89,20,39,0.55)' }}>
                Toca una miniatura para moverte · personaliza cada slide y descarga.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)360px] items-start">
              {/* Columna canvas: ‹ [canvas] › + tira real + ver en cuadrícula */}
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goTo(idx - 1)}
                    disabled={idx === 0}
                    className="btn-ghost shrink-0 rounded-full p-2.5"
                    style={{ opacity: idx === 0 ? 0.3 : 1 }}
                    aria-label="Slide anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div
                    ref={canvasRef}
                    className="relative w-full min-w-0 overflow-hidden select-none touch-none"
                    style={{
                      aspectRatio: `${size.w} / ${size.h}`,
                      borderRadius: 14,
                      background: 'var(--color-warm-gray)',
                      containerType: 'inline-size',
                    }}
                    onPointerDown={onCanvasPointerDown}
                    onPointerMove={onCanvasPointerMove}
                    onPointerUp={onCanvasPointerUp}
                    onPointerCancel={onCanvasPointerUp}
                  >
                    {hasPhoto && photoStyle && !imgDead && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slide.photoSrc!}
                        alt=""
                        crossOrigin="anonymous"
                        className="absolute"
                        style={{
                          left: `${photoStyle.leftPct}%`,
                          top: `${photoStyle.topPct}%`,
                          width: `${photoStyle.widthPct}%`,
                          height: `${photoStyle.heightPct}%`,
                          maxWidth: 'none',
                          filter: slide.bw ? 'grayscale(1)' : undefined,
                        }}
                      />
                    )}
                    {(!hasPhoto || imgDead) && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#EAE0DA' }}>
                        <ImageOff size={22} style={{ color: 'rgba(89,20,39,0.35)' }} />
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${slide.overlay})` }} />

                    {/* Guías de tercios en modo Ajustar foto — composición a la vista */}
                    {layer === 'image' && (
                      <div className="pointer-events-none absolute inset-0">
                        <div className="absolute bottom-0 top-0 left-1/3 w-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
                        <div className="absolute bottom-0 top-0 left-2/3 w-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
                        <div className="absolute right-0 left-0 top-1/3 h-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
                        <div className="absolute right-0 left-0 top-2/3 h-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
                      </div>
                    )}
                    {snappedX && <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(255,255,255,0.55)' }} />}
                    {snappedY && <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(255,255,255,0.55)' }} />}

                    {/* Único bloque de texto: tap = editar · drag = mover */}
                    <div
                      onPointerDown={onTextPointerDown}
                      onPointerMove={onTextPointerMove}
                      onPointerUp={onTextPointerUp}
                      onPointerCancel={() => {
                        textDragRef.current = null
                      }}
                      className="absolute whitespace-pre-wrap"
                      style={{
                        left: `${slide.x * 100}%`,
                        top: `${slide.y * 100}%`,
                        width: '80%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        fontFamily: labFontCss(slide.font).family,
                        fontWeight: labFontCss(slide.font).weight,
                        fontSize: `${((LAB_BASE_FONT_PX[slide.font] * slide.fontScale) / (size.w / 100)).toFixed(2)}cqw`,
                        lineHeight: 1.3,
                        color: labTextColorHex(slide.color),
                        cursor: layer === 'text' ? 'text' : 'grab',
                        pointerEvents: layer === 'image' ? 'none' : 'auto',
                      }}
                    >
                      {slide.text || <span style={{ opacity: 0.55 }}>Toca aquí para escribir el título…</span>}
                    </div>

                    {/* Indicación de capa activa — texto OR foto, nunca ambas */}
                    {layer === 'text' && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${slide.x * 100}%`,
                          top: `${slide.y * 100}%`,
                          width: '80%',
                          transform: 'translate(-50%, -50%)',
                          border: '1.5px dashed rgba(255,255,255,0.8)',
                          borderRadius: 10,
                        }}
                      />
                    )}
                    {layer === 'image' && (
                      <div
                        className="absolute pointer-events-none"
                        style={{ inset: 0, border: '2px dashed rgba(255,255,255,0.85)', borderRadius: 14 }}
                      />
                    )}
                    <span
                      className="pointer-events-none absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                      style={{ background: 'rgba(255,253,245,0.9)', color: 'var(--color-cherry)' }}
                    >
                      {zero(idx + 1)}/{zero(total)}
                    </span>
                  </div>

                  <button
                    onClick={() => goTo(idx + 1)}
                    disabled={idx >= total - 1}
                    className="btn-ghost shrink-0 rounded-full p-2.5"
                    style={{ opacity: idx >= total - 1 ? 0.3 : 1 }}
                    aria-label="Slide siguiente"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <p className="text-center text-[11px]" style={{ color: 'rgba(89,20,39,0.55)' }}>
                  {layer === 'image'
                    ? 'Arrastra la foto para encuadrarla · zoom y reset en el panel'
                    : layer === 'text'
                      ? 'Editando el texto — tócalo en la foto para pasarla a Ajustar'
                      : 'Toca el texto para editarlo · toca la foto para encuadrarla'}
                </p>

                {/* Copiar el texto del slide activo → pegarlo en el editor de IG */}
                {STORY && (
                  <button
                    onClick={() => copySlideText()}
                    disabled={!slide.text.trim() || copiedIdx === idx}
                    className="btn-ghost mx-auto flex items-center gap-1.5 text-xs font-bold"
                    style={{ opacity: !slide.text.trim() ? 0.4 : 1 }}
                    aria-label="Copiar el texto de esta story para pegarlo en Instagram"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check size={14} /> ¡Copiado — pégalo en IG!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copiar texto de esta story
                      </>
                    )}
                  </button>
                )}

                {/* Tira de miniaturas reales + añadir slide (tope MAX_SLIDES) */}
                <div className="flex gap-2 overflow-x-auto py-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {draft.slides.map((s, i) => (
                    <div key={i} className="shrink-0 w-[72px] sm:w-[92px]">
                      <SlideThumb slide={s} mode={mode} number={i + 1} active={i === idx} onClick={() => goTo(i)} />
                    </div>
                  ))}
                  {canAdd && (
                    <div className="shrink-0 w-[72px] sm:w-[92px]">
                      <button
                        onClick={handleAdd}
                        className="flex w-full flex-col items-center justify-center gap-0.5"
                        style={{
                          aspectRatio: `${size.w} / ${size.h}`,
                          borderRadius: 8,
                          background: 'var(--color-warm-gray)',
                          border: '1.5px dashed rgba(89,20,39,0.35)',
                        }}
                        aria-label="Añadir slide"
                      >
                        <Plus size={15} style={{ color: 'var(--color-cherry)' }} />
                        <span className="text-[9px] font-semibold" style={{ color: 'var(--color-cherry-dark)' }}>Añadir</span>
                      </button>
                    </div>
                  )}
                  {atCap && (
                    <div className="flex shrink-0 items-center px-1">
                      <span className="text-[10px] font-semibold" style={{ color: 'rgba(89,20,39,0.45)' }}>Máximo {MAX_SLIDES}</span>
                    </div>
                  )}
                </div>

                {/* Ver en cuadrícula — bajo la tira (navegación de slides en grande) */}
                <button onClick={() => setGridOpen(true)} className="btn-ghost mx-auto flex items-center gap-1.5 text-xs">
                  <Grid2x2 size={14} /> Ver en cuadrícula
                </button>
              </div>

              {/* Panel de control: Texto / Imagen + slides + export */}
              <aside className="flex flex-col gap-3 rounded-2xl p-3.5" style={{ background: 'var(--color-warm-gray)' }}>
                <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(89,20,39,0.06)' }}>
                  {([
                    { id: 'texto' as const, icon: Type, label: 'Texto' },
                    { id: 'imagen' as const, icon: ImagePlus, label: 'Imagen' },
                  ]).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold"
                      style={{
                        background: tab === t.id ? 'white' : 'transparent',
                        color: tab === t.id ? 'var(--color-cherry)' : 'rgba(89,20,39,0.55)',
                      }}
                      aria-pressed={tab === t.id}
                    >
                      <t.icon size={13} /> {t.label}
                    </button>
                  ))}
                </div>

                {tab === 'texto' && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(['serif', 'sans', 'arial', 'poppins'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => updateSlide({ font: f })}
                          className="px-3 py-2 rounded-lg text-xs font-semibold"
                          style={{
                            background: slide.font === f ? 'var(--color-cherry)' : 'white',
                            color: slide.font === f ? 'white' : 'var(--color-cherry-dark)',
                            fontFamily: labFontCss(f).family,
                            fontWeight: labFontCss(f).weight,
                          }}
                          aria-pressed={slide.font === f}
                        >
                          {FONT_LABELS[f]}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(89,20,39,0.5)' }}>Tamaño</span>
                      <button onClick={() => setFontStep(fontStepIndex(slide.fontScale) - 1)} className="btn-ghost px-2.5 py-2 text-xs" aria-label="Texto más pequeño">
                        −
                      </button>
                      <span className="text-xs font-bold w-7 text-center" style={{ color: 'var(--color-cherry)' }}>
                        {LAB_FONT_LABELS[fontStepIndex(slide.fontScale)]}
                      </span>
                      <button onClick={() => setFontStep(fontStepIndex(slide.fontScale) + 1)} className="btn-ghost px-2.5 py-2 text-xs" aria-label="Texto más grande">
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(89,20,39,0.5)' }}>Colores</span>
                      {(['white', 'cherry', 'blush', 'black'] as const).map(c => (
                        <button
                          key={c}
                          onClick={() => updateSlide({ color: c })}
                          aria-label={`Texto ${c}`}
                          className="h-8 w-8 rounded-full shrink-0"
                          style={{
                            background: labTextColorHex(c),
                            border: slide.color === c ? '2.5px solid var(--color-cherry)' : '1.5px solid rgba(89,20,39,0.2)',
                          }}
                        />
                      ))}
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={slide.text}
                      onChange={e => patchText(e.target.value)}
                      maxLength={140}
                      rows={2}
                      placeholder="Escribe aquí el texto del slide…"
                      className="w-full rounded-xl px-3 py-2 text-sm"
                      style={{
                        background: 'white',
                        color: 'var(--color-cherry-dark)',
                        border: `1.5px solid ${editing ? 'var(--color-cherry)' : 'rgba(89,20,39,0.15)'}`,
                        resize: 'none',
                      }}
                      aria-label="Texto del slide"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: 'rgba(89,20,39,0.45)' }}>Se guarda solo en este dispositivo</span>
                      <span className="text-[10px]" style={{ color: slide.text.length > SOFT_MAX ? 'var(--color-danger)' : 'rgba(89,20,39,0.5)' }}>
                        {slide.text.length}/{SOFT_MAX}
                      </span>
                    </div>
                  </>
                )}

                {tab === 'imagen' && (
                  <>
                    <div className="flex items-center gap-2">
                      {hasPhoto && (
                        <button
                          onClick={() => setLayer(layer === 'image' ? null : 'image')}
                          className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                          style={{
                            background: layer === 'image' ? 'var(--color-cherry)' : 'white',
                            color: layer === 'image' ? 'white' : 'var(--color-cherry-dark)',
                          }}
                          aria-pressed={layer === 'image'}
                        >
                          <Crop size={13} /> Ajustar foto
                        </button>
                      )}
                      <span className="text-[11px] ml-auto" style={{ color: 'rgba(89,20,39,0.5)' }}>
                        {layer === 'image' ? 'Arrastra la foto en el canvas' : ''}
                      </span>
                    </div>
                    {layer === 'image' && hasPhoto && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setZoomStep(zoomIdx - 1)} disabled={zoomIdx === 0} className="btn-ghost px-2.5 py-2 text-xs" style={{ opacity: zoomIdx === 0 ? 0.4 : 1 }} aria-label="Menos zoom">
                          −
                        </button>
                        <span className="text-xs font-bold w-10 text-center" style={{ color: 'var(--color-cherry)' }}>
                          {Math.round(clampZoom(slide.zoom) * 100)}%
                        </span>
                        <button onClick={() => setZoomStep(zoomIdx + 1)} disabled={zoomIdx === ZOOM_STEPS.length - 1} className="btn-ghost px-2.5 py-2 text-xs" style={{ opacity: zoomIdx === ZOOM_STEPS.length - 1 ? 0.4 : 1 }} aria-label="Más zoom">
                          +
                        </button>
                        <button
                          onClick={() => updateSlide({ focalX: 0.5, focalY: 0.5, zoom: 1 })}
                          className="btn-ghost ml-auto flex items-center gap-1 px-2.5 py-2 text-xs"
                        >
                          <RotateCcw size={12} /> Restablecer
                        </button>
                      </div>
                    )}
                    {/* Tratamiento de la foto (antes pestaña Diseño): contraste + B/N */}
                    {hasPhoto && (
                      <div className="flex items-center gap-2">
                        <Sun size={14} style={{ color: 'var(--color-cherry)' }} className="shrink-0" />
                        <input
                          type="range"
                          min={0}
                          max={0.6}
                          step={0.1}
                          value={slide.overlay}
                          onChange={e => updateSlide({ overlay: Number(e.target.value) })}
                          className="flex-1 min-w-[70px]"
                          aria-label="Contraste de la foto"
                        />
                        <button
                          onClick={() => updateSlide({ bw: !slide.bw })}
                          className="px-2.5 py-2 rounded-lg text-[11px] font-bold shrink-0"
                          style={{
                            background: slide.bw ? 'var(--color-cherry)' : 'white',
                            color: slide.bw ? 'white' : 'var(--color-cherry-dark)',
                          }}
                          aria-pressed={slide.bw}
                        >
                          B/N
                        </button>
                      </div>
                    )}
                    {/* Posición del texto (antes pestaña Diseño) */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(89,20,39,0.5)' }}>Posición</span>
                      <button onClick={() => positionQuick(0.2)} className="btn-ghost px-2.5 py-2 text-[11px]">Arriba</button>
                      <button onClick={() => positionQuick(0.5)} className="btn-ghost px-2.5 py-2 text-[11px]">Centro</button>
                      <button onClick={() => positionQuick(0.82)} className="btn-ghost px-2.5 py-2 text-[11px]">Abajo</button>
                    </div>
                    <PhotoSourceBar
                      hasPhoto={hasPhoto}
                      onPick={src => updateSlide({ photoSrc: src, photoId: null, focalX: 0.5, focalY: 0.5, zoom: 1 })}
                      onStabilize={src => updateSlide({ photoSrc: src })}
                      uploadField={`s${idx + 1}_foto`}
                      onRemove={() => {
                        updateSlide({ photoSrc: null, photoId: null, focalX: 0.5, focalY: 0.5, zoom: 1 })
                        if (layer === 'image') setLayer(null)
                      }}
                      stockTitle={`Foto del slide ${idx + 1}`}
                    />
                  </>
                )}

                {/* Gestión de slides */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDuplicate}
                    disabled={atCap}
                    className="btn-ghost flex items-center gap-1.5 px-3 py-2.5 text-xs"
                    style={{ opacity: atCap ? 0.4 : 1 }}
                  >
                    <Copy size={13} /> Duplicar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={!canDelete}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors"
                    style={{
                      background: confirmingDelete ? 'var(--color-cherry)' : 'white',
                      color: confirmingDelete ? 'white' : 'var(--color-cherry)',
                      border: confirmingDelete ? 'none' : '1.5px solid rgba(89,20,39,0.15)',
                      opacity: !canDelete ? 0.4 : 1,
                    }}
                  >
                    <Trash2 size={13} /> {confirmingDelete ? '¿Seguro? Toca otra vez' : 'Eliminar'}
                  </button>
                </div>

                {/* Export */}
                <div className="mt-auto flex flex-col gap-2">
                  <button onClick={() => void exportAll()} disabled={downloadingAll} className="btn-primary w-full justify-center text-sm py-3">
                    {downloadedAll ? <Check size={15} /> : <Download size={15} />}
                    {downloadingAll ? 'Descargando…' : downloadedAll ? '¡Descargado!' : L.download}
                  </button>
                  <button onClick={() => void exportSlide(idx)} className="btn-ghost w-full justify-center text-xs py-2.5">
                    <Download size={13} /> Descargar este slide
                  </button>
                  <p className="text-center text-[10px]" style={{ color: 'rgba(89,20,39,0.45)' }}>
                    PNG {size.w}×{size.h} ({mode === 'story' ? '9:16' : '4:5'}) — listas para Instagram.
                  </p>
                </div>
              </aside>
            </div>

            <button
              onClick={() => {
                if (confirmingReset) {
                  resetAll()
                  setConfirmingReset(false)
                } else {
                  setConfirmingReset(true)
                }
              }}
              className="btn-ghost self-center text-xs"
              style={{ color: confirmingReset ? 'var(--color-cherry)' : 'rgba(89,20,39,0.5)' }}
            >
              {confirmingReset ? '¿Borrar todo? Toca otra vez' : 'Empezar de nuevo'}
            </button>
          </section>
        )}
      </div>

      {/* ── Vista cuadrícula: todas las slides completas + añadir ── */}
      {gridOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-cream" role="dialog" aria-label="Vista de cuadrícula">
          <div className="mx-auto w-full max-w-2xl px-4 py-5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-lg font-extrabold" style={{ color: 'var(--color-cherry)' }}>Vista de cuadrícula</p>
              <button onClick={() => setGridOpen(false)} className="btn-ghost p-2" aria-label="Cerrar cuadrícula">
                <X size={17} />
              </button>
            </div>
            <p className="mb-3 text-xs" style={{ color: 'rgba(89,20,39,0.55)' }}>{L.gridHint}</p>
            <div className="grid grid-cols-2 gap-3 pb-10 sm:grid-cols-4">
              {draft?.slides.map((s, i) => (
                <div key={i} className="relative">
                  <SlideThumb slide={s} mode={mode} number={i + 1} active={i === idx} onClick={() => goTo(i)} />
                  {/* Copiar el texto de ESTA story desde la cuadrícula (hermano del botón, sin anidar) */}
                  {STORY && (
                    <button
                      onClick={() => copySlideText(i)}
                      disabled={!s.text.trim()}
                      className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full transition-transform active:scale-90"
                      style={{
                        width: 26,
                        height: 26,
                        background: copiedIdx === i ? 'var(--color-cherry)' : 'rgba(255,253,245,0.92)',
                        color: copiedIdx === i ? 'white' : 'var(--color-cherry)',
                        opacity: !s.text.trim() ? 0.35 : 1,
                        boxShadow: '0 1px 4px rgba(89,20,39,0.2)',
                      }}
                      aria-label={`Copiar el texto de la story ${i + 1}`}
                    >
                      {copiedIdx === i ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  )}
                </div>
              ))}
              {canAdd && (
                <button
                  onClick={handleAdd}
                  className="flex flex-col items-center justify-center gap-1"
                  style={{
                    aspectRatio: `${size.w} / ${size.h}`,
                    borderRadius: 8,
                    background: 'var(--color-warm-gray)',
                    border: '1.5px dashed rgba(89,20,39,0.35)',
                  }}
                  aria-label="Añadir slide"
                >
                  <Plus size={16} style={{ color: 'var(--color-cherry)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--color-cherry-dark)' }}>Añadir slide</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fontStepIndex(scale: number): number {
  let best = 0
  let dist = Infinity
  LAB_FONT_STEPS.forEach((s, i) => {
    const d = Math.abs(s - scale)
    if (d < dist) {
      dist = d
      best = i
    }
  })
  return best
}