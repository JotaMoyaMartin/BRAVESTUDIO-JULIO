'use client'
/** Antes y después: dos fotos juntas, mismo filtro, listas para carrusel o story. */
import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Save } from 'lucide-react'
import PhotoSourceBar from '@/components/editor/PhotoSourceBar'
import { useToast } from '@/components/ui/Toast'
import { INITIAL_EDIT, PRESETS, canvasToBlob, loadImage, renderEdit } from '@/lib/estudio/adjust'
import { saveMyPhoto } from '@/lib/estudio/my-photos'

type Layout = 'lado' | 'arriba'
/** Para dónde es: story (9:16) o carrusel (4:5). */
type Formato = 'carrusel' | 'story'

const FORMATOS: Array<{ id: Formato; name: string; hint: string; aspect: string }> = [
  { id: 'carrusel', name: 'Carrusel', hint: '4:5 · 1080×1350', aspect: '4:5' },
  { id: 'story', name: 'Story', hint: '9:16 · 1080×1920', aspect: '9:16' },
]

function draw(canvas: HTMLCanvasElement, a: HTMLImageElement | null, b: HTMLImageElement | null, formato: Formato, layout: Layout, presetId: string, labels: boolean, W: number) {
  const H = formato === 'carrusel' ? Math.round(W * 1.25) : Math.round(W * 16 / 9)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#F4EDE4'
  ctx.fillRect(0, 0, W, H)
  const adjust = PRESETS.find(p => p.id === presetId)?.adjust ?? INITIAL_EDIT.adjust
  const gap = Math.round(W * 0.012)
  const cells = layout === 'lado'
    ? [{ x: 0, y: 0, w: (W - gap) / 2, h: H }, { x: (W + gap) / 2, y: 0, w: (W - gap) / 2, h: H }]
    : [{ x: 0, y: 0, w: W, h: (H - gap) / 2 }, { x: 0, y: (H + gap) / 2, w: W, h: (H - gap) / 2 }]
  ;[a, b].forEach((img, i) => {
    const c = cells[i]
    if (!img) {
      ctx.fillStyle = '#E6DDD2'
      ctx.fillRect(c.x, c.y, c.w, c.h)
      return
    }
    const t = document.createElement('canvas')
    renderEdit(t, img, { ...INITIAL_EDIT, adjust }, Math.round(c.w), Math.round(c.h))
    ctx.drawImage(t, c.x, c.y)
    if (labels) {
      const fs = Math.round(W * 0.034)
      ctx.font = `600 ${fs}px Montserrat, system-ui, sans-serif`
      const text = i === 0 ? 'ANTES' : 'DESPUÉS'
      const tw = ctx.measureText(text).width
      // En story, la etiqueta no baja a la zona de la barra de respuesta de Instagram (15 % inferior).
      const px = c.x + W * 0.035
      const py = Math.min(c.y + c.h - W * 0.05, formato === 'story' ? H * 0.84 : H)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.beginPath()
      ctx.roundRect(px - fs * 0.6, py - fs * 1.15, tw + fs * 1.2, fs * 1.6, fs * 0.8)
      ctx.fill()
      ctx.fillStyle = '#2B1A1F'
      ctx.letterSpacing = '0.08em'
      ctx.fillText(text, px, py)
    }
  })
}

export default function BeforeAfter() {
  const toast = useToast()
  const [srcA, setSrcA] = useState<string | null>(null)
  const [srcB, setSrcB] = useState<string | null>(null)
  const [imgA, setImgA] = useState<HTMLImageElement | null>(null)
  const [imgB, setImgB] = useState<HTMLImageElement | null>(null)
  const [formato, setFormato] = useState<Formato>('carrusel')
  const [layout, setLayout] = useState<Layout>('lado')
  const [presetId, setPresetId] = useState('natural')
  const [labels, setLabels] = useState(true)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => { srcA ? loadImage(srcA).then(setImgA).catch(() => setImgA(null)) : setImgA(null) }, [srcA])
  useEffect(() => { srcB ? loadImage(srcB).then(setImgB).catch(() => setImgB(null)) : setImgB(null) }, [srcB])
  useEffect(() => { if (ref.current) draw(ref.current, imgA, imgB, formato, layout, presetId, labels, 720) }, [imgA, imgB, formato, layout, presetId, labels])

  async function exportIt(kind: 'download' | 'save') {
    setBusy(true)
    try {
      const c = document.createElement('canvas')
      draw(c, imgA, imgB, formato, layout, presetId, labels, 1080)
      const blob = await canvasToBlob(c)
      if (kind === 'save') {
        await saveMyPhoto(blob, FORMATOS.find(f => f.id === formato)!.aspect)
        toast.show('Guardada en Mis fotos', 'success')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `antes-despues-${formato}.jpg`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
      }
    } finally {
      setBusy(false)
    }
  }

  const ready = imgA && imgB
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="lg:sticky lg:top-4">
        <canvas ref={ref} className="mx-auto block rounded-2xl shadow-[0_10px_40px_rgba(43,26,31,0.18)]" style={{ width: '100%', maxWidth: formato === 'carrusel' ? 520 : 380 }} aria-label="Vista previa del antes y después" />
      </div>
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="space-y-2">
          <p className="text-[14px] font-semibold text-ink">1. Foto del antes</p>
          <PhotoSourceBar hasPhoto={!!srcA} onPick={setSrcA} onRemove={() => setSrcA(null)} stockTitle="Foto del antes" />
        </div>
        <div className="space-y-2">
          <p className="text-[14px] font-semibold text-ink">2. Foto del después</p>
          <PhotoSourceBar hasPhoto={!!srcB} onPick={setSrcB} onRemove={() => setSrcB(null)} stockTitle="Foto del después" />
        </div>
        <div className="space-y-2">
          <p className="text-[14px] font-semibold text-ink">3. ¿Para dónde es?</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Formato">
            {FORMATOS.map(f => (
              <button key={f.id} role="radio" aria-checked={formato === f.id}
                onClick={() => { setFormato(f.id); setLayout(f.id === 'story' ? 'arriba' : 'lado') }}
                className={`rounded-xl border-2 py-2.5 flex items-center justify-center gap-2.5 ${formato === f.id ? 'border-cereza bg-rosa/40' : 'border-borde'}`}>
                <span aria-hidden className="rounded-[3px] border-2 border-current text-cereza" style={{ width: 14, height: f.id === 'story' ? 25 : 18 }} />
                <span className="text-left"><span className="block text-[14px] font-semibold text-ink">{f.name}</span><span className="block text-[11px] text-tinta-2">{f.hint}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[14px] font-semibold text-ink">Cómo van las fotos</p>
          <div className="grid grid-cols-2 gap-2">
            {([['lado', 'Lado a lado', 'una junto a otra'], ['arriba', 'Una encima', 'antes arriba']] as const).map(([id, name, hint]) => (
              <button key={id} onClick={() => setLayout(id)} aria-pressed={layout === id}
                className={`rounded-xl border-2 py-2 ${layout === id ? 'border-cereza bg-rosa/40' : 'border-borde'}`}>
                <span className="block text-[13px] font-semibold text-ink">{name}</span><span className="block text-[11px] text-tinta-2">{hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[14px] font-semibold text-ink">Mismo filtro en las dos</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.filter(p => p.id !== 'bn').map(p => (
              <button key={p.id} className="chip" aria-pressed={presetId === p.id} onClick={() => setPresetId(p.id)}>{p.name}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} className="w-4 h-4 accent-[var(--color-cereza)]" />
          Poner «Antes» y «Después»
        </label>
        <div className="grid grid-cols-2 gap-2 border-t border-borde pt-4">
          <button onClick={() => exportIt('download')} disabled={!ready || busy} className="btn-primary justify-center text-sm">{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} aria-hidden />} Descargar</button>
          <button onClick={() => exportIt('save')} disabled={!ready || busy} className="btn-secondary justify-center text-sm"><Save size={15} aria-hidden /> Guardar</button>
        </div>
        {!ready && <p className="text-[13px] text-tinta-2">Elige las dos fotos para descargar.</p>}
      </div>
    </div>
  )
}
