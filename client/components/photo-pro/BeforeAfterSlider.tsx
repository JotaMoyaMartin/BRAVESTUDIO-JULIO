'use client'
import { useCallback, useRef, useState } from 'react'
import { MoveHorizontal } from 'lucide-react'

/**
 * Comparador ANTES/DESPUÉS con slider arrastrable (pointer events — funciona
 * con dedo en móvil). Antes a la izquierda, después a la derecha; el asa
 * arrastra el corte. Sin dependencias externas.
 */
interface Props {
  beforeUrl: string
  afterUrl: string
  aspect?: string | null // ej "3/4"; si no, se mide del propio <img>
}

export default function BeforeAfterSlider({ beforeUrl, afterUrl, aspect }: Props) {
  const [pos, setPos] = useState(50)
  const [naturalAspect, setNaturalAspect] = useState<string | null>(aspect || null)
  const draggingRef = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const updateFromClientX = useCallback((clientX: number) => {
    const box = boxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    const raw = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(98, Math.max(2, raw)))
  }, [])

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        className="relative w-full overflow-hidden rounded-[var(--radius-lg)] select-none touch-none"
        style={{ aspectRatio: naturalAspect || '3 / 4', background: 'rgba(122,24,50,0.04)' }}
        onPointerDown={e => {
          draggingRef.current = true
          updateFromClientX(e.clientX)
        }}
        onPointerMove={e => {
          if (draggingRef.current) updateFromClientX(e.clientX)
        }}
        onPointerUp={() => { draggingRef.current = false }}
        onPointerLeave={() => { draggingRef.current = false }}
        onPointerCancel={() => { draggingRef.current = false }}
      >
        {/* DESPUÉS — capa base */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt="Resultado"
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain"
          onLoad={e => {
            const img = e.currentTarget
            if (img.naturalWidth && img.naturalHeight) {
              setNaturalAspect(`${img.naturalWidth} / ${img.naturalHeight}`)
            }
          }}
        />

        {/* ANTES — recortado hasta la posição del slider */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeUrl}
          alt="Original"
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />

        {/* Asa */}
        <div
          className="absolute top-0 bottom-0 flex items-center pointer-events-none"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-0.5 h-full bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.35)]" />
          <div className="absolute left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-[var(--shadow-medium)] flex items-center justify-center">
            <MoveHorizontal size={16} className="text-cherry" />
          </div>
        </div>

        {/* Chips de esquina */}
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/90 text-cherry-dark shadow-sm pointer-events-none">
          Original
        </span>
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-cherry text-white shadow-sm pointer-events-none">
          Resultado
        </span>
      </div>
      <p className="text-center text-[11px] text-ink opacity-60">
        Arrastra el asa para comparar
      </p>
    </div>
  )
}