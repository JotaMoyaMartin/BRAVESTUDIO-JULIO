'use client'
// Editor de diseño de stories (producto) — HERMANO del editor de carrusel del
// LAB (LabCarouselEditor) con el mismo sistema de render (LabSlide + canvas
// photoDrawStyle). Diferencias: nº de stories FIJO (sin añadir/duplicar/
// eliminar), slides sembrados desde las stories IA (degradado de rol), texto
// hasta 320 caracteres y export PNG 1080×1920 con hoja de compartir en iOS.
// El estado vive en el PADRE (StoriesClient, session-store) — aquí no hay
// localStorage: este editor es controlado (props + onChange updater).

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, ChevronLeft, ChevronRight, Copy, Crop, Download, Grid2x2,
  ImageOff, RotateCcw, Sun, Type, X,
} from 'lucide-react'
import PhotoSourceBar from '@/components/editor/PhotoSourceBar'
import {
  LabSlide, LAB_BASE_FONT_PX, LAB_FONT_LABELS, LAB_FONT_STEPS,
  applySlidePos, clampZoom, focalToPan, nearestZoomStep, panToFocal,
  photoDrawStyle, ZOOM_STEPS,
} from '@/lib/lab/carousel'
import { type SingleStory } from '@/lib/ai/prompts/stories'
import { copyToClipboard } from '@/lib/content-utils'
import { drawLabSlide, labFontCss, labTextColorHex, preloadLabImage } from '@/app/lab/carousel-editor/drawLabSlide'
import SlideThumb from '@/app/lab/carousel-editor/SlideThumb'
import { seedStorySlide, storyBgCss, storyDesignFileName } from '@/lib/stories/design'

const TEXT_MAX = 320 // las stories llevan más texto que un slide de carrusel
const TEXT_SOFT_MAX = 240
const DRAG_TAP_PX = 6
const STORY_SIZE = { w: 1080, h: 1920 }

type Tab = 'texto' | 'imagen'
type Layer = 'text' | 'image' | null

const zero = (n: number) => String(n).padStart(2, '0')

// Estilos de texto con nombre que entiende la estilista (cada botón se ve con su letra).
const FONT_LABELS: Record<LabSlide['font'], string> = {
  poppins: 'Clásica',
  bebas: 'Titular',
  archivo: 'Impacto',
  serif: 'Elegante',
  sans: 'Moderna',
  yellowtail: 'Firma',
  arial: 'Arial',
}
const STORY_FONT_CHOICES = ['poppins', 'bebas', 'archivo', 'serif', 'sans', 'yellowtail'] as const

/** Aborts de la hoja de compartir de iOS: cancelar no es error. */
function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError'
}

interface Props {
  stories: SingleStory[] // ya generadas (result.stories); el nº de slides es FIJO
  slides: Record<number, LabSlide> // por story.number — sembrados por el padre (ensureDesignSlides)
  onChange: (updater: (prev: Record<number, LabSlide>) => Record<number, LabSlide>) => void
  activeNumber: number
  onActiveNumberChange: (n: number) => void
}

export default function StoryDesignEditor({ stories, slides, onChange, activeNumber, onActiveNumberChange }: Props) {
  const size = STORY_SIZE

  // ── Orden y slide activo (por nº de story, jamás índices de array) ────────
  const sorted = useMemo(() => [...stories].sort((a, b) => a.number - b.number), [stories])
  const idx = Math.max(0, sorted.findIndex(s => s.number === activeNumber))
  const activeStory = sorted[idx]
  const total = sorted.length
  const slide: LabSlide | null = activeStory
    ? (slides[activeStory.number] ?? seedStorySlide(activeStory)) // seed fallback: jamás gris
    : null

  // ── Editor visual (estado local de UI; el DISEÑO vive en el padre) ────────
  const [tab, setTab] = useState<Tab>('texto')
  const [layer, setLayer] = useState<Layer>(null)
  const [editing, setEditing] = useState(false)
  const [gridOpen, setGridOpen] = useState(false)
  const [imgDead, setImgDead] = useState(false)
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null)
  const [serifFamily, setSerifFamily] = useState('"DM Serif Display", serif')
  const [sansFamily, setSansFamily] = useState('Montserrat, sans-serif')
  const [poppinsFamily, setPoppinsFamily] = useState('Poppins, sans-serif')
  const [extraFamilies, setExtraFamilies] = useState<Record<'bebas' | 'archivo' | 'yellowtail', string>>({
    bebas: '"Bebas Neue", sans-serif', archivo: '"Archivo Black", sans-serif', yellowtail: 'Yellowtail, cursive',
  })
  const extraProbeRef = useRef<HTMLDivElement | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadedAll, setDownloadedAll] = useState(false)
  const serifProbeRef = useRef<HTMLSpanElement | null>(null)
  const sansProbeRef = useRef<HTMLSpanElement | null>(null)
  const poppinsProbeRef = useRef<HTMLSpanElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const textDragRef = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null)
  // Las guías del centro solo se ven mientras se arrastra el texto.
  const [draggingText, setDraggingText] = useState(false)
  const photoDragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null)

  // Copiado: chip confirmado se disipa solo.
  useEffect(() => {
    if (copiedIdx === null) return
    const t = setTimeout(() => setCopiedIdx(null), 2400)
    return () => clearTimeout(t)
  }, [copiedIdx])

  // Probe de familias canvas (una vez): el DOM y el canvas comparten family.
  useEffect(() => {
    if (serifProbeRef.current) setSerifFamily(getComputedStyle(serifProbeRef.current).fontFamily)
    if (sansProbeRef.current) setSansFamily(getComputedStyle(sansProbeRef.current).fontFamily)
    if (poppinsProbeRef.current) setPoppinsFamily(getComputedStyle(poppinsProbeRef.current).fontFamily)
    const box = extraProbeRef.current
    if (box) {
      const fam = (k: string) => {
        const el = box.querySelector<HTMLElement>(`[data-font="${k}"]`)
        return el ? getComputedStyle(el).fontFamily : ''
      }
      setExtraFamilies(prev => ({
        bebas: fam('bebas') || prev.bebas,
        archivo: fam('archivo') || prev.archivo,
        yellowtail: fam('yellowtail') || prev.yellowtail,
      }))
    }
  }, [])

  // Foto del slide activo: precarga con CORS (firmadas manchan el canvas) y
  // guarda dims naturales — el encuadre focal/zoom necesita el tamaño real.
  const photoSrc = slide?.photoSrc ?? null
  useEffect(() => {
    let cancelled = false
    setImgDead(false)
    setImgDims(null)
    if (!photoSrc) return
    preloadLabImage(photoSrc).then(img => {
      if (cancelled) return
      setImgDims(img ? { w: img.naturalWidth, h: img.naturalHeight } : null)
      if (!img) setImgDead(true)
    })
    return () => {
      cancelled = true
    }
  }, [photoSrc])

  function updateSlide(patch: Partial<LabSlide>, i = idx) {
    const target = sorted[i]
    if (!target) return
    onChange(prev => {
      const cur = prev[target.number]
      return { ...prev, [target.number]: { ...(cur ?? {}), ...patch } }
    })
  }

  function goTo(number: number) {
    setEditing(false)
    setLayer(null)
    setGridOpen(false)
    setCopiedIdx(null)
    onActiveNumberChange(number)
  }

  // ── Copiar el texto (lleva el texto a IG pegándolo en su editor) ──────────
  function copySlideText(i = idx) {
    const s = sorted[i]
    const t = (s && slides[s.number]?.text?.trim()) || ''
    if (!t || copiedIdx === i) return
    copyToClipboard(t)
    setCopiedIdx(i)
  }

  // ── Pasos de tamaño y zoom ────────────────────────────────────────────────
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

  function setFontStep(i: number) {
    updateSlide({ fontScale: LAB_FONT_STEPS[Math.max(0, Math.min(LAB_FONT_STEPS.length - 1, i))] })
  }

  function setZoomStep(i: number) {
    updateSlide({ zoom: clampZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, i))]) })
  }

  // ── Export (canvas + PNG 1080×1920; iOS → hoja de compartir → Archivos) ───
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
      case 'bebas':
      case 'archivo':
      case 'yellowtail':
        return extraFamilies[font]
    }
  }

  async function exportSlide(i0: number): Promise<void> {
    const s = sorted[i0]
    const data = s ? slides[s.number] : undefined
    if (!s || !data) return
    const img = await preloadLabImage(data.photoSrc)
    const canvas = document.createElement('canvas')
    drawLabSlide(canvas, {
      slide: data,
      imageEl: img,
      fontFamily: canvasFamilyOf(data.font),
      mode: 'story',
    })
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (blob) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = storyDesignFileName(i0 + 1, total)
      a.click()
      URL.revokeObjectURL(a.href)
    }
  }

  async function exportAll() {
    if (downloadingAll || !total) return
    setDownloadingAll(true)
    try {
      await document.fonts.ready
      const files: File[] = []
      for (let i = 0; i < total; i++) {
        const s = sorted[i]
        const data = s ? slides[s.number] : undefined
        if (!s || !data) continue
        const img = await preloadLabImage(data.photoSrc)
        const canvas = document.createElement('canvas')
        drawLabSlide(canvas, {
          slide: data,
          imageEl: img,
          fontFamily: canvasFamilyOf(data.font),
          mode: 'story',
        })
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
        if (blob) files.push(new File([blob], storyDesignFileName(i + 1, total), { type: 'image/png' }))
      }
      if (!files.length) return
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const canShareFiles =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files })
      if (isIOS && canShareFiles) {
        try {
          await navigator.share({ files })
          setDownloadedAll(true)
          setTimeout(() => setDownloadedAll(false), 2500)
          return
        } catch (err) {
          if (isAbortError(err)) return // cancelar la hoja: sin descarga duplicada
        }
      }
      for (const f of files) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(f)
        a.download = f.name
        a.click()
        URL.revokeObjectURL(a.href)
        await new Promise(r => setTimeout(r, 350))
      }
      setDownloadedAll(true)
      setTimeout(() => setDownloadedAll(false), 2500)
    } finally {
      setDownloadingAll(false)
    }
  }

  // ── Drag del TEXTO (tap = editar · drag = mover; patrón del LAB) ──────────
  function canvasBox() {
    return canvasRef.current?.getBoundingClientRect() ?? null
  }

  function onTextPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (layer === 'image') return // en modo foto el texto no captura
    if (!slide) return
    textDragRef.current = { x: e.clientX, y: e.clientY, ox: slide.x, oy: slide.y, moved: false }
    setDraggingText(true)
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
    setDraggingText(false)
    if (d && !d.moved) {
      setLayer('text')
      setTab('texto')
      setEditing(true)
      setTimeout(() => textareaRef.current?.focus(), 30)
    }
  }

  // ── Drag de la FOTO (solo modo Ajustar foto): mueve el CONTENIDO ──────────
  function onCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (layer === 'image') {
      if (imgDims && slide) {
        photoDragRef.current = { x: e.clientX, y: e.clientY, fx: slide.focalX, fy: slide.focalY }
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      return
    }
    // Tocar el lienzo sin capa activa activa "Ajustar foto" (2ª vía de entrada).
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

  if (!slide || !activeStory) return null // el padre solo muestra con stories

  const fontCss = labFontCss(slide.font)
  const snappedX = Math.abs(slide.x - 0.5) < 0.004
  const snappedY = Math.abs(slide.y - 0.5) < 0.004
  // Misma fórmula que el export: preview y PNG comparten encuadre (WYSIWYG).
  const photoStyle =
    imgDims && slide.photoSrc && !imgDead ? photoDrawStyle(slide, imgDims.w, imgDims.h, size.w, size.h) : null
  const hasPhoto = !!slide.photoSrc && !imgDead
  const showBg = !!slide.bgId // el degradado de rol SOLO se ve sin foto viable

  return (
    <div className="flex flex-col gap-3" style={{ color: 'var(--color-cherry-dark)' }}>
      {/* Probes de fuentes (next/font ofusca: getComputedStyle resuelve) */}
      <span ref={serifProbeRef} style={{ fontFamily: 'var(--font-dmserif)', position: 'absolute', visibility: 'hidden' }}>Aa</span>
      <span ref={sansProbeRef} style={{ fontFamily: 'var(--font-montserrat)', position: 'absolute', visibility: 'hidden' }}>Aa</span>
      <span ref={poppinsProbeRef} style={{ fontFamily: 'var(--font-poppins)', position: 'absolute', visibility: 'hidden' }}>Aa</span>
      <div ref={extraProbeRef} aria-hidden style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <span data-font="bebas" style={{ fontFamily: 'var(--font-bebas)' }}>Aa</span>
        <span data-font="archivo" style={{ fontFamily: 'var(--font-archivo)' }}>Aa</span>
        <span data-font="yellowtail" style={{ fontFamily: 'var(--font-yellowtail)' }}>Aa</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 className="text-lg font-extrabold" style={{ color: 'var(--color-cherry)' }}>
          Diseña tus stories
        </h3>
        <p className="text-xs" style={{ color: 'rgba(89,20,39,0.55)' }}>
          Toca una miniatura para moverte · personaliza cada story y descárgalas en PNG.
        </p>
      </div>

      <div className="grid gap-2 lg:gap-5 lg:grid-cols-[minmax(0,1fr)360px] items-start">
        {/* Columna canvas: ‹ [canvas] › + tira real + cuadrícula.
            En móvil/tablet la columna se «deshace» (contents) para que la story
            quede fija arriba mientras se usa el panel de debajo. */}
        <div className="max-lg:contents flex min-w-0 flex-col gap-2">
          <div className="max-lg:sticky max-lg:top-14 md:top-0 z-20 -mx-5 px-5 sm:mx-0 sm:px-0 py-2 lg:py-0 bg-cream lg:bg-transparent max-lg:border-b max-lg:border-borde/60 flex flex-col gap-2 [--story-h:38dvh] lg:[--story-h:calc(100dvh-200px)]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo(sorted[idx - 1]?.number ?? 1)}
              disabled={idx === 0}
              className="btn-ghost shrink-0 rounded-full p-2.5"
              style={{ opacity: idx === 0 ? 0.3 : 1 }}
              aria-label="Story anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              ref={canvasRef}
              className="relative w-full min-w-0 mx-auto overflow-hidden select-none touch-none"
              style={{
                aspectRatio: `${size.w} / ${size.h}`,
                // Que la story entera quepa en pantalla (móvil y tablet) sin hacer scroll.
                maxWidth: 'min(360px, calc(var(--story-h) * 0.5625))',
                borderRadius: 14,
                background: showBg ? storyBgCss(slide.bgId!) : 'var(--color-warm-gray)',
                containerType: 'inline-size',
              }}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerCancel={onCanvasPointerUp}
            >
              {/* Foto cover+zoom+focal (idéntico al export) */}
              {hasPhoto && photoStyle && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.photoSrc ?? undefined}
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
              {imgDead && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: slide.bgId ? storyBgCss(slide.bgId) : '#EAE0DA' }}>
                  <ImageOff size={22} style={{ color: 'rgba(89,20,39,0.35)' }} />
                </div>
              )}

              {/* Overlay negro para legibilidad (mismo math que el export) */}
              {slide.overlay > 0 && (
                <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${slide.overlay})` }} />
              )}

              {/* Guías de tercios en modo Ajustar foto */}
              {layer === 'image' && hasPhoto && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute bottom-0 top-0 left-1/3 w-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
                  <div className="absolute bottom-0 top-0 left-2/3 w-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
                  <div className="absolute right-0 left-0 top-1/3 h-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
                  <div className="absolute right-0 left-0 top-2/3 h-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
                </div>
              )}
              {draggingText && snappedX && <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(255,255,255,0.55)' }} />}
              {draggingText && snappedY && <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(255,255,255,0.55)' }} />}

              {/* Bloque de texto: tap = editar · drag = mover */}
              <div
                onPointerDown={onTextPointerDown}
                onPointerMove={onTextPointerMove}
                onPointerUp={onTextPointerUp}
                onPointerCancel={() => {
                  textDragRef.current = null
                  setDraggingText(false)
                }}
                className="absolute whitespace-pre-wrap"
                style={{
                  left: `${slide.x * 100}%`,
                  top: `${slide.y * 100}%`,
                  width: '80%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  fontFamily: fontCss.family,
                  fontWeight: fontCss.weight,
                  fontSize: `${((LAB_BASE_FONT_PX[slide.font] * slide.fontScale) / (size.w / 100)).toFixed(2)}cqw`,
                  lineHeight: 1.3,
                  color: labTextColorHex(slide.color),
                  cursor: layer === 'text' ? 'text' : 'grab',
                  pointerEvents: layer === 'image' ? 'none' : 'auto',
                }}
              >
                {slide.text || <span style={{ opacity: 0.55 }}>Toca aquí para escribir…</span>}
              </div>

              {/* Indicación de capa activa — texto OR foto, nunca ambas */}
              {layer === 'text' && (
                <div
                  className="pointer-events-none absolute"
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
              {layer === 'image' && hasPhoto && (
                <div
                  className="pointer-events-none absolute"
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
              onClick={() => goTo(sorted[idx + 1]?.number ?? 1)}
              disabled={idx >= total - 1}
              className="btn-ghost shrink-0 rounded-full p-2.5"
              style={{ opacity: idx >= total - 1 ? 0.3 : 1 }}
              aria-label="Story siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <p className="text-center text-[11px]" style={{ color: 'rgba(89,20,39,0.55)' }}>
            {layer === 'image' && hasPhoto
              ? 'Arrastra la foto para encuadrarla · zoom y reset en el panel'
              : layer === 'text'
                ? 'Editando el texto — toca la foto para pasarla a Ajustar'
                : 'Toca el texto para editarlo · toca la foto para ponerla'}
          </p>
          </div>

          {/* Copiar el texto de esta story (para pegar en IG sin diseñar) */}
          <button
            onClick={() => copySlideText()}
            disabled={!slide.text.trim()}
            className="btn-ghost mx-auto flex items-center gap-1.5 text-xs font-bold"
            style={{ opacity: !slide.text.trim() ? 0.4 : 1 }}
            aria-label="Copiar el texto de esta story"
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

          {/* Tira de miniaturas REALES (nº de stories FIJO: sin añadir) */}
          <div className="flex gap-2 overflow-x-auto py-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {sorted.map((s, i) => (
              <div key={s.number} className="w-[72px] shrink-0 sm:w-[92px]">
                <SlideThumb
                  slide={slides[s.number] ?? seedStorySlide(s)}
                  mode="story"
                  number={s.number}
                  active={i === idx}
                  onClick={() => goTo(s.number)}
                />
              </div>
            ))}
          </div>

          <button onClick={() => setGridOpen(true)} className="btn-ghost mx-auto flex items-center gap-1.5 text-xs">
            <Grid2x2 size={14} /> Ver en cuadrícula
          </button>
        </div>

        {/* Panel: Texto / Imagen + export */}
        <aside className="flex flex-col gap-3 rounded-2xl p-3.5" style={{ background: 'var(--color-warm-gray)' }}>
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(89,20,39,0.06)' }}>
            {([
              { id: 'texto' as const, icon: Type, label: 'Texto' },
              { id: 'imagen' as const, icon: Crop, label: 'Imagen' },
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
                {STORY_FONT_CHOICES.map(f => (
                  <button
                    key={f}
                    onClick={() => updateSlide({ font: f })}
                    className="rounded-lg px-3 py-2 text-xs font-semibold"
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
                <button
                  onClick={() => setFontStep(fontStepIndex(slide.fontScale) - 1)}
                  disabled={fontStepIndex(slide.fontScale) === 0}
                  className="btn-ghost px-2.5 py-2 text-xs"
                  style={{ opacity: fontStepIndex(slide.fontScale) === 0 ? 0.4 : 1 }}
                  aria-label="Texto más pequeño"
                >
                  −
                </button>
                <span className="w-7 text-center text-xs font-bold" style={{ color: 'var(--color-cherry)' }}>
                  {LAB_FONT_LABELS[fontStepIndex(slide.fontScale)]}
                </span>
                <button
                  onClick={() => setFontStep(fontStepIndex(slide.fontScale) + 1)}
                  disabled={fontStepIndex(slide.fontScale) === LAB_FONT_STEPS.length - 1}
                  className="btn-ghost px-2.5 py-2 text-xs"
                  style={{ opacity: fontStepIndex(slide.fontScale) === LAB_FONT_STEPS.length - 1 ? 0.4 : 1 }}
                  aria-label="Texto más grande"
                >
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
                    className="h-8 w-8 shrink-0 rounded-full"
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
                onChange={e => updateSlide({ text: e.target.value.slice(0, TEXT_MAX) })}
                maxLength={TEXT_MAX}
                rows={3}
                placeholder="Escribe aquí el texto de la story…"
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={{
                  background: 'white',
                  color: 'var(--color-cherry-dark)',
                  border: `1.5px solid ${editing ? 'var(--color-cherry)' : 'rgba(89,20,39,0.15)'}`,
                  resize: 'none',
                }}
                aria-label="Texto de la story"
              />
              <div className="flex items-center justify-end">
                <span className="text-[10px]" style={{ color: slide.text.length > TEXT_SOFT_MAX ? 'var(--color-danger)' : 'rgba(89,20,39,0.5)' }}>
                  {slide.text.length}/{TEXT_SOFT_MAX}
                </span>
              </div>
            </>
          )}

          {tab === 'imagen' && (
            <>
              <div className="flex items-center gap-2">
                {hasPhoto || (slide.photoSrc !== null && imgDead) ? (
                  <button
                    onClick={() => setLayer(layer === 'image' ? null : 'image')}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
                    style={{
                      background: layer === 'image' ? 'var(--color-cherry)' : 'white',
                      color: layer === 'image' ? 'white' : 'var(--color-cherry-dark)',
                      opacity: imgDead ? 0.4 : 1,
                    }}
                    aria-pressed={layer === 'image'}
                  >
                    <Crop size={13} /> Ajustar foto
                  </button>
                ) : null}
                <span className="ml-auto text-[11px]" style={{ color: 'rgba(89,20,39,0.5)' }}>
                  {layer === 'image' && hasPhoto ? 'Arrastra la foto en el canvas' : ''}
                </span>
              </div>
              {layer === 'image' && hasPhoto && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomStep(nearestZoomStep(slide.zoom) - 1)}
                    disabled={nearestZoomStep(slide.zoom) === 0}
                    className="btn-ghost px-2.5 py-2 text-xs"
                    style={{ opacity: nearestZoomStep(slide.zoom) === 0 ? 0.4 : 1 }}
                    aria-label="Menos zoom"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-xs font-bold" style={{ color: 'var(--color-cherry)' }}>
                    {Math.round(clampZoom(slide.zoom) * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomStep(nearestZoomStep(slide.zoom) + 1)}
                    disabled={nearestZoomStep(slide.zoom) === ZOOM_STEPS.length - 1}
                    className="btn-ghost px-2.5 py-2 text-xs"
                    style={{ opacity: nearestZoomStep(slide.zoom) === ZOOM_STEPS.length - 1 ? 0.4 : 1 }}
                    aria-label="Más zoom"
                  >
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
              {/* Contraste + B/N (solo con foto: el degradado de rol manda limpio) */}
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
                    className="min-w-[70px] flex-1"
                    aria-label="Velo sobre la foto"
                  />
                  <button
                    onClick={() => updateSlide({ bw: !slide.bw })}
                    className="shrink-0 rounded-lg px-2.5 py-2 text-[11px] font-bold"
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
              {/* Posición del texto */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(89,20,39,0.5)' }}>Posición</span>
                <button onClick={() => positionQuick(0.2)} className="btn-ghost px-2.5 py-2 text-[11px]">Arriba</button>
                <button onClick={() => positionQuick(0.5)} className="btn-ghost px-2.5 py-2 text-[11px]">Centro</button>
                <button onClick={() => positionQuick(0.82)} className="btn-ghost px-2.5 py-2 text-[11px]">Abajo</button>
              </div>
              <PhotoSourceBar
                hasPhoto={hasPhoto}
                onPick={src =>
                  updateSlide({
                    photoSrc: src,
                    photoId: null,
                    focalX: 0.5,
                    focalY: 0.5,
                    zoom: 1,
                    overlay: Math.max(slide.overlay, 0.3), // velo inicial para legibilidad
                  })
                }
                onStabilize={src => updateSlide({ photoSrc: src })}
                uploadField={`story${activeStory.number}_foto`}
                onRemove={() => {
                  // Volver al degradado de rol limpio de los mockups.
                  updateSlide({ photoSrc: null, photoId: null, focalX: 0.5, focalY: 0.5, zoom: 1, overlay: 0, bw: false })
                  if (layer === 'image') setLayer(null)
                }}
                stockTitle={`Foto de la story ${activeStory.number}`}
              />
            </>
          )}

          {/* Export (sin gestión de slides: el nº de stories lo fija la IA) */}
          <div className="mt-auto flex flex-col gap-2">
            <button onClick={() => void exportAll()} disabled={downloadingAll} className="btn-primary w-full justify-center text-sm py-3">
              {downloadedAll ? <Check size={15} /> : <Download size={15} />}
              {downloadingAll ? 'Descargando…' : downloadedAll ? '¡Descargado!' : 'Descargar las stories'}
            </button>
            <button onClick={() => void exportSlide(idx)} className="btn-ghost w-full justify-center text-xs py-2.5">
              <Download size={13} /> Descargar esta story
            </button>
            <p className="text-center text-[10px]" style={{ color: 'rgba(89,20,39,0.45)' }}>
              PNG {size.w}×{size.h} (9:16) — listas para Instagram.
            </p>
          </div>
        </aside>
      </div>

      {/* ── Vista cuadrícula: las stories completas ── */}
      {gridOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-label="Vista de cuadrícula" style={{ background: 'var(--color-cream, #F5F0E8)' }}>
          <div className="mx-auto w-full max-w-2xl px-4 py-5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-lg font-extrabold" style={{ color: 'var(--color-cherry)' }}>Vista de cuadrícula</p>
              <button onClick={() => setGridOpen(false)} className="btn-ghost p-2" aria-label="Cerrar cuadrícula">
                <X size={17} />
              </button>
            </div>
            <p className="mb-3 text-xs" style={{ color: 'rgba(89,20,39,0.55)' }}>
              Visualiza tus stories completas. Toca una para editarla.
            </p>
            <div className="grid grid-cols-2 gap-3 pb-10 sm:grid-cols-3">
              {sorted.map((s, i) => (
                <div key={s.number} className="relative">
                  <SlideThumb
                    slide={slides[s.number] ?? seedStorySlide(s)}
                    mode="story"
                    number={s.number}
                    active={i === idx}
                    onClick={() => goTo(s.number)}
                  />
                  <button
                    onClick={() => copySlideText(i)}
                    disabled={!s.text.trim()}
                    className="absolute right-1.5 top-1.5 flex items-center justify-center rounded-full transition-transform active:scale-90"
                    style={{
                      width: 26,
                      height: 26,
                      background: copiedIdx === i ? 'var(--color-cherry)' : 'rgba(255,253,245,0.92)',
                      color: copiedIdx === i ? 'white' : 'var(--color-cherry)',
                      opacity: !s.text.trim() ? 0.35 : 1,
                      boxShadow: '0 1px 4px rgba(89,20,39,0.2)',
                    }}
                    aria-label={`Copiar el texto de la story ${s.number}`}
                  >
                    {copiedIdx === i ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}