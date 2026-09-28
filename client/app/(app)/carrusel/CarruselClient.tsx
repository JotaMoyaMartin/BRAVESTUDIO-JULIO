'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { generateCarousel, CarouselOutput } from '@/lib/ai/prompts/carousels'
import { ContentObjective } from '@/lib/ai/prompts/reels'
import { buildBrandFullContext, hasBrandContext, BrandFullContextInput } from '@/lib/ai/brand-context'
import { useSessionState } from '@/lib/session-store'
import { saveToLibrary } from '@/lib/content-utils'
import { CAROUSEL_FAMILIES, getFamily, brandMarkText } from '@/lib/carousel/templates'
import { drawCarouselSlide, ensureCanvasFont, exportFileName, SLIDE_W, SLIDE_H } from '@/lib/carousel/render'
import { pickLayout } from '@/lib/carousel/text'
import type { SlideContent, CarouselFamily, CarouselPalette, SlideImage } from '@/lib/carousel/types'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
import BraviGuide from '@/components/bravi/BraviGuide'
import {
  Images, Sparkles, RefreshCw, Download, BookOpen, ArrowRight, Upload, Trash2, Check,
  Copy, Minus, Plus, Layers,
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
  const [photos, setPhotos] = useState<Record<number, SlideImage>>({})
  const [imgVersion, setImgVersion] = useState(0)
  const imgElsRef = useRef<Record<number, HTMLImageElement>>({})
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

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
  }, [])

  const familyDef = getFamily(family)
  const palette: CarouselPalette = familyDef.palettes[Math.min(paletteIdx, familyDef.palettes.length - 1)]
  const slides: SlideContent[] = result?.slides ?? []
  const total = slides.length

  const renderOpts = useCallback(
    (i: number) => ({
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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slides, total, family, palette, salonName, photos, fontFamily, imgVersion],
  )

  function imgElsMap(): Map<number, HTMLImageElement> {
    return new Map(Object.entries(imgElsRef.current).map(([k, v]) => [Number(k), v]))
  }

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
    setGenerating(false)
  }

  function updateSlideText(number: number, text: string) {
    setResult(prev => (prev ? { ...prev, slides: prev.slides.map(s => (s.number === number ? { ...s, text } : s)) } : prev))
  }

  // --- Fotos del salón (en memoria en V1) ---
  function handlePhoto(index0: number, file: File) {
    const src = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgElsRef.current[index0] = img
      setImgVersion(v => v + 1)
    }
    img.src = src
    setPhotos(prev => ({ ...prev, [index0]: { src, scale: 1, offsetX: 0, offsetY: 0 } }))
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

  const panFor = (index0: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!photos[index0]) return
      dragRef.current = { x: e.clientX, y: e.clientY, ox: photos[index0].offsetX, oy: photos[index0].offsetY }
      ;(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragRef.current || !photos[index0]) return
      const w = e.currentTarget.clientWidth || 1
      const dx = (e.clientX - dragRef.current.x) / w
      const dy = (e.clientY - dragRef.current.y) / w
      const ox = Math.max(-1, Math.min(1, dragRef.current.ox + dx))
      const oy = Math.max(-1, Math.min(1, dragRef.current.oy + dy))
      setPhotos(prev => ({ ...prev, [index0]: { ...prev[index0], offsetX: ox, offsetY: oy } }))
    },
    onPointerUp: () => {
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
    const hasPhotoCurrent = !!imgElsMap().has(currentSlide)
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
        <div className="grid grid-cols-3 gap-2.5">
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
              <MiniCover family={f.id} palette={f.palettes[0]} slide={slides[0]} total={total} fontFamily={fontFamily} brandName={brandMarkText(salonName)} />
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
            style={{ boxShadow: '0 10px 32px -12px rgba(122,24,50,0.35)', touchAction: photos[currentSlide] ? 'none' : 'auto', cursor: photos[currentSlide] ? 'grab' : 'auto' }}
          >
            <SlideCanvas opts={renderOpts(currentSlide)} key={`${currentSlide}-${imgVersion}-${fontFamily}`} {...(photos[currentSlide] ? panFor(currentSlide) : {})} />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {slides.map((s, i) => (
              <button
                key={s.number}
                onClick={() => setCurrentSlide(i)}
                className="relative flex-shrink-0 rounded-lg overflow-hidden"
                style={{ width: 72, border: currentSlide === i ? '2px solid var(--color-cherry)' : '1.5px solid rgba(122,24,50,0.15)' }}
              >
                <SlideCanvas opts={renderOpts(i)} thumb />
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

          <div className="flex flex-wrap items-center gap-2">
              <label className="btn-ghost text-sm cursor-pointer">
                <Upload size={13} /> {photos[currentSlide] ? 'Cambiar foto' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handlePhoto(currentSlide, f)
                    e.currentTarget.value = ''
                  }}
                />
              </label>
              {photos[currentSlide] && (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPhotoZoom(currentSlide, Math.max(1, (photos[currentSlide]?.scale ?? 1) - 0.1))} className="btn-ghost text-xs px-2 py-1.5">
                      <Minus size={12} />
                    </button>
                    <span className="text-xs text-cherry-dark" style={{ opacity: 0.6 }}>{Math.round((photos[currentSlide]?.scale ?? 1) * 100)}%</span>
                    <button onClick={() => setPhotoZoom(currentSlide, Math.min(2.5, (photos[currentSlide]?.scale ?? 1) + 0.1))} className="btn-ghost text-xs px-2 py-1.5">
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => removePhoto(currentSlide)}
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: 'var(--color-cherry)', opacity: 0.7 }}
                  >
                    <Trash2 size={12} /> Quitar foto
                  </button>
                  <p className="w-full text-[10px] text-cherry-dark" style={{ opacity: 0.5 }}>Arrastra la imagen para encuadrarla.</p>
                </>
              )}
              {!photos[currentSlide] && (
                <p className="text-[10px] text-cherry-dark" style={{ opacity: 0.5 }}>Opcional: una foto de tu salón le da fuerza al slide.</p>
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
  ...handlers
}: {
  opts: Parameters<typeof drawCarouselSlide>[1]
  thumb?: boolean
} & React.CanvasHTMLAttributes<HTMLCanvasElement>) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (ref.current) drawCarouselSlide(ref.current, opts)
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
}: {
  family: CarouselFamily
  palette: CarouselPalette
  slide?: SlideContent
  total: number
  fontFamily: string
  brandName?: string | null
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
    })
  }, [slide, family, palette, total, fontFamily, brandName])
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