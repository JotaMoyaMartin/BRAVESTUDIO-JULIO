'use client'
/**
 * Editor de fotos GRATIS del Estudio: filtros de salón, ajustes, encuadre
 * para Instagram y fondo (desenfocado o color) con vista previa en vivo.
 * Nada sale del móvil: sin IA de pago.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Eye, Images, LayoutGrid, Loader2, RotateCcw, Save, Sliders, Crop, Sparkles, Wand2 } from 'lucide-react'
import PhotoSourceBar from '@/components/editor/PhotoSourceBar'
import { useToast } from '@/components/ui/Toast'
import {
  ADJUST_FIELDS, ASPECTS, INITIAL_EDIT, NEUTRAL, PRESETS,
  canvasToBlob, loadImage, outputSize, renderEdit,
  type Adjust, type EditState,
} from '@/lib/estudio/adjust'
import { personMask } from '@/lib/estudio/segment'
import { saveMyPhoto } from '@/lib/estudio/my-photos'

type Panel = 'filtros' | 'ajustes' | 'encuadre' | 'fondo'

const BG_COLORS = [
  { name: 'Crema', color: '#F4EDE4' },
  { name: 'Arena', color: '#D9CDBE' },
  { name: 'Topo', color: '#9C8B7A' },
  { name: 'Gris piedra', color: '#BDB8B1' },
  { name: 'Burdeos', color: '#591427' },
  { name: 'Negro suave', color: '#1F1A1B' },
]

const PREVIEW_MAX_W = 720

export default function PhotoEditor({ initialSrc }: { initialSrc?: string | null }) {
  const router = useRouter()
  const toast = useToast()
  const [src, setSrc] = useState<string | null>(initialSrc ?? null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [state, setState] = useState<EditState>(INITIAL_EDIT)
  const [presetId, setPresetId] = useState('original')
  const [panel, setPanel] = useState<Panel>('filtros')
  const [mask, setMask] = useState<HTMLCanvasElement | null>(null)
  const [maskBusy, setMaskBusy] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [busy, setBusy] = useState<null | 'save' | 'download' | 'use'>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const thumbs = useRef<Record<string, HTMLCanvasElement | null>>({})

  useEffect(() => { if (initialSrc) setSrc(initialSrc) }, [initialSrc])

  // Cargar la foto
  useEffect(() => {
    if (!src) { setImg(null); return }
    let alive = true
    loadImage(src).then(i => {
      if (!alive) return
      setImg(i)
      setMask(null)
      setState(s => ({ ...s, zoom: 1, panX: 0, panY: 0, background: { kind: 'original' } }))
    }).catch(() => toast.show('No se pudo abrir esa foto', 'info'))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // Vista previa en vivo
  useEffect(() => {
    if (!img || !canvasRef.current) return
    const id = requestAnimationFrame(() => {
      const out = outputSize(state.aspect, img)
      const k = Math.min(1, PREVIEW_MAX_W / out.w)
      const view = showOriginal ? { ...state, adjust: NEUTRAL, background: { kind: 'original' as const } } : state
      renderEdit(canvasRef.current!, img, view, Math.round(out.w * k), Math.round(out.h * k), mask)
    })
    return () => cancelAnimationFrame(id)
  }, [img, state, mask, showOriginal])

  // Miniaturas de filtros
  useEffect(() => {
    if (!img || panel !== 'filtros') return
    const id = requestAnimationFrame(() => {
      for (const p of PRESETS) {
        const c = thumbs.current[p.id]
        if (c) renderEdit(c, img, { ...INITIAL_EDIT, adjust: p.adjust, aspect: '4:5' }, 120, 150)
      }
    })
    return () => cancelAnimationFrame(id)
  }, [img, panel])

  const setAdjust = (patch: Partial<Adjust>) => { setPresetId(''); setState(s => ({ ...s, adjust: { ...s.adjust, ...patch } })) }

  async function ensureMask(): Promise<boolean> {
    if (mask) return true
    if (!img) return false
    setMaskBusy(true)
    try {
      setMask(await personMask(img))
      return true
    } catch (e) {
      console.warn('[estudio] segment', e)
      toast.show('No hemos podido separar a la persona del fondo en este móvil', 'info')
      return false
    } finally {
      setMaskBusy(false)
    }
  }

  async function setBackground(bg: EditState['background']) {
    if (bg.kind !== 'original' && !(await ensureMask())) return
    setState(s => ({ ...s, background: bg }))
  }

  // Encuadre: arrastrar la foto
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, px: state.panX, py: state.panY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !canvasRef.current) return
    const r = canvasRef.current.getBoundingClientRect()
    const dx = (e.clientX - drag.current.x) / (r.width / 2)
    const dy = (e.clientY - drag.current.y) / (r.height / 2)
    const clamp = (v: number) => Math.max(-1, Math.min(1, v))
    setState(s => ({ ...s, panX: clamp(drag.current!.px - dx * s.zoom), panY: clamp(drag.current!.py - dy * s.zoom) }))
  }
  const onPointerUp = () => { drag.current = null }

  const exportBlob = useCallback(async () => {
    const c = document.createElement('canvas')
    const out = outputSize(state.aspect, img!)
    renderEdit(c, img!, state, out.w, out.h, mask)
    return canvasToBlob(c)
  }, [img, state, mask])

  async function download() {
    setBusy('download')
    try {
      const blob = await exportBlob()
      const name = `brave-foto-${Date.now().toString(36)}.jpg`
      const file = new File([blob], name, { type: 'image/jpeg' })
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
      if (isMobile && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return } catch { /* cancelado → descarga */ }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      toast.show('Foto descargada', 'success')
    } finally {
      setBusy(null)
    }
  }

  async function save(go?: '/carrusel' | '/stories') {
    setBusy(go ? 'use' : 'save')
    try {
      await saveMyPhoto(await exportBlob(), state.aspect)
      if (go) {
        toast.show('Guardada. Elígela en Catálogo → Mis fotos', 'success')
        router.push(go)
      } else {
        toast.show('Guardada en Mis fotos', 'success')
      }
    } catch {
      toast.show('No se pudo guardar la foto en este móvil', 'info')
    } finally {
      setBusy(null)
    }
  }

  if (!src || !img) {
    return (
      <div className="card p-6 sm:p-8 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rosa text-burdeos flex items-center justify-center"><Wand2 size={26} aria-hidden /></div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-ink">Elige la foto que quieres mejorar</p>
          <p className="text-[15px] text-tinta-2 max-w-md mx-auto">Luz, filtros de salón, encuadre para Instagram y fondo limpio. Todo en tu móvil, sin gastar nada.</p>
        </div>
        <div className="flex justify-center">
          <PhotoSourceBar hasPhoto={false} onPick={setSrc} onRemove={() => setSrc(null)} stockTitle="Elige una foto" />
        </div>
        {src && !img && <p className="text-sm text-tinta-2 flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Abriendo la foto…</p>}
      </div>
    )
  }

  const out = outputSize(state.aspect, img)
  const a = state.adjust

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* Vista previa */}
      <div className="lg:sticky lg:top-4 space-y-3">
        <div className="relative mx-auto rounded-2xl overflow-hidden bg-tinta shadow-[0_10px_40px_rgba(43,26,31,0.18)]"
          style={{ aspectRatio: `${out.w} / ${out.h}`, maxHeight: '68vh', maxWidth: '100%' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            aria-label="Vista previa de la foto editada (arrastra para encuadrar)"
          />
          {state.aspect === '9:16' && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-[13%] border-b border-dashed border-white/60 bg-black/10" />
              <div className="absolute inset-x-0 bottom-0 h-[20%] border-t border-dashed border-white/60 bg-black/10" />
            </div>
          )}
          {maskBusy && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 text-white text-sm text-center px-6">
              <Loader2 size={22} className="animate-spin" aria-hidden />
              Separando a la persona del fondo… <span className="text-white/70 text-xs">La primera vez tarda un poco más</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onPointerDown={() => setShowOriginal(true)} onPointerUp={() => setShowOriginal(false)} onPointerLeave={() => setShowOriginal(false)}
            className="btn-ghost text-sm select-none" aria-pressed={showOriginal}
          >
            <Eye size={15} aria-hidden /> Mantén para ver el original
          </button>
          <button onClick={() => { setState(INITIAL_EDIT); setPresetId('original'); }} className="btn-ghost text-sm"><RotateCcw size={15} aria-hidden /> Deshacer todo</button>
        </div>
      </div>

      {/* Controles */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-warm-gray" role="tablist">
          {([
            ['filtros', 'Filtros', <Sparkles key="i" size={15} />],
            ['ajustes', 'Ajustes', <Sliders key="i" size={15} />],
            ['encuadre', 'Encuadre', <Crop key="i" size={15} />],
            ['fondo', 'Fondo', <Images key="i" size={15} />],
          ] as const).map(([id, label, icon]) => (
            <button key={id} role="tab" aria-selected={panel === id} onClick={() => setPanel(id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 rounded-xl text-[13px] font-semibold transition-colors ${panel === id ? 'bg-white text-burdeos shadow-sm' : 'text-tinta-2'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {panel === 'filtros' && (
          <div className="-mx-1 flex gap-2.5 overflow-x-auto no-scrollbar px-1 pb-1">
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => { setPresetId(p.id); setState(s => ({ ...s, adjust: p.adjust })) }}
                aria-pressed={presetId === p.id} className="flex-shrink-0 w-[92px] space-y-1.5 text-center">
                <canvas ref={el => { thumbs.current[p.id] = el }} className={`w-full aspect-[4/5] rounded-xl border-2 ${presetId === p.id ? 'border-cereza' : 'border-transparent'}`} />
                <span className={`block text-[12px] font-semibold leading-tight ${presetId === p.id ? 'text-burdeos' : 'text-tinta-2'}`}>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {panel === 'ajustes' && (
          <div className="space-y-3.5">
            {ADJUST_FIELDS.map(f => (
              <label key={f.id} className="block space-y-1">
                <span className="flex justify-between text-[14px] font-semibold text-ink">
                  {f.name}<span className="text-tinta-2 font-normal tabular-nums">{a[f.id] > 0 && f.min < 0 ? '+' : ''}{a[f.id]}</span>
                </span>
                <input type="range" min={f.min} max={f.max} value={a[f.id]} onChange={e => setAdjust({ [f.id]: Number(e.target.value) })}
                  onDoubleClick={() => setAdjust({ [f.id]: 0 })} className="w-full accent-[var(--color-cereza)]" />
              </label>
            ))}
          </div>
        )}

        {panel === 'encuadre' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {ASPECTS.map(x => (
                <button key={x.id} onClick={() => setState(s => ({ ...s, aspect: x.id, panX: 0, panY: 0 }))} aria-pressed={state.aspect === x.id}
                  className={`rounded-xl border-2 py-2 text-center ${state.aspect === x.id ? 'border-cereza bg-rosa/40' : 'border-borde'}`}>
                  <span className="block text-[13px] font-semibold text-ink">{x.name}</span>
                  <span className="block text-[11px] text-tinta-2">{x.hint}</span>
                </button>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-[14px] font-semibold text-ink">Acercar</span>
              <input type="range" min={1} max={3} step={0.01} value={state.zoom} onChange={e => setState(s => ({ ...s, zoom: Number(e.target.value) }))} className="w-full accent-[var(--color-cereza)]" />
            </label>
            <p className="text-[13px] text-tinta-2">Arrastra la foto para colocarla.{state.aspect === '9:16' && ' Las franjas marcan dónde Instagram pone tu nombre y la barra de respuesta: deja la cara y el pelo fuera de ellas.'}</p>
          </div>
        )}

        {panel === 'fondo' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setBackground({ kind: 'original' })} aria-pressed={state.background.kind === 'original'}
                className={`rounded-xl border-2 py-2.5 text-[14px] font-semibold ${state.background.kind === 'original' ? 'border-cereza bg-rosa/40 text-burdeos' : 'border-borde text-ink'}`}>Fondo original</button>
              <button onClick={() => setBackground({ kind: 'blur', amount: 50 })} disabled={maskBusy} aria-pressed={state.background.kind === 'blur'}
                className={`rounded-xl border-2 py-2.5 text-[14px] font-semibold ${state.background.kind === 'blur' ? 'border-cereza bg-rosa/40 text-burdeos' : 'border-borde text-ink'}`}>Desenfocado</button>
            </div>
            {state.background.kind === 'blur' && (
              <label className="block space-y-1">
                <span className="text-[14px] font-semibold text-ink">Cuánto desenfoque</span>
                <input type="range" min={0} max={100} value={state.background.amount}
                  onChange={e => setState(s => ({ ...s, background: { kind: 'blur', amount: Number(e.target.value) } }))} className="w-full accent-[var(--color-cereza)]" />
              </label>
            )}
            <div className="space-y-2">
              <p className="text-[14px] font-semibold text-ink">O un color de estudio</p>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map(c => {
                  const on = state.background.kind === 'color' && state.background.color === c.color
                  return <button key={c.color} onClick={() => setBackground({ kind: 'color', color: c.color })} disabled={maskBusy} aria-pressed={on} aria-label={c.name} title={c.name}
                    className={`w-10 h-10 rounded-full border-2 transition-transform ${on ? 'border-cereza scale-110' : 'border-borde'}`} style={{ background: c.color }} />
                })}
              </div>
            </div>
            <p className="text-[13px] text-tinta-2">Funciona mejor con una sola persona y buena luz. Si algún mechón queda raro, prueba «Desenfocado»: disimula mucho mejor el borde.</p>
          </div>
        )}

        {/* Usar la foto */}
        <div className="border-t border-borde pt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => save('/carrusel')} disabled={!!busy} className="btn-primary justify-center text-sm"><Images size={15} aria-hidden /> Usar en carrusel</button>
            <button onClick={() => save('/stories')} disabled={!!busy} className="btn-primary justify-center text-sm"><LayoutGrid size={15} aria-hidden /> Usar en story</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={download} disabled={!!busy} className="btn-secondary justify-center text-sm">{busy === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} aria-hidden />} Descargar</button>
            <button onClick={() => save()} disabled={!!busy} className="btn-ghost justify-center text-sm">{busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} aria-hidden />} Guardar</button>
          </div>
          <button onClick={() => setSrc(null)} className="w-full text-[13px] font-semibold text-cereza py-1.5 hover:underline">Elegir otra foto</button>
        </div>
      </div>
    </div>
  )
}
