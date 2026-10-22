'use client'
// SlideThumb — preview real 4:5 (o 9:16) de UNA slide del LAB: foto con
// focal/zoom + overlay + texto, idéntica matemática al export (photoDrawStyle).
// La usa la tira bajo el canvas, la vista cuadrícula y cualquier futuro flujo.

import { useEffect, useState } from 'react'
import {
  LAB_BASE_FONT_PX,
  LabMode,
  LabSlide,
  labCanvasSize,
  photoDrawStyle,
} from '@/lib/lab/carousel'
import { labFontCss, labTextColorHex } from './drawLabSlide'
import { storyBgCss } from '@/lib/stories/design'

// Cache de dims naturales por src (evita re-medir la misma foto N veces).
const DIMS_CACHE = new Map<string, { w: number; h: number }>()

export function usePhotoDims(src: string | null): { w: number; h: number } | null {
  const [dims, setDims] = useState(() => (src ? DIMS_CACHE.get(src) ?? null : null))
  useEffect(() => {
    if (!src) {
      setDims(null)
      return
    }
    const cached = DIMS_CACHE.get(src)
    if (cached) {
      setDims(cached)
      return
    }
    let dead = false
    const img = new Image()
    img.onload = () => {
      const d = { w: img.naturalWidth || 1, h: img.naturalHeight || 1 }
      DIMS_CACHE.set(src, d)
      if (!dead) setDims(d)
    }
    img.onerror = () => undefined // sin dims → fallback object-cover
    img.src = src
    return () => {
      dead = true
    }
  }, [src])
  return dims
}

interface SlideThumbProps {
  slide: LabSlide
  mode?: LabMode
  /** Nº visible (1-based) en la esquina. */
  number?: number
  active?: boolean
  onClick?: () => void
  /** Cursor: en grid/tira el click cambia; el thumb no es drag-surface. */
  className?: string
  /** Sin botón (div no interactivo) — para preview dentro de otro <button>. */
  plain?: boolean
}

export default function SlideThumb({ slide, mode = 'carousel', number, active, onClick, className, plain }: SlideThumbProps) {
  const dims = usePhotoDims(slide.photoSrc)
  const size = labCanvasSize(mode)
  const photoStyle =
    dims && slide.photoSrc
      ? photoDrawStyle(slide, dims.w, dims.h, size.w, size.h)
      : null

  const inner = (
    <>
      {slide.photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.photoSrc}
          alt=""
          crossOrigin="anonymous"
          loading="lazy"
          className="absolute select-none"
          style={
            photoStyle
              ? {
                  left: `${photoStyle.leftPct}%`,
                  top: `${photoStyle.topPct}%`,
                  width: `${photoStyle.widthPct}%`,
                  height: `${photoStyle.heightPct}%`,
                  filter: slide.bw ? 'grayscale(1)' : undefined,
                  maxWidth: 'none',
                }
              : {
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover' as const,
                  filter: slide.bw ? 'grayscale(1)' : undefined,
                }
          }
        />
      ) : slide.bgId ? (
        // Story de producto sin foto: degradado de rol de los mockups (inerte en LAB).
        <div className="absolute inset-0" style={{ background: storyBgCss(slide.bgId) }} />
      ) : (
        <div className="absolute inset-0" style={{ background: '#EAE0DA' }} />
      )}
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${slide.overlay})` }} />
      <div
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
        }}
      >
        {slide.text || <span style={{ opacity: 0.5 }}>Título…</span>}
      </div>
      {number !== undefined && (
        <span
          className="absolute bottom-1 left-1 flex items-center justify-center rounded-full text-[9px] font-extrabold"
          style={{
            minWidth: 15,
            height: 15,
            padding: '0 3px',
            background: 'rgba(255,253,245,0.92)',
            color: 'var(--color-cherry)',
          }}
        >
          {number}
        </span>
      )}
    </>
  )

  const style = {
    aspectRatio: `${size.w} / ${size.h}`,
    display: 'block',
    width: '100%',
    // El texto usa cqw (como el canvas): SIN contenedor propio caería al
    // viewport y saldría gigante — el thumb es su propio query container.
    containerType: 'inline-size' as const,
    background: '#EAE0DA',
    border: active ? '2.5px solid var(--color-cherry)' : '1.5px solid rgba(89,20,39,0.15)',
    borderRadius: 8,
    touchAction: 'manipulation' as const,
  }
  if (plain) {
    return <div className={`relative shrink-0 overflow-hidden ${className ?? ''}`} style={style}>{inner}</div>
  }
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 overflow-hidden ${className ?? ''}`}
      style={style}
      aria-label={number ? `Slide ${number}` : 'Slide'}
    >
      {inner}
    </button>
  )
}