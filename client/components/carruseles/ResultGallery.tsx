'use client'
/**
 * RESULTADO — Carrusel 2.0 (21-oct-2026): cada slide es foto + texto en capas
 * HTML. Tocas una slide y la editas abajo: texto, tipografía, composición,
 * tamaño, color del texto y fondo (foto IA, tuya, del banco o color de marca).
 * Nada de esto regenera la imagen. La descarga exporta lo que ves (1080×1350).
 */
import { useRef, useState } from 'react'
import {
  BookOpen, Check, Copy, Download, Loader2, RefreshCw, Shuffle, Sparkles, Type, LayoutGrid, Image as ImageIcon,
  Palette, Minus, Plus, Wand2,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import PhotoSourceBar from '@/components/editor/PhotoSourceBar'
import { BANCO_RECORTES } from '@/lib/banco-ia-files'
import ComposedSlide from './ComposedSlide'
import type { SlideResult, StyleConfig } from '@/lib/carruseles/types'
import { visualTypeLabel } from '@/lib/carruseles/styles'
import {
  BRAND_COLORS, FONT_PAIRS, LAYOUTS, bankPhotoFor, type SlideDesign,
} from '@/lib/carruseles/composer'

interface Props {
  style: Pick<StyleConfig, 'name'>
  topic: string
  results: SlideResult[]
  designs: SlideDesign[]
  signature?: string
  caption?: string
  busyIndex: number | null
  saving: boolean
  saved: boolean
  imagesExpired?: boolean
  onDesignChange: (index: number, patch: Partial<SlideDesign>) => void
  onDesignAll: (patch: Partial<SlideDesign>) => void
  onTextChange: (index: number, text: string, support?: string) => void
  /** Nueva foto IA (sin texto) para esa slide; newVisual = otro encuadre. */
  onRegenerateImage: (index: number, newVisual?: boolean) => void
  onRegenerateAll: () => void
  onSave?: () => void
  onNew: () => void
  /** 'story' = 9:16 con zonas seguras (Diseña tus stories). */
  format?: 'carrusel' | 'story'
  /** false = sin botones de foto IA (solo banco, foto propia o color). */
  aiImages?: boolean
  heading?: string
  newLabel?: string
  /** Botones extra de la cabecera (p. ej. «Añadir a mi plan»). */
  extraActions?: React.ReactNode
}

type Panel = 'texto' | 'letra' | 'composicion' | 'fondo'

export default function ResultGallery(props: Props) {
  const { style, results, designs } = props
  const [active, setActive] = useState(0)
  const [panel, setPanel] = useState<Panel>('texto')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState<number | 'all' | null>(null)
  const exportRefs = useRef<Array<HTMLDivElement | null>>([])

  const r = results[active]
  const d = designs[active]
  const total = results.length
  const story = props.format === 'story'
  const ratio = story ? '9:16' as const : '4:5' as const
  const H = story ? 1920 : 1350
  const unit = story ? 'Story' : 'Slide'
  const ai = props.aiImages !== false

  async function exportSlide(i: number): Promise<Blob | null> {
    const node = exportRefs.current[i]
    if (!node) return null
    const { toBlob } = await import('html-to-image')
    // Doble pasada: la primera carga fuentes e imágenes en el clon.
    await toBlob(node, { width: 1080, height: H, pixelRatio: 1, cacheBust: true }).catch(() => null)
    return toBlob(node, { width: 1080, height: H, pixelRatio: 1, cacheBust: true })
  }

  async function download(which: number | 'all') {
    if (downloading !== null) return
    setDownloading(which)
    try {
      const idxs = which === 'all' ? results.map((_, i) => i) : [which]
      const files: File[] = []
      for (const i of idxs) {
        const blob = await exportSlide(i)
        if (blob) files.push(new File([blob], `${story ? 'story' : 'carrusel'}-${String(i + 1).padStart(2, '0')}.png`, { type: 'image/png' }))
      }
      if (files.length === 0) return
      const isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent)
      if (isMobile && navigator.canShare?.({ files })) {
        try { await navigator.share({ files }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
      }
      for (const f of files) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(f)
        a.download = f.name
        a.click()
        URL.revokeObjectURL(a.href)
        await new Promise(res => setTimeout(res, 300))
      }
    } finally {
      setDownloading(null)
    }
  }

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(props.caption || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch { /* bloqueado: sin aviso */ }
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-tinta-2">{story ? 'Plantilla' : 'Estilo'} {style.name}</p>
          <h2 className="text-2xl font-semibold text-burdeos">{props.heading ?? 'Tu carrusel está listo'}</h2>
          <p className="text-[14px] text-tinta-2 max-w-lg truncate">{props.topic}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="md" icon={<Download className="w-4 h-4" />} loading={downloading === 'all'} onClick={() => download('all')}>
            {total === 1 ? 'Descargar' : `Descargar las ${total}`}
          </Button>
          {props.extraActions}
          {props.onSave && <Button variant="secondary" size="md" icon={props.saved ? <Check className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />} loading={props.saving} onClick={props.onSave} disabled={props.saved || props.saving}>
            {props.saved ? 'Guardado' : 'Guardar'}
          </Button>}
        </div>
      </div>

      {props.imagesExpired && (
        <p className="text-[13px] text-tinta-2 rounded-2xl bg-warm-gray px-4 py-3">Las fotos IA de esta sesión han caducado: genera una nueva o elige otra foto en «Fondo».</p>
      )}

      {/* Tira de slides: toca una para editarla */}
      <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1" role="listbox" aria-label={story ? "Stories" : "Slides del carrusel"}>
        {results.map((res, i) => (
          <button
            key={i}
            role="option"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`snap-start flex-shrink-0 ${story ? 'w-[96px] sm:w-[110px]' : 'w-[150px] sm:w-[170px]'} rounded-2xl overflow-hidden transition-all ${i === active ? 'ring-[3px] ring-cereza ring-offset-2 ring-offset-cream' : 'opacity-80 hover:opacity-100'}`}
          >
            <div className="relative">
              <ComposedSlide ratio={ratio} design={designs[i]} title={res.text} support={res.support} index={i} total={total} signature={props.signature} />
              {(props.busyIndex === i || res.status === 'generating') && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader2 className="w-6 h-6 text-white animate-spin" /></span>
              )}
            </div>
          </button>
        ))}
      </div>

      {r && d && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr] items-start">
          {/* Vista grande */}
          <div className="space-y-2 lg:sticky lg:top-6">
            <div className={`rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-medium)] mx-auto lg:mx-0 ${story ? 'max-w-[300px]' : 'max-w-[420px]'}`}>
              <ComposedSlide ratio={ratio} design={d} title={r.text} support={r.support} index={active} total={total} signature={props.signature} />
            </div>
            <div className="flex items-center justify-between max-w-[420px] mx-auto lg:mx-0">
              <span className="text-[14px] font-semibold text-burdeos">{unit} {active + 1} de {total} {!story && <span className="text-tinta-2 font-normal">· {visualTypeLabel(r.visual)}</span>}</span>
              <button onClick={() => download(active)} className="btn-ghost text-sm" disabled={downloading !== null}>
                {downloading === active ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} aria-hidden />} {story ? 'Esta story' : 'Esta slide'}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="card p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-warm-gray p-1" role="tablist">
              {([
                ['texto', 'Texto', <Type key="t" size={16} aria-hidden />],
                ['letra', 'Letra', <Palette key="l" size={16} aria-hidden />],
                ['composicion', 'Diseño', <LayoutGrid key="c" size={16} aria-hidden />],
                ['fondo', 'Fondo', <ImageIcon key="f" size={16} aria-hidden />],
              ] as const).map(([id, label, icon]) => (
                <button key={id} role="tab" aria-selected={panel === id} onClick={() => setPanel(id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${panel === id ? 'bg-white text-cereza shadow-sm' : 'text-cherry-dark/70'}`}>
                  {icon}{label}
                </button>
              ))}
            </div>

            {panel === 'texto' && (
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-[14px] font-semibold text-ink">Titular</span>
                  <textarea
                    value={r.text}
                    onChange={e => props.onTextChange(active, e.target.value, r.support)}
                    rows={3}
                    maxLength={220}
                    className="input-field resize-none"
                  />
                </label>
                <p className="text-[13px] text-tinta-2">
                  {d.layout === 'marco'
                    ? 'En Póster el titular se parte en dos bloques. Pon una barra | donde quieras cortarlo.'
                    : 'Pon **dos asteriscos** alrededor de una palabra para destacarla con la letra de acento.'}
                </p>
                <label className="block space-y-1.5">
                  <span className="text-[14px] font-semibold text-ink">Texto de apoyo <span className="font-normal text-tinta-2">(opcional)</span></span>
                  <textarea
                    value={r.support || ''}
                    onChange={e => props.onTextChange(active, r.text, e.target.value || undefined)}
                    rows={2}
                    maxLength={180}
                    className="input-field resize-none"
                  />
                </label>
                {(d.layout === 'silencio' || d.layout === 'marco') && (
                  <label className="block space-y-1.5">
                    <span className="text-[14px] font-semibold text-ink">Frase final <span className="font-normal text-tinta-2">(opcional, en mayúsculas pequeñas)</span></span>
                    <input value={d.note || ''} maxLength={90} onChange={e => props.onDesignChange(active, { note: e.target.value || undefined })} className="input-field" />
                  </label>
                )}
                <Stepper
                  label="Tamaño del titular"
                  value={`${Math.round(d.scale * 100)} %`}
                  onMinus={() => props.onDesignChange(active, { scale: Math.max(0.7, +(d.scale - 0.1).toFixed(2)) })}
                  onPlus={() => props.onDesignChange(active, { scale: Math.min(1.4, +(d.scale + 0.1).toFixed(2)) })}
                />
              </div>
            )}

            {panel === 'letra' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {FONT_PAIRS.map(p => {
                    const on = d.fontPair === p.id
                    return (
                      <button key={p.id} onClick={() => props.onDesignChange(active, { fontPair: p.id })} aria-pressed={on}
                        className={`text-left rounded-2xl border-[1.5px] px-3 py-2.5 transition-colors ${on ? 'border-cereza bg-mantequilla/60' : 'border-borde bg-white hover:border-cereza'}`}>
                        <span className="block text-[22px] leading-none text-ink truncate" style={{ fontFamily: p.title.family, fontWeight: p.title.weight, textTransform: p.title.upper ? 'uppercase' : 'none' }}>
                          Tu pelo <span style={{ fontFamily: p.accent.family, fontStyle: p.accent.italic ? 'italic' : 'normal', color: '#7A1832', textTransform: 'none' }}>brilla</span>
                        </span>
                        <span className="block mt-1 text-[13px] font-semibold text-burdeos">{p.name}</span>
                        <span className="block text-[12px] text-tinta-2 leading-snug">{p.hint}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-ink">Color del texto</span>
                  <div className="flex rounded-full bg-warm-gray p-0.5">
                    {(['claro', 'oscuro'] as const).map(t => (
                      <button key={t} onClick={() => props.onDesignChange(active, { tone: t })} aria-pressed={d.tone === t}
                        className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold ${d.tone === t ? 'bg-cereza text-white' : 'text-cherry-dark/70'}`}>
                        {t === 'claro' ? 'Claro' : 'Oscuro'}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => props.onDesignAll({ fontPair: d.fontPair, tone: d.tone })} className="btn-ghost w-full justify-center text-sm">
                  <Wand2 size={15} aria-hidden /> Usar esta letra en {story ? 'todas las stories' : 'todas las slides'}
                </button>
              </div>
            )}

            {panel === 'composicion' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {LAYOUTS.map(l => {
                    const on = d.layout === l.id
                    return (
                      <button key={l.id} onClick={() => props.onDesignChange(active, l.id === 'recorte' && !d.cutouts?.length
                        ? { layout: l.id, cutouts: BANCO_RECORTES.slice(0, 3), bg: d.bg.kind === 'color' ? d.bg : { kind: 'color', color: '#9C8B7A' }, tone: 'claro', overlay: 0 }
                        : { layout: l.id })} aria-pressed={on} title={l.hint}
                        className={`rounded-2xl border-[1.5px] p-2 flex flex-col items-center gap-1.5 transition-colors ${on ? 'border-cereza bg-mantequilla/60' : 'border-borde bg-white hover:border-cereza'}`}>
                        <LayoutIcon id={l.id} />
                        <span className="text-[13px] font-semibold text-burdeos">{l.name}</span>
                      </button>
                    )
                  })}
                </div>
                {(d.layout === 'revista' || d.layout === 'tarjeta' || d.layout === 'silencio' || d.layout === 'recorte') && (
                  <label className="block space-y-1.5">
                    <span className="text-[14px] font-semibold text-ink">Etiqueta <span className="font-normal text-tinta-2">(opcional, p. ej. «Balayage»)</span></span>
                    <input value={d.label || ''} maxLength={28} onChange={e => props.onDesignChange(active, { label: e.target.value || undefined })} className="input-field" />
                  </label>
                )}
                {d.bg.kind === 'photo' && (
                  <Stepper
                    label="Oscurecer la foto"
                    value={`${Math.round(d.overlay * 100)} %`}
                    onMinus={() => props.onDesignChange(active, { overlay: Math.max(0, +(d.overlay - 0.1).toFixed(2)) })}
                    onPlus={() => props.onDesignChange(active, { overlay: Math.min(0.7, +(d.overlay + 0.1).toFixed(2)) })}
                  />
                )}
              </div>
            )}

            {panel === 'fondo' && (
              <div className="space-y-3">
                {d.layout === 'recorte' && (
                  <div className="space-y-2">
                    <p className="text-[14px] font-semibold text-ink">Personas recortadas <span className="font-normal text-tinta-2">(elige hasta 3)</span></p>
                    <div className="grid grid-cols-4 gap-2">
                      {BANCO_RECORTES.map(src => {
                        const list = d.cutouts || []
                        const on = list.includes(src)
                        return (
                          <button key={src} aria-pressed={on} aria-label={on ? 'Quitar persona' : 'Añadir persona'}
                            onClick={() => props.onDesignChange(active, { cutouts: on ? list.filter(x => x !== src) : [...list, src].slice(-3) })}
                            className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 ${on ? 'border-cereza' : 'border-borde'}`}
                            style={{ background: d.bg.kind === 'color' ? d.bg.color : '#9C8B7A' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="absolute inset-0 w-full h-full object-contain object-bottom" />
                            {on && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-cereza text-white text-[11px] font-bold flex items-center justify-center">{list.indexOf(src) + 1}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {d.layout !== 'recorte' && <>
                <p className="text-[14px] font-semibold text-ink">Foto</p>
                {ai ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => props.onRegenerateImage(active)} disabled={props.busyIndex !== null} className="btn-secondary justify-center text-sm">
                      <Sparkles size={15} aria-hidden /> Nueva foto IA
                    </button>
                    <button onClick={() => props.onRegenerateImage(active, true)} disabled={props.busyIndex !== null} className="btn-ghost justify-center text-sm">
                      <Shuffle size={15} aria-hidden /> Otro encuadre
                    </button>
                  </div>
                ) : (
                  <button onClick={() => props.onRegenerateImage(active)} className="btn-secondary w-full justify-center text-sm">
                    <Shuffle size={15} aria-hidden /> Otra foto BRÄVE
                  </button>
                )}
                <PhotoSourceBar
                  hasPhoto={d.bg.kind === 'photo'}
                  onPick={src => props.onDesignChange(active, { bg: { kind: 'photo', src, source: src.startsWith('/') ? 'banco' : 'propia' }, overlay: d.overlay || 0.3 })}
                  onStabilize={src => props.onDesignChange(active, { bg: { kind: 'photo', src, source: 'propia' } })}
                  onRemove={() => props.onDesignChange(active, { bg: { kind: 'photo', src: bankPhotoFor(r.visual, active), source: 'banco' } })}
                  uploadField={`${story ? 'story' : 'carrusel'}-${active + 1}`}
                  stockTitle={`Foto de la slide ${active + 1}`}
                  labels={{ upload: 'Mi foto', remove: 'Foto del banco' }}
                />
                </>}
                <p className="text-[14px] font-semibold text-ink pt-1">{d.layout === 'recorte' ? 'Color de fondo' : 'O un color de marca'}</p>
                <div className="flex flex-wrap gap-2">
                  {BRAND_COLORS.map(c => {
                    const on = d.bg.kind === 'color' && d.bg.color === c.color
                    return (
                      <button key={c.color} onClick={() => props.onDesignChange(active, { bg: { kind: 'color', color: c.color }, tone: c.tone, overlay: 0 })}
                        aria-pressed={on} aria-label={c.name} title={c.name}
                        className={`w-10 h-10 rounded-full border-2 transition-transform ${on ? 'border-cereza scale-110' : 'border-borde'}`}
                        style={{ background: c.color }} />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Acciones secundarias */}
      <div className="flex flex-wrap gap-2">
        {ai && <button onClick={props.onRegenerateAll} disabled={props.busyIndex !== null} className="btn-ghost text-sm"><RefreshCw size={15} aria-hidden /> Nuevas fotos IA para todas</button>}
        <button onClick={props.onNew} className="btn-ghost text-sm"><Sparkles size={15} aria-hidden /> {props.newLabel ?? 'Nuevo carrusel'}</button>
      </div>

      {props.caption && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <p className="text-[14px] font-semibold text-ink">Texto para la publicación</p>
            <button onClick={copyCaption} className="text-[13px] font-semibold text-cereza inline-flex items-center gap-1">
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-[15px] text-ink/85 leading-relaxed whitespace-pre-line">{props.caption}</p>
        </div>
      )}

      {/* Lienzos de exportación a tamaño real (fuera de pantalla) */}
      <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, width: 1080, pointerEvents: 'none' }}>
        {results.map((res, i) => (
          <div key={i} style={{ width: 1080 }}>
            <ComposedSlide ratio={ratio} ref={el => { exportRefs.current[i] = el }} design={designs[i]} title={res.text} support={res.support} index={i} total={total} signature={props.signature} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={onMinus} className="w-10 h-10 rounded-full bg-warm-gray text-cherry-dark flex items-center justify-center" aria-label={`Menos: ${label}`}><Minus size={16} /></button>
        <span className="w-14 text-center text-[14px] font-semibold tabular-nums">{value}</span>
        <button onClick={onPlus} className="w-10 h-10 rounded-full bg-warm-gray text-cherry-dark flex items-center justify-center" aria-label={`Más: ${label}`}><Plus size={16} /></button>
      </div>
    </div>
  )
}

/** Mini esquema de cada composición (dónde va el texto). */
function LayoutIcon({ id }: { id: string }) {
  const bar = (style: React.CSSProperties) => <span className="absolute rounded-sm bg-cereza" style={style} />
  return (
    <span className="relative block w-10 h-12 rounded-md bg-rosa overflow-hidden">
      {id === 'abajo' && (<>{bar({ left: 5, right: 9, bottom: 13, height: 5 })}{bar({ left: 5, right: 16, bottom: 6, height: 4, opacity: 0.6 })}</>)}
      {id === 'arriba' && (<>{bar({ left: 5, right: 9, top: 6, height: 5 })}{bar({ left: 5, right: 16, top: 13, height: 4, opacity: 0.6 })}</>)}
      {id === 'centro' && (<>{bar({ left: 6, right: 6, top: 19, height: 5 })}{bar({ left: 10, right: 10, top: 26, height: 3, opacity: 0.6 })}</>)}
      {id === 'revista' && (<>{bar({ left: 5, width: 8, top: 5, height: 5 })}{bar({ left: 5, right: 9, bottom: 8, height: 6 })}</>)}
      {id === 'tarjeta' && (<span className="absolute left-1.5 right-1.5 bottom-1.5 h-5 rounded bg-white flex items-center px-1"><span className="h-1.5 w-full rounded-sm bg-cereza" /></span>)}
      {id === 'silencio' && (<>{bar({ left: 14, right: 14, top: 14, height: 2, opacity: 0.6 })}{bar({ left: 6, right: 6, top: 19, height: 5 })}{bar({ left: 10, right: 10, top: 27, height: 2, opacity: 0.6 })}{bar({ left: 10, right: 10, top: 30, height: 2, opacity: 0.6 })}</>)}
      {id === 'marco' && (<><span className="absolute left-1 right-1 top-3 bottom-4 rounded-sm bg-white/70" />{bar({ left: 1, width: 18, top: 1.5, height: 4, background: '#E8C552' })}{bar({ right: 1, width: 22, bottom: 2.5, height: 4, background: '#E8C552' })}</>)}
      {id === 'recorte' && (<>{bar({ left: 8, right: 8, top: 7, height: 4 })}<span className="absolute bottom-0 left-1 w-4 h-6 rounded-t-full bg-cereza/50" /><span className="absolute bottom-0 left-3.5 w-4 h-7 rounded-t-full bg-cereza/80" /><span className="absolute bottom-0 right-1 w-4 h-6 rounded-t-full bg-cereza/60" /></>)}
      {id === 'lateral' && (<>{bar({ left: 5, width: 16, top: 16, height: 5 })}{bar({ left: 5, width: 12, top: 24, height: 3, opacity: 0.6 })}</>)}
    </span>
  )
}

