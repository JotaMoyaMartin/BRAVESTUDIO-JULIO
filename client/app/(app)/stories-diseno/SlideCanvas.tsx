'use client'
import { CSSProperties, useMemo } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { StoryDesignElement, StoryDesignSlide } from '@/lib/stories-diseno/types'

/**
 * Renderizador de UN slide de Story Diseño (canvas 1080×1920).
 * Pure presentation: los edits (Map id→contenido) lo aplica quien lo use.
 * `editable` activa el modo interactivo del editor (ring de selección).
 */
export const CANVAS_W = 1080
export const CANVAS_H = 1920

export function isEditableElement(e: StoryDesignElement): boolean {
  return e.role === 'editable' || e.role === 'ai' || e.role === 'replaceable'
}

interface SlideCanvasProps {
  slide: StoryDesignSlide
  /** Escala de render (1080/1920 → display). El editor calcula por ancho disponible. */
  scale: number
  /** Contenidos por elemento (los cambios de la usuaria / IA). */
  contents?: Record<string, string>
  /** Modo editor: resalta los elementos que se pueden tocar. */
  interactive?: boolean
  selectedId?: string | null
  onElementClick?: (el: StoryDesignElement) => void
  /** Ref al frame exportable (para html-to-image). */
  frameRef?: (node: HTMLDivElement | null) => void
}

function styleOf(e: StoryDesignElement): CSSProperties {
  return e.style as unknown as CSSProperties
}

export default function SlideCanvas({
  slide, scale, contents = {}, interactive = false, selectedId = null, onElementClick, frameRef,
}: SlideCanvasProps) {
  const w = CANVAS_W * scale
  const h = CANVAS_H * scale

  const sorted = useMemo(() => {
    // Orden estable por tipo (backgrounds al fondo) y por y (de arriba abajo)
    return [...slide.elements].sort((a, b) => {
      const wA = a.type === 'background' ? 0 : 1
      const wB = b.type === 'background' ? 0 : 1
      if (wA !== wB) return wA - wB
      return a.position.y - b.position.y
    })
  }, [slide.elements])

  return (
    <div
      style={{ width: w, height: h, position: 'relative', flexShrink: 0 }}
      ref={frameRef}
      data-slide-export="true"
    >
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: slide.background,
          borderRadius: 0,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Poppins, Montserrat, sans-serif',
        }}
      >
        {sorted.filter(e => e.type !== 'background').map(e => {
          const editable = interactive && isEditableElement(e)
          const content = contents[e.id] ?? e.content ?? ''
          const selected = interactive && selectedId === e.id
          const clickable = editable && !!onElementClick
          const st = styleOf(e)

          if (e.type === 'image') {
            const filled = Boolean(content)
            return (
              <button
                type="button"
                key={e.id}
                onClick={clickable ? () => onElementClick?.(e) : undefined}
                className={clickable ? 'cursor-pointer text-left' : 'cursor-default text-left'}
                style={{
                  position: 'absolute',
                  left: e.position.x,
                  top: e.position.y,
                  width: e.size.w,
                  height: e.size.h,
                  borderRadius: e.style.borderRadius as string | number | undefined ?? 0,
                  overflow: 'hidden',
                  border: selected ? `4px solid ${st.color ?? '#7A1832'}` : 'none',
                  boxShadow: selected ? '0 0 0 6px rgba(255,241,181,0.55)' : 'none',
                  padding: 0,
                  background: st.background as string ?? 'rgba(42,11,18,0.08)',
                  outline: 'none',
                }}
                aria-label="Cambiar foto"
              >
                {filled ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <span
                    style={{
                      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
                      color: 'rgba(42,11,18,0.45)',
                      border: '3px dashed rgba(42,11,18,0.25)',
                      borderRadius: 'inherit',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: 34,
                      fontWeight: 700,
                    }}
                  >
                    <ImageIcon size={56} />
                    {editable ? 'Toca para subir foto' : 'Foto'}
                  </span>
                )}
              </button>
            )
          }

          if (e.type === 'shape') {
            return (
              <div
                key={e.id}
                style={{
                  position: 'absolute',
                  left: e.position.x, top: e.position.y,
                  width: e.size.w, height: e.size.h,
                  ...st,
                }}
              />
            )
          }

          // text y badge
          const isBadge = e.type === 'badge'
          return (
            <button
              type="button"
              key={e.id}
              onClick={clickable ? () => onElementClick?.(e) : undefined}
              className={clickable ? 'cursor-pointer text-left' : 'cursor-default text-left'}
              style={{
                position: 'absolute',
                left: e.position.x,
                top: e.position.y,
                width: e.size.w,
                minHeight: e.size.h,
                border: 'none',
                background: isBadge ? (st.background as string) : 'transparent',
                borderRadius: isBadge ? (st.borderRadius as string ?? '24px') : undefined,
                padding: isBadge ? `${st.paddingTop ?? 20}px ${st.paddingLeft ?? 40}px` : 0,
                margin: 0,
                boxSizing: 'border-box' as const,
                fontFamily: st.fontFamily as string,
                fontSize: st.fontSize as number,
                fontWeight: st.fontWeight as number,
                lineHeight: (st.lineHeight as string) ?? '1.2',
                letterSpacing: st.letterSpacing as string,
                fontStyle: st.fontStyle as string,
                textTransform: st.textTransform as 'none' | undefined,
                color: st.color as string,
                textAlign: st.textAlign as 'left' | 'center' | 'right',
                opacity: st.opacity as number,
                whiteSpace: 'pre-wrap',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: selected ? '0 0 0 6px rgba(255,241,181,0.55)' : 'none',
                outline: selected ? '4px solid #7A1832' : 'none',
                outlineOffset: 2,
              }}
            >
              {content}
              {interactive && editable && isEditableElement(e) && e.type === 'text' && !content && (
                <span style={{ opacity: 0.4, fontSize: (st.fontSize as number) * 0.8 }}>Escribe aquí…</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}