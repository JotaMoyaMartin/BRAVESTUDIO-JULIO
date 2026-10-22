'use client'
// StoryEditorOverlay — editor visual 9:16 de UNA story (D3: overlay fullscreen
// dentro de /stories, sin ruta nueva). Preview y export llaman a la MISMA
// drawStoryCanvas: WYSIWYG por construcción. Handles DOM = overlay aparte
// (nunca parte del render → export limpio). Patrón drag validado de Carrusel:
// id/datos del drag en refs (no en estado) + opts memoizados arriba de todo.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Check, Download, Image as ImageIcon, Minus, Palette, Plus, RefreshCw, Sun,
} from 'lucide-react'
import PhotoSourceBar from './PhotoSourceBar'
import { ensureCanvasFont } from '@/lib/carousel/render'
import {
  Rect,
  STORY_H,
  STORY_PALETTES,
  STORY_W,
  drawStoryCanvas,
  storyExportFileName,
} from '@/lib/stories/render'
import { StoryVisual } from '@/lib/editor/types'

const HIT_TOL = 24 // px de canvas de tolerancia alrededor de la caja de texto

interface StoryEditorOverlayProps {
  open: boolean
  onClose: () => void
  /** 1-based, para el título y el nombre del JPG (story-01de03.jpg). */
  storyNumber: number
  total: number
  /** Texto de la story que escribe la IA (no editable aquí: eso vive en /stories). */
  text: string
  visual: StoryVisual
  onChange: (visual: StoryVisual) => void
}

export default function StoryEditorOverlay({ open, onClose, storyNumber, total, text, visual, onChange }: StoryEditorOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageElRef = useRef<HTMLImageElement | null>(null)
  const [imgTick, setImgTick] = useState(0)
  const [photoDead, setPhotoDead] = useState(false)
  const boxRef = useRef<Rect | null>(null)
  const [boxTick, setBoxTick] = useState(0)
  const textDragRef = useRef<{ x: number; y: number; bx: number; by: number } | null>(null)
  const photoDragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  // Familia canvas real: 'Poppins' directo NO matchea la @font-face interna de
  // next/font (serif fallback) — mismos helpers que usa el editor de carrusel.
  const [fontFamily, setFontFamily] = useState('sans-serif')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ensureCanvasFont().then(fam => { if (!cancelled) setFontFamily(fam) })
    return () => { cancelled = true }
  }, [open])

  // Cargar la foto de fondo cuando cambia el src (blob de cámara/subida o ruta
  // de catálogo). blob muerto tras reload → onerror → aviso "Reelige la foto".
  useEffect(() => {
    if (!open) return
    const src = visual.photo?.src
    if (visual.background !== 'photo' || !src) {
      imageElRef.current = null
      setImgTick(t => t + 1)
      return
    }
    let cancelled = false
    const img = new Image()
    // La URL firmada de Storage es cross-origin: sin CORS el canvas quedará
    // manchado y el export JPG fallaría (SecurityError en toBlob).
    img.crossOrigin = 'anonymous'
    img.onload = () => { if (cancelled) return; imageElRef.current = img; setPhotoDead(false); setImgTick(t => t + 1) }
    img.onerror = () => { if (cancelled) return; imageElRef.current = null; setPhotoDead(true); setImgTick(t => t + 1) }
    img.src = src
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visual.background, visual.photo?.src])

  // Opts memorizados (lección F1: opts inline re-dibujan cada render → loop).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drawOpts = useMemo(() => ({
    text,
    visual,
    imageEl: imageElRef.current,
    fontFamily,
  }), [text, visual, imgTick, open, fontFamily])

  useEffect(() => {
    if (!open || !canvasRef.current) return
    const buf: Rect[] = []
    drawStoryCanvas(canvasRef.current, { ...drawOpts, emitTextBox: r => buf.push(r) })
    boxRef.current = buf[0] ?? null
    setBoxTick(t => t + 1)
  }, [drawOpts, open])

  if (!open) return null

  function pointFrom(e: React.PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - box.left) / (box.width || 1)) * STORY_W,
      y: ((e.clientY - box.top) / (box.height || 1)) * STORY_H,
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const p = pointFrom(e)
    const r = boxRef.current
    if (r && p.x >= r.x - HIT_TOL && p.x <= r.x + r.w + HIT_TOL && p.y >= r.y - HIT_TOL && p.y <= r.y + r.h + HIT_TOL) {
      textDragRef.current = { x: e.clientX, y: e.clientY, bx: visual.text.dx, by: visual.text.dy }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (visual.background === 'photo') {
      photoDragRef.current = { x: e.clientX, y: e.clientY, ox: visual.photo?.offsetX ?? 0, oy: visual.photo?.offsetY ?? 0 }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (textDragRef.current) {
      const box = e.currentTarget.getBoundingClientRect()
      onChange({
        ...visual,
        text: {
          ...visual.text,
          dx: textDragRef.current.bx + (e.clientX - textDragRef.current.x) / (box.width || 1),
          dy: textDragRef.current.by + (e.clientY - textDragRef.current.y) / (box.height || 1),
        },
      })
      return
    }
    if (photoDragRef.current) {
      const box = e.currentTarget.getBoundingClientRect()
      const kx = STORY_W / (box.width || 1)
      const ky = STORY_H / (box.height || 1)
      const photo = visual.photo ?? { src: '', scale: 1, offsetX: 0, offsetY: 0 }
      onChange({
        ...visual,
        photo: { ...photo, offsetX: photoDragRef.current.ox + (e.clientX - photoDragRef.current.x) * kx, offsetY: photoDragRef.current.oy + (e.clientY - photoDragRef.current.y) * ky },
      })
    }
  }

  function onPointerUp() {
    textDragRef.current = null
    photoDragRef.current = null
  }

  async function download() {
    if (downloading) return
    setDownloading(true)
    const canvas = document.createElement('canvas')
    drawStoryCanvas(canvas, { text, visual, imageEl: imageElRef.current, fontFamily })
    canvas.toBlob(blob => {
      setDownloading(false)
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = storyExportFileName(storyNumber, total)
      a.click()
      URL.revokeObjectURL(a.href)
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2000)
    }, 'image/jpeg', 0.92)
  }

  const band = boxRef.current
  const hasPhotoSrc = !!visual.photo?.src

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'var(--color-cherry-dark)' }} role="dialog" aria-label={`Editor de la story ${storyNumber}`}>
      <div className="min-h-full flex flex-col items-center gap-3 px-4 py-5">
        {/* Header */}
        <div className="w-full max-w-md flex items-center justify-between">
          <button onClick={onClose} className="btn-ghost text-sm">
            <ArrowLeft size={14} /> Volver
          </button>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.75)' }}>Story {storyNumber} de {total}</p>
        </div>

        {/* Canvas 9:16 + handle del texto (overlay DOM, fuera del render) */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{ width: '100%', maxWidth: 300, border: '1.5px solid rgba(255,255,255,0.3)', touchAction: 'none', cursor: 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="block w-full h-auto" />
          {band && (
            <div
              className="absolute pointer-events-none rounded-md"
              style={{
                left: `${(band.x / STORY_W) * 100}%`,
                top: `${(band.y / STORY_H) * 100}%`,
                width: `${(band.w / STORY_W) * 100}%`,
                height: `${(band.h / STORY_H) * 100}%`,
                border: '1.5px dashed rgba(255,255,255,0.75)',
              }}
            />
          )}
        </div>
        <p className="text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Toca y arrastra el texto{visual.background === 'photo' ? ' · arrastra la foto para encuadrarla' : ''}
        </p>

        {/* Panel de controles */}
        <div className="w-full max-w-md p-4 rounded-[var(--radius-md)] space-y-3" style={{ background: 'white' }}>
          {/* Fondo: degradado o foto */}
          <p className="text-xs font-bold uppercase tracking-wider text-cherry" style={{ opacity: 0.6 }}>Fondo</p>
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ ...visual, background: 'gradient' })}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: visual.background === 'gradient' ? 'var(--color-cherry)' : 'var(--color-warm-gray)', color: visual.background === 'gradient' ? 'white' : 'var(--color-cherry-dark)' }}
            >
              <Palette size={13} /> Degradado
            </button>
            <button
              onClick={() => onChange({ ...visual, background: 'photo' })}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: visual.background === 'photo' ? 'var(--color-cherry)' : 'var(--color-warm-gray)', color: visual.background === 'photo' ? 'white' : 'var(--color-cherry-dark)' }}
            >
              <ImageIcon size={13} /> Foto
            </button>
          </div>

          {visual.background === 'gradient' ? (
            <div className="flex flex-wrap gap-2">
              {STORY_PALETTES.map(pal => {
                const active = visual.paletteId === pal.id
                return (
                  <button
                    key={pal.id}
                    onClick={() => onChange({ ...visual, paletteId: pal.id })}
                    className="flex items-center gap-1.5 py-1 pl-1 pr-2.5 rounded-full text-xs font-semibold transition-all"
                    style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry-dark)', border: active ? '2px solid var(--color-cherry)' : '1.5px solid rgba(122,24,50,0.12)', opacity: active ? 1 : 0.75 }}
                  >
                    <span className="w-6 h-4 rounded-full inline-block" style={{ backgroundImage: `linear-gradient(160deg, ${pal.from}, ${pal.to})` }} />
                    {pal.name}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <PhotoSourceBar
                hasPhoto={hasPhotoSrc}
                onPick={src => onChange({ ...visual, photo: { src, scale: 1, offsetX: 0, offsetY: 0 } })}
                // La foto de cámara/subida entra como blob (preview al instante)
                // y el mismo visual pasa a URL firmada cuando la subida termina.
                onStabilize={src => onChange({ ...visual, photo: visual.photo ? { ...visual.photo, src } : { src, scale: 1, offsetX: 0, offsetY: 0 } })}
                uploadField={`s${storyNumber}_foto`}
                onRemove={() => onChange({ ...visual, background: 'gradient', photo: null })}
                stockTitle={`Foto de la story ${storyNumber}`}
              />
              {!hasPhotoSrc && (
                <p className="text-[10px] text-cherry-dark" style={{ opacity: 0.55 }}>Elige una foto (catálogo, cámara o subida): cae sobre la story a pantalla completa.</p>
              )}
              {hasPhotoSrc && photoDead && (
                <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>La foto no sobrevive al recargar — vuelve a elegir la foto.</p>
              )}
              {visual.photo && (
                <div className="flex items-center gap-2">
                  <button onClick={() => onChange({ ...visual, photo: { ...visual.photo!, scale: Math.max(1, visual.photo!.scale - 0.1) } })} className="btn-ghost text-xs px-2 py-1.5" aria-label="Menos zoom">
                    <Minus size={12} />
                  </button>
                  <span className="text-xs text-cherry-dark" style={{ opacity: 0.6 }}>{Math.round(visual.photo.scale * 100)}%</span>
                  <button onClick={() => onChange({ ...visual, photo: { ...visual.photo!, scale: Math.min(2.5, visual.photo!.scale + 0.1) } })} className="btn-ghost text-xs px-2 py-1.5" aria-label="Más zoom">
                    <Plus size={12} />
                  </button>
                  <span className="text-[10px] text-cherry-dark" style={{ opacity: 0.5 }}>zoom de la foto</span>
                </div>
              )}
              {visual.photo && (
                <div className="flex items-center gap-2">
                  <Sun size={13} style={{ color: 'var(--color-cherry)' }} />
                  <input
                    type="range"
                    min={0}
                    max={0.55}
                    step={0.05}
                    value={visual.overlay}
                    onChange={e => onChange({ ...visual, overlay: Number(e.target.value) })}
                    className="flex-1"
                    aria-label="Velo sobre la foto"
                  />
                  <span className="text-xs text-cherry-dark" style={{ opacity: 0.6 }}>{Math.round(visual.overlay * 100)}%</span>
                </div>
              )}
            </div>
          )}

          {/* Texto: tamaño + restablecer */}
          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] p-2" style={{ background: 'var(--color-warm-gray)' }}>
            <p className="text-xs font-bold text-cherry">Texto</p>
            <button onClick={() => onChange({ ...visual, text: { ...visual.text, sizeFactor: Math.max(0.6, visual.text.sizeFactor - 0.1) } })} className="btn-ghost text-xs px-2 py-1" aria-label="Texto más pequeño">
              <Minus size={12} />
            </button>
            <span className="text-xs text-cherry-dark" style={{ opacity: 0.7 }}>{Math.round(visual.text.sizeFactor * 100)}%</span>
            <button onClick={() => onChange({ ...visual, text: { ...visual.text, sizeFactor: Math.min(2, visual.text.sizeFactor + 0.1) } })} className="btn-ghost text-xs px-2 py-1" aria-label="Texto más grande">
              <Plus size={12} />
            </button>
            <button
              onClick={() => onChange({ ...visual, text: { dx: 0, dy: 0, sizeFactor: 1 } })}
              className="flex items-center gap-1 text-xs font-semibold ml-auto"
              style={{ color: 'var(--color-cherry)', opacity: 0.7 }}
            >
              <RefreshCw size={11} /> Restablecer
            </button>
          </div>

          {/* Descargar JPG 1080×1920 */}
          <button
            onClick={() => void download()}
            disabled={downloading}
            className="btn-primary w-full justify-center text-sm py-3"
            style={{ opacity: downloading ? 0.6 : 1 }}
          >
            {downloaded ? <Check size={15} /> : <Download size={15} />}
            {downloading ? 'Generando JPG…' : downloaded ? '¡Descargado!' : 'Descargar JPG 1080×1920'}
          </button>
          <p className="text-[10px] text-cherry-dark text-center" style={{ opacity: 0.5 }}>
            Baja como imagen lista para subir a Instagram (calidad de app: 1080×1920).
          </p>
        </div>
      </div>
    </div>
  )
}

