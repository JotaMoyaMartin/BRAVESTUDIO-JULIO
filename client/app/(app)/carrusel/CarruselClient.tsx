'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { generateCarousel, CarouselOutput } from '@/lib/ai/prompts/carousels'
import { ContentObjective } from '@/lib/ai/prompts/reels'
import { buildBrandFullContext, hasBrandContext, BrandFullContextInput } from '@/lib/ai/brand-context'
import { useSessionState } from '@/lib/session-store'
import { saveToLibrary } from '@/lib/content-utils'
import { CAROUSEL_FAMILIES, getFamily, brandMarkText } from '@/lib/carousel/templates'
import { drawCarouselSlide, ensureCanvasFont, ensureEditorialFonts, exportFileName, SLIDE_W, SLIDE_H } from '@/lib/carousel/render'
import { loadEditorialAssets } from '@/lib/carousel/assets'
import { pickLayout } from '@/lib/carousel/text'
import { pickTextBox } from '@/lib/carousel/geometry'
import type { EmittedTextBox, SlideContent, CarouselFamily, CarouselPalette, SlideImage, TextAdjust, EditorialAssetsSpec } from '@/lib/carousel/types'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
import BraviGuide from '@/components/bravi/BraviGuide'
import PhotoSourceBar from '@/components/editor/PhotoSourceBar'
import {
  Images, Sparkles, RefreshCw, Download, BookOpen, ArrowRight, Upload, Trash2, Check,
  Copy, Minus, Plus, Layers, MousePointerClick,
} from 'lucide-react'

// Creador de Carruseles BRÄVE V1 — La estilista no diseña, la estilista elige.
// IA = contenido (generateCarousel, cliente IA consolidado). DISEÑO = motor de
// plantillas canvas (drawCarouselSlide). Export JPEG 1080×1350. Sin Canva.

type Step = 'idea' | 'contenido' | 'diseno'

const INTENT_CHIPS: { label: string; objective: ContentObjective }[] = [
  { label: 'Educar', objective: 'educativo' },
  { label: 'Mostrar un resultado', objective: 'visibilidad' },
  { label: 'Resolver una duda', objective: 'consejos' },
  { label: 'Vender un servicio', objective: 'venta' },
  { label: 'Compartir un consejo', objective: 'consejos' },
]

const LENGTHS = [3, 5, 7] as const

export default function CarruselClient({ userId, brandFull }: { userId: string; brandFull: BrandFullContextInput | null }) {
  const isDemoMode = userId === 'demo'
  const hasBrand = hasBrandContext(brandFull)

  const [step, setStep] = useSessionState<Step>(`u:${userId}:carrusel:step`, 'idea')
  const [useMiMarca, setUseMiMarca] = useSessionState<boolean>(`u:${userId}:carrusel:useMiMarca`, hasBrand)
  const [idea, setIdea] = useSessionState<string>(`u:${userId}:carrusel:idea`, '')
  const [objective, setObjective] = useSessionState<ContentObjective>(`u:${userId}:carrusel:objective`, 'educativo')
  const [slideCount, setSlideCount] = useSessionState<number>(`u:${userId}:carrusel:count`, 5)
  const [result, setResult] = useSessionState<CarouselOutput | null>(`u:${userId}:carrusel:result`, null)
  const [family, setFamily] = useSessionState<CarouselFamily>(`u:${userId}:carrusel:family`, 'minimal')
  const [paletteIdx, setPaletteIdx] = useSessionState<number>(`u:${userId}:carrusel:palette`, 0)
  const [savedPlan, setSavedPlan] = useSessionState<boolean>(`u:${userId}:carrusel:savedPlan`, false)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [fontFamily, setFontFamily] = useState('Poppins')
  const [editorialAssets, setEditorialAssets] = useState<EditorialAssetsSpec | null>(null)
  const [editorialFonts, setEditorialFonts] = useState<{ serif: string; script: string } | null>(null)
  const [photos, setPhotos] = useState<Record<number, SlideImage>>({})
  const [imgVersion, setImgVersion] = useState(0)
  const imgElsRef = useRef<Record<number, HTMLImageElement>>({})
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  // Editor de texto: ajustes de texto y cajas emitidas por el render (hit-test).
  const [adjusts, setAdjusts] = useSessionState<Record<string, TextAdjust>>(`u:${userId}:carrusel:adjusts`, {})
  const [selectedText, setSelectedText] = useSessionState<string | null>(`u:${userId}:carrusel:selectedText`, null)
  const textboxesRef = useRef<Record<number, EmittedTextBox[]>>({})
  const [tbVersion, setTbVersion] = useState(0) // re-render para pintar los handles
  const textDragRef = useRef<{ id: string; x: number; y: number; bx: number; by: number } | null>(null)

  const brandContext = useMemo(() => {
    if (!useMiMarca || !brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [useMiMarca, brandFull])
  const salonName = brandFull?.salon_name ?? null

  // Tipografía del producto cargada para canvas (preview y export idénticos).
  useEffect(() => {
    ensureCanvasFont().then(f => {
      setFontFamily(f)
      setImgVersion(v => v + 1) // fuerza re-render de previews con la fuente resuelta
    })
    // Familia Editorial: assets del diseño papel + fuentes serif/script.
    Promise.all([loadEditorialAssets(), ensureEditorialFonts()]).then(([assets, fonts]) => {
      setEditorialAssets(assets)
      setEditorialFonts(fonts)
      setImgVersion(v => v + 1)
    })
  }, [])

  const familyDef = getFamily(family)
  const palette: CarouselPalette = familyDef.palettes[Math.min(paletteIdx, familyDef.palettes.length - 1)]
  const slides: SlideContent[] = result?.slides ?? []
  const total = slides.length

  const renderOpts = useCallback(
    (i: number, opts: { emit?: boolean } = {}) => ({
      slide: slides[i],
      layout: pickLayout(i, total, { family, hasPhoto: !!imgElsMap().has(i), text: slides[i]?.text ?? '' }),
      index: i,
      total,
      family,
      palette,
      brandName: brandMarkText(salonName),
      image: photos[i] ?? null,
      imageEl: imgElsMap().get(i) ?? null,
      fontFamily,
      textAdjust: adjustsForSlide(i),
      emitTextBox: opts.emit ? () => {} : undefined,
      editorialAssets,
      serifFamily: editorialFonts?.serif,
      scriptFamily: editorialFonts?.script,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slides, total, family, palette, salonName, photos, fontFamily, imgVersion, editorialAssets, editorialFonts, adjusts],
  )

  function imgElsMap(): Map<number, HTMLImageElement> {
    return new Map(Object.entries(imgElsRef.current).map(([k, v]) => [Number(k), v]))
  }

  // --- Editor de texto (cajas emitidas por el propio render: única fuente de verdad) ---
  const adjustKey = (index0: number, id: string) => `${index0}:${id}`

  function adjustsForSlide(index0: number): Record<string, TextAdjust> {
    const prefix = `${index0}:`
    const out: Record<string, TextAdjust> = {}
    for (const [k, v] of Object.entries(adjusts)) {
      if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v
    }
    return out
  }

  function setAdjustFor(index0: number, id: string, patch: Partial<TextAdjust>) {
    setAdjusts(prev => {
      const key = adjustKey(index0, id)
      const cur = prev[key] ?? { dx: 0, dy: 0, sizeFactor: 1 }
      const clamp = (n: number) => Math.max(-1, Math.min(1, Number.isFinite(n) ? n : 0))
      return { ...prev, [key]: { dx: clamp(patch.dx ?? cur.dx), dy: clamp(patch.dy ?? cur.dy), sizeFactor: Math.max(0.6, Math.min(1.8, patch.sizeFactor ?? cur.sizeFactor)) } }
    })
  }

  function resetAdjusts(index0: number) {
    setAdjusts(prev => {
      const next: Record<string, TextAdjust> = {}
      const prefix = `${index0}:`
      for (const [k, v] of Object.entries(prev)) if (!k.startsWith(prefix)) next[k] = v
      return next
    })
    setSelectedText(null)
  }

  // Opts MEMORIZADOS (hooks SIEMPRE top-level): el objeto opts debe ser estable
  // entre renders — si no, el effect de SlideCanvas re-dibuja (y re-emite) en bucle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bigOpts = useMemo(() => renderOpts(currentSlide, { emit: true }), [renderOpts, currentSlide])
  const thumbOpts = useMemo(() => slides.map((_, i) => renderOpts(i)), [renderOpts, slides]) // eslint-disable-line

  // --- Generación (reusa generateCarousel: mismo cliente IA, mock en demo) ---
  async function generate() {
    if (!idea.trim()) return
    setGenerating(true)
    const out = await generateCarousel({
      service: 'General',
      objective,
      slideCount,
      brandContext,
      freeText: idea.trim(),
    })
    setResult(out)
    setSavedPlan(false)
    setCurrentSlide(0)
    setAdjusts({}) // el texto cambia ⇒ los ajustes de posición/tamaño quedan sin sentido
    setGenerating(false)
    setStep('contenido')
  }

  async function regenerate() {
    if (!result) return
    setGenerating(true)
    const out = await generateCarousel({
      service: 'General',
      objective,
      slideCount: result.slides.length,
      brandContext,
      freeText: idea || result.title,
    })
    setResult(out)
    setSavedPlan(false)
    setAdjusts({})
    setSelectedText(null)
    setGenerating(false)
  }

  function updateSlideText(number: number, text: string) {
    setResult(prev => (prev ? { ...prev, slides: prev.slides.map(s => (s.number === number ? { ...s, text } : s)) } : prev))
  }

  // --- Fotos del salón (en memoria en V1) de las 3 fuentes: subida/catálogo/cámara ---
  function loadImage(index0: number, src: string) {
    const img = new Image()
    // crossOrigin: la URL firmada de Storage (cross-origin) mancharía el canvas
    // → toBlob lanzaría SecurityError. Supabase Storage sirve CORS *.
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgElsRef.current[index0] = img
      setImgVersion(v => v + 1)
    }
    img.src = src
  }

  function setPhotoSrc(index0: number, src: string) {
    const old = photos[index0]
    // revoke solo objectURLs (las rutas públicas del catálogo no son blobs)
    if (old && old.src.startsWith('blob:') && old.src !== src) URL.revokeObjectURL(old.src)
    loadImage(index0, src)
    setPhotos(prev => ({ ...prev, [index0]: { src, scale: 1, offsetX: 0, offsetY: 0 } }))
  }

  // La subida a Storage acabó: misma foto, src estable (conserva zoom/pan y
  // revoca el blob). El preview nunca se interrumpe.
  function stabilizePhoto(index0: number, src: string) {
    const old = photos[index0]
    if (!old || old.src === src || !old.src.startsWith('blob:')) return
    URL.revokeObjectURL(old.src)
    loadImage(index0, src)
    setPhotos(prev => (prev[index0] ? { ...prev, [index0]: { ...prev[index0]!, src } } : prev))
  }

  function removePhoto(index0: number) {
    const photo = photos[index0]
    if (photo) URL.revokeObjectURL(photo.src)
    delete imgElsRef.current[index0]
    setPhotos(prev => {
      const next = { ...prev }
      delete next[index0]
      return next
    })
    setImgVersion(v => v + 1)
  }

  function setPhotoZoom(index0: number, scale: number) {
    setPhotos(prev => (prev[index0] ? { ...prev, [index0]: { ...prev[index0], scale } } : prev))
  }

  // --- Export: la MISMA función de render, JPEG 1080×1350 ---
  async function downloadOne(index0: number) {
    const canvas = document.createElement('canvas')
    drawCarouselSlide(canvas, renderOpts(index0))
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.92))
    if (!blob) return
    triggerDownload(blob, exportFileName(index0, total))
  }

  async function downloadAll() {
    if (!result || total === 0) return
    setExporting(true)
    for (let i = 0; i < total; i++) {
      await downloadOne(i)
      await new Promise(r => setTimeout(r, 400))
    }
    setExporting(false)
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    await saveToLibrary(
      userId,
      {
        type: 'carrusel',
        title: result.title,
        service: idea.trim() || 'General',
        objective,
        content_json: { slides: result.slides, template: family, palette: paletteIdx } as unknown as Record<string, unknown>,
        caption_with_hashtags: result.captionWithHashtags || null,
        visual_idea: result.visualIdea || null,
        format: 'carrusel',
        scheduled_date: null,
      },
      isDemoMode,
    )
    setSaving(false)
    setSavedPlan(true)
  }

  // --- Drag unificado: primero hit-test de TEXTO (cajas emitidas), si no, PAN de foto ---
  const slidePointerFor = (index0: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget
      const box = canvas.getBoundingClientRect()
      const x = ((e.clientX - box.left) / (box.width || 1)) * SLIDE_W
      const y = ((e.clientY - box.top) / (box.height || 1)) * SLIDE_H
      const hit = pickTextBox({ x, y }, textboxesRef.current[index0] ?? [])
      if (hit) {
        const cur = adjusts[adjustKey(index0, hit.id)] ?? { dx: 0, dy: 0, sizeFactor: 1 }
        textDragRef.current = { id: hit.id, x: e.clientX, y: e.clientY, bx: cur.dx, by: cur.dy }
        setSelectedText(hit.id)
        canvas.setPointerCapture(e.pointerId)
        return
      }
      if (!photos[index0]) return
      dragRef.current = { x: e.clientX, y: e.clientY, ox: photos[index0].offsetX, oy: photos[index0].offsetY }
      canvas.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (textDragRef.current) {
        const box = e.currentTarget.getBoundingClientRect()
        const dx = textDragRef.current.bx + (e.clientX - textDragRef.current.x) / (box.width || 1)
        const dy = textDragRef.current.by + (e.clientY - textDragRef.current.y) / (box.height || 1)
        setAdjustFor(index0, textDragRef.current.id, { dx, dy })
        return
      }
      if (!dragRef.current || !photos[index0]) return
      const w = e.currentTarget.clientWidth || 1
      const dx = (e.clientX - dragRef.current.x) / w
      const dy = (e.clientY - dragRef.current.y) / w
      const ox = Math.max(-1, Math.min(1, dragRef.current.ox + dx))
      const oy = Math.max(-1, Math.min(1, dragRef.current.oy + dy))
      setPhotos(prev => ({ ...prev, [index0]: { ...prev[index0], offsetX: ox, offsetY: oy } }))
    },
    onPointerUp: () => {
      textDragRef.current = null
      dragRef.current = null
    },
  })

  // ═══════════ PASO 1 — IDEA ═══════════
  if (step === 'idea') {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center gap-2">
          <Images size={16} style={{ color: 'var(--color-cherry)' }} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60">Carrusel BRÄVE</p>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ letterSpacing: '-0.5px' }}>¿Qué quieres contar?</h1>
          <p className="mt-1 text-sm text-cherry-dark opacity-70">Idea → BRÄVE escribe → BRÄVE maqueta → tú personalizas → descargas.</p>
        </div>

        <div className="p-5 rounded-[var(--radius-md)] space-y-4" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)' }}>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="Ej: Quiero explicar la diferencia entre balayage y babylights."
            rows={4}
            className="w-full text-sm leading-relaxed outline-none resize-none"
            style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.15)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', color: '#1a1a1a' }}
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cherry mb-2" style={{ opacity: 0.6 }}>¿Para qué?</p>
            <div className="flex flex-wrap gap-2">
              {INTENT_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => setObjective(chip.objective)}
                  className="px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{
                    background: objective === chip.objective ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                    color: objective === chip.objective ? 'white' : 'var(--color-cherry-dark)',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cherry mb-2" style={{ opacity: 0.6 }}>Longitud</p>
            <div className="flex gap-2">
              {LENGTHS.map(n => (
                <button
                  key={n}
                  onClick={() => setSlideCount(n)}
                  className="px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold transition-all"
                  style={{
                    background: slideCount === n ? 'var(--color-cherry)' : 'white',
                    color: slideCount === n ? 'white' : 'var(--color-cherry-dark)',
                    border: '1.5px solid rgba(122,24,50,0.2)',
                  }}
                >
                  {n} slides
                </button>
              ))}
            </div>
          </div>

          {hasBrand && <UsarMiMarcaToggle enabled={useMiMarca} onChange={setUseMiMarca} hasBrand={hasBrand} />}

          <button onClick={generate} disabled={!idea.trim() || generating} className="btn-primary w-full justify-center text-base py-4" style={{ opacity: !idea.trim() && !generating ? 0.5 : 1 }}>
            <Sparkles size={16} /> {generating ? 'Escribiendo tu carrusel…' : 'Generar carrusel'}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════ PASO 2 — CONTENIDO ═══════════
  if (step === 'contenido' && result) {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BraviGuide section="crear-contenido" size={44} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60">Tu contenido está listo ✨</p>
              <h2 className="font-bold text-lg text-ink">{result.title}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={regenerate} disabled={generating} className="btn-ghost text-sm">
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> Regenerar
            </button>
            <button onClick={() => setStep('idea')} className="btn-ghost text-sm">
              Volver
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {result.slides.map((s, i) => (
            <div key={s.number} className="p-4 rounded-[var(--radius-sm)]" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)' }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--color-cherry)', color: 'white' }}>
                  {s.number}
                </div>
                <span className="text-xs font-semibold text-cherry">{s.role}</span>
                <span className="ml-auto text-[10px] font-bold" style={{ color: 'var(--color-cherry-dark)', opacity: 0.35 }}>{s.text.length} car.</span>
              </div>
              <textarea
                value={s.text}
                onChange={e => updateSlideText(s.number, e.target.value)}
                rows={2}
                className="w-full text-sm leading-relaxed outline-none resize-none"
                style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.12)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#1a1a1a' }}
              />
            </div>
          ))}
        </div>

        {result.captionWithHashtags && (
          <div className="p-4 rounded-[var(--radius-md)]" style={{ background: 'var(--color-warm-gray)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-wider text-cherry" style={{ opacity: 0.6 }}>Publicación para Instagram</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.captionWithHashtags!)
                  setCopiedCaption(true)
                  setTimeout(() => setCopiedCaption(false), 2000)
                }}
                className="text-xs font-bold text-cherry hover:underline"
              >
                {copiedCaption ? <Check size={12} className="inline" /> : <Copy size={12} className="inline" />} {copiedCaption ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-line text-cherry-dark" style={{ opacity: 0.8 }}>{result.captionWithHashtags}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button onClick={() => setStep('diseno')} className="btn-primary text-sm flex-1 justify-center py-3.5">
            <Layers size={15} /> Continuar al diseño →
          </button>
        </div>
      </div>
    )
  }

  // ═══════════ PASO 3 — DISEÑO ═══════════
  if (step === 'diseno' && result && total > 0) {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60">Elige el estilo</p>
            <h2 className="font-bold text-lg text-ink">Tu carrusel, listo para publicar</h2>
          </div>
          <button onClick={() => setStep('contenido')} className="btn-ghost text-sm">
            <RefreshCw size={14} /> Editar contenido
          </button>
        </div>

        {/* Familias visuales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CAROUSEL_FAMILIES.map(f => (
            <button
              key={f.id}
              onClick={() => {
                setFamily(f.id)
                if (f.id !== family) setPaletteIdx(0)
              }}
              className="p-3 rounded-[var(--radius-md)] text-left transition-all"
              style={{
                background: family === f.id ? 'white' : 'var(--color-warm-gray)',
                border: family === f.id ? '2px solid var(--color-cherry)' : '1.5px solid rgba(122,24,50,0.1)',
                boxShadow: family === f.id ? '0 8px 24px -12px rgba(122,24,50,0.3)' : 'none',
              }}
            >
              <MiniCover family={f.id} palette={f.palettes[0]} slide={slides[0]} total={total} fontFamily={fontFamily} brandName={brandMarkText(salonName)} editorialAssets={editorialAssets} serifFamily={editorialFonts?.serif} scriptFamily={editorialFonts?.script} />
              <p className="text-sm font-bold mt-2" style={{ color: 'var(--color-cherry-dark)' }}>{f.name}</p>
              <p className="text-[10px] leading-snug" style={{ color: 'var(--color-cherry-dark)', opacity: 0.6 }}>{f.description}</p>
            </button>
          ))}
        </div>

        {/* Paletas (pequeña selección controlada) */}
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-cherry mr-1" style={{ opacity: 0.6 }}>Color</p>
          {familyDef.palettes.map((pal, i) => (
            <button
              key={i}
              onClick={() => setPaletteIdx(i)}
              className="w-9 h-9 rounded-full transition-all"
              style={{ background: pal.bg, border: paletteIdx === i ? '2.5px solid var(--color-cherry)' : '1.5px solid rgba(122,24,50,0.2)', boxShadow: paletteIdx === i ? '0 0 0 3px rgba(122,24,50,0.15)' : 'none' }}
              aria-label={`Paleta ${i + 1}`}
            />
          ))}
        </div>

        {/* Preview grande + miniaturas */}
        <div className="space-y-3">
          <div
            className="mx-auto overflow-hidden rounded-[var(--radius-md)]"
            style={{ boxShadow: '0 10px 32px -12px rgba(122,24,50,0.35)', touchAction: 'none', cursor: 'grab' }}
          >
            <div className="relative">
              <SlideCanvas
                opts={bigOpts}
                onEmitted={boxes => {
                  textboxesRef.current[currentSlide] = boxes
                  setTbVersion(v => v + 1)
                }}
                key={`${currentSlide}-${imgVersion}-${fontFamily}`}
                {...slidePointerFor(currentSlide)}
              />
              {(textboxesRef.current[currentSlide] ?? []).map(b => {
                const sel = selectedText === b.id
                return (
                  <div
                    key={`${b.id}-${tbVersion}`}
                    className="absolute pointer-events-none rounded-md"
                    style={{
                      left: `${(b.rect.x / SLIDE_W) * 100}%`,
                      top: `${(b.rect.y / SLIDE_H) * 100}%`,
                      width: `${(b.rect.w / SLIDE_W) * 100}%`,
                      height: `${(b.rect.h / SLIDE_H) * 100}%`,
                      border: sel ? '2px dashed var(--color-cherry)' : '1.5px dashed rgba(122,24,50,0.18)',
                      background: sel ? 'rgba(122,24,50,0.05)' : 'transparent',
                    }}
                  />
                )
              })}
            </div>
          </div>
          <p className="text-center text-[10px] text-cherry-dark" style={{ opacity: 0.5 }}>
            Toca y arrastra el texto para ajustarlo{photos[currentSlide] ? ' · arrastra la imagen para encuadrarla' : ''}
          </p>

          <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {slides.map((s, i) => (
              <button
                key={s.number}
                onClick={() => setCurrentSlide(i)}
                className="relative flex-shrink-0 rounded-lg overflow-hidden"
                style={{ width: 72, border: currentSlide === i ? '2px solid var(--color-cherry)' : '1.5px solid rgba(122,24,50,0.15)' }}
              >
                <SlideCanvas opts={thumbOpts[i]} thumb />
                <span className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'var(--color-cherry)', color: 'white' }}>
                  {s.number}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor del slide actual: texto + foto */}
        <div className="p-4 rounded-[var(--radius-md)] space-y-3" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry" style={{ opacity: 0.6 }}>Slide {currentSlide + 1} · {slides[currentSlide]?.role}</p>
          <textarea
            value={slides[currentSlide]?.text ?? ''}
            onChange={e => updateSlideText(slides[currentSlide].number, e.target.value)}
            rows={3}
            className="w-full text-sm leading-relaxed outline-none resize-none"
            style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.12)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: '#1a1a1a' }}
          />

          {(() => {
            const boxes = textboxesRef.current[currentSlide] ?? []
            const sel = boxes.find(b => b.id === selectedText) ?? null
            if (!sel) return null
            const sf = adjusts[adjustKey(currentSlide, sel.id)]?.sizeFactor ?? 1
            const resizable = sel.kind === 'fitted'
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] p-2" style={{ background: 'var(--color-warm-gray)' }}>
                <MousePointerClick size={13} style={{ color: 'var(--color-cherry)' }} />
                <p className="text-xs font-bold text-cherry">{sel.id === 'text' ? 'Texto' : sel.id === 'headline' ? 'Titular' : 'Cuerpo'}</p>
                {resizable ? (
                  <>
                    <button onClick={() => setAdjustFor(currentSlide, sel.id, { sizeFactor: sf - 0.1 })} className="btn-ghost text-xs px-2 py-1" aria-label="Texto más pequeño">
                      <Minus size={12} />
                    </button>
                    <span className="text-xs text-cherry-dark" style={{ opacity: 0.7 }}>{Math.round(sf * 100)}%</span>
                    <button onClick={() => setAdjustFor(currentSlide, sel.id, { sizeFactor: sf + 0.1 })} className="btn-ghost text-xs px-2 py-1" aria-label="Texto más grande">
                      <Plus size={12} />
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-cherry-dark" style={{ opacity: 0.55 }}>solo se puede mover</span>
                )}
                <button onClick={() => resetAdjusts(currentSlide)} className="ml-auto flex items-center gap-1 text-xs font-semibold text-cherry" style={{ opacity: 0.8 }}>
                  <RefreshCw size={11} /> Restablecer slide
                </button>
              </div>
            )
          })()}

          <div className="flex flex-wrap items-center gap-2">
              <PhotoSourceBar
                hasPhoto={!!photos[currentSlide]}
                onPick={src => setPhotoSrc(currentSlide, src)}
                onStabilize={src => stabilizePhoto(currentSlide, src)}
                uploadField={`s${currentSlide + 1}_foto`}
                onRemove={() => removePhoto(currentSlide)}
                stockTitle={`Foto del slide ${currentSlide + 1}`}
              />
              {photos[currentSlide] && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPhotoZoom(currentSlide, Math.max(1, (photos[currentSlide]?.scale ?? 1) - 0.1))} className="btn-ghost text-xs px-2 py-1.5">
                    <Minus size={12} />
                  </button>
                  <span className="text-xs text-cherry-dark" style={{ opacity: 0.6 }}>{Math.round((photos[currentSlide]?.scale ?? 1) * 100)}%</span>
                  <button onClick={() => setPhotoZoom(currentSlide, Math.min(2.5, (photos[currentSlide]?.scale ?? 1) + 0.1))} className="btn-ghost text-xs px-2 py-1.5">
                    <Plus size={12} />
                  </button>
                </div>
              )}
              {!photos[currentSlide] && (
                <p className="text-[10px] text-cherry-dark" style={{ opacity: 0.5 }}>Opcional: una foto de tu salón le da fuerza al slide (catálogo, cámara o subida).</p>
              )}
        </div>
        </div>

        {/* Export + guardar */}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={downloadAll} disabled={exporting} className="btn-primary text-sm">
            <Download size={15} /> {exporting ? `Descargando ${Math.min(currentSlide + 1, total)}/${total}…` : `Descargar carrusel (${total})`}
          </button>
          <button onClick={downloadOne.bind(null, currentSlide)} className="btn-ghost text-sm">
            <Download size={14} /> Slide {currentSlide + 1} solo
          </button>
          <button onClick={handleSave} disabled={saving || savedPlan} className="btn-secondary text-sm">
            <BookOpen size={15} /> {saving ? 'Guardando…' : savedPlan ? '✓ Guardado' : 'Guardar en biblioteca'}
          </button>
          {savedPlan && (
            <Link href="/biblioteca" className="flex items-center gap-1 text-sm font-semibold text-cherry hover:underline">
              Ver en biblioteca <ArrowRight size={14} />
            </Link>
          )}
          <button
            onClick={async () => {
              const caption = result.captionWithHashtags
              if (!caption) return
              try {
                await navigator.clipboard.writeText(caption)
                setCopiedCaption(true)
                setTimeout(() => setCopiedCaption(false), 2000)
              } catch {
                /* sin permiso de clipboard: el copy está en Biblioteca */
              }
            }}
            className="btn-ghost text-sm"
          >
            {copiedCaption ? <Check size={14} /> : <Copy size={14} />} {copiedCaption ? '¡Copiado!' : 'Copiar publicación'}
          </button>
        </div>
        <p className="text-xs text-cherry-dark" style={{ opacity: 0.5 }}>
          JPG 1080×1350 (4:5), orden 01-portada → {String(total).padStart(2, '0')}-final. Sin editor de vídeo ni filtros: listo para Instagram.
        </p>
      </div>
    )
  }

  return null
}

// ── Canvas de preview (misma función de render que el export) ───────────────

function SlideCanvas({
  opts,
  thumb = false,
  onEmitted,
  ...handlers
}: {
  opts: Parameters<typeof drawCarouselSlide>[1]
  thumb?: boolean
  onEmitted?: (boxes: EmittedTextBox[]) => void
} & React.CanvasHTMLAttributes<HTMLCanvasElement>) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    if (!onEmitted) {
      drawCarouselSlide(ref.current, opts)
      return
    }
    const buf: EmittedTextBox[] = []
    drawCarouselSlide(ref.current, { ...opts, emitTextBox: (e: EmittedTextBox) => buf.push(e) } as Parameters<typeof drawCarouselSlide>[1])
    onEmitted(buf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts])
  return (
    <canvas
      ref={ref}
      width={SLIDE_W}
      height={SLIDE_H}
      className={thumb ? 'w-full h-full block' : 'w-full h-auto block'}
      {...handlers}
    />
  )
}

function MiniCover({
  family,
  palette,
  slide,
  total,
  fontFamily,
  brandName,
  editorialAssets,
  serifFamily,
  scriptFamily,
}: {
  family: CarouselFamily
  palette: CarouselPalette
  slide?: SlideContent
  total: number
  fontFamily: string
  brandName?: string | null
  editorialAssets?: EditorialAssetsSpec | null
  serifFamily?: string
  scriptFamily?: string
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!ref.current || !slide) return
    drawCarouselSlide(ref.current, {
      slide,
      layout: 'cover',
      index: 0,
      total,
      family,
      palette,
      brandName,
      image: null,
      imageEl: null,
      fontFamily,
      editorialAssets,
      serifFamily,
      scriptFamily,
    })
  }, [slide, family, palette, total, fontFamily, brandName, editorialAssets, serifFamily, scriptFamily])
  if (!slide) return null
  return <canvas ref={ref} width={SLIDE_W} height={SLIDE_H} className="w-full h-auto block rounded-md" />
}

function triggerDownload(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}