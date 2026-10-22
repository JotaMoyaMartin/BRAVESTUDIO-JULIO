'use client'
/**
 * PANEL DEL ESTILO ELEGIDO — debe seguir visible durante TODO el proceso.
 * Desktop: columna derecha sticky, con las referencias grandes.
 * Mobile: tira horizontal fija arriba (prop compactStrip).
 */
import Image from 'next/image'
import { useState } from 'react'
import { X } from 'lucide-react'
import type { StyleConfig } from '@/lib/carruseles/types'

interface Props {
  style: StyleConfig
  onChangeStyle: () => void
}

export function StyleSidePanel({ style, onChangeStyle }: Props) {
  const [zoom, setZoom] = useState<string | null>(null)
  return (
    <aside className="lg:sticky lg:top-24">
      <div className="lg:rounded-[var(--radius-md)] lg:bg-warm-light lg:border lg:border-[rgba(122,24,50,0.08)] lg:overflow-hidden">
        <div className="hidden lg:block">
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cherry/50 mb-1">Estilo elegido</p>
              <h4 className="text-lg text-cherry-dark leading-tight" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 600 }}>
                {style.name}
              </h4>
            </div>
            <button
              onClick={onChangeStyle}
              className="text-[11px] uppercase tracking-[0.14em] text-ink/50 hover:text-cherry transition-colors"
            >
              Cambiar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-0.5 px-5 pb-5">
            {style.referenceImages.slice(0, 4).map((src, i) => (
              <button
                key={src}
                type="button"
                className={`relative aspect-[4/5] overflow-hidden cursor-zoom-in ${i >= 2 ? 'hidden lg:block' : ''}`}
                onClick={() => setZoom(src)}
                aria-label="Ver referencia más grande"
              >
                <Image src={src} alt={`Referencia ${i + 1}`} fill sizes="220px" className="object-cover" />
              </button>
            ))}
          </div>
          <p className="px-5 pb-5 text-xs text-ink/50 leading-relaxed">
            {style.description}
          </p>
        </div>
      </div>

      {/* Mobile: tira horizontal sticky */}
      <div className="lg:hidden">
        <div className="sticky top-[56px] z-30 bg-cream/95 backdrop-blur-sm border-b border-[rgba(122,24,50,0.08)] -mx-4 px-4 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-cherry/60">
              {style.name}
            </span>
            <button onClick={onChangeStyle} className="text-[11px] uppercase tracking-[0.14em] text-ink/50">
              Cambiar
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {style.referenceImages.map((src, i) => (
              <button
                key={src}
                type="button"
                className="relative w-16 h-20 shrink-0 overflow-hidden rounded-[6px] cursor-zoom-in"
                onClick={() => setZoom(src)}
                aria-label="Ver referencia más grande"
              >
                <Image src={src} alt={`Referencia ${i + 1}`} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-6" onClick={() => setZoom(null)}>
          <button className="absolute top-5 right-5 text-white/80" aria-label="Cerrar">
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt={`Referencia ${style.name}`} className="max-h-[85vh] w-auto rounded" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </aside>
  )
}

export default StyleSidePanel