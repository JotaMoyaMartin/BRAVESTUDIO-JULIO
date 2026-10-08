'use client'
import { CSSProperties, useMemo } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import {
  StoryBrandTokens, StoryDesignElement, StoryDesignSlide, StoryPhotoFrame,
  applyBrandTokens, elementMaxLength,
} from '@/lib/stories-diseno/types'
import { frameToCss } from '@/lib/stories-diseno/transform'
import { storyIcon } from '@/lib/stories-diseno/icons'

/**
 * Renderizador de UN slide de Story Diseño (canvas 1080×1920, v2 capas).
 * Pure presentation: los edits (Map id→contenido/encuadre) los aplica quien
 * lo use. `interactive` activa el modo interactivo del editor (selección).
 * Sirve a: galería (portadas), editor usuaria (mismo DOM = export WYSIWYG),
 * builder admin (capa interactiva encima), y export html-to-image.
 */
export const CANVAS_W = 1080
export const CANVAS_H = 1920

/** ¿La usuaria puede tocar este elemento (con su role y su lock)? */
export function isEditableElement(e: StoryDesignElement): boolean {
  if (e.locked) return false
  return e.role === 'editable' || e.role === 'ai' || e.role === 'replaceable'
}

interface SlideCanvasProps {
  slide: StoryDesignSlide
  /** Escala de render (1080/1920 → display). El editor calcula por ancho disponible. */
  scale: number
  /** Contenidos por elemento (los cambios de la usuaria / IA). */
  contents?: Record<string, string>
  /** Encuadre de fotos por elemento (overrides de sesión). */
  photoFrames?: Record<string, StoryPhotoFrame>
  /** Tokens de marca para role 'brand' ({{salon_name}}, {{ig}}…). */
  brandTokens?: StoryBrandTokens | null
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
  slide, scale, contents = {}, photoFrames = {}, brandTokens = null,
  interactive = false, selectedId = null, onElementClick, frameRef,
}: SlideCanvasProps) {
  const w = CANVAS_W * scale
  const h = CANVAS_H * scale

  const sorted = useMemo(() => {
    // Orden: si alguna capa declara zIndex explícito, manda (builder). Si no,
    // orden legacy de las plantillas seed (backgrounds al fondo, luego por y).
    const hasZ = slide.elements.some(e => e.zIndex != null)
    return [...slide.elements].sort((a, b) => {
      if (hasZ) {
        const zA = a.zIndex ?? 50
        const zB = b.zIndex ?? 50
        return zA - zB
      }
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
        {sorted.filter(e => e.visible !== false && e.type !== 'background').map(e => {
          const editable = interactive && isEditableElement(e)
          const rawContent = contents[e.id] ?? e.content ?? ''
          const content = e.role === 'brand' ? applyBrandTokens(rawContent, brandTokens) : rawContent
          const selected = interactive && selectedId === e.id
          const clickable = editable && !!onElementClick
          const st = styleOf(e)
          const rot = `rotate(${e.rotation ?? 0}deg)`
          const opacity = (st.opacity as number | undefined) ?? 1

          if (e.type === 'image') {
            const filled = Boolean(content)
            const frame = photoFrames[e.id] ?? e.frame ?? { zoom: 1, dx: 0, dy: 0 }
            // div cuando no es tocable (covers/preview/export): evita button dentro de button
            const Tag = clickable ? 'button' : 'div'
            return (
              <Tag
                type={clickable ? 'button' : undefined}
                key={e.id}
                onClick={clickable ? () => onElementClick?.(e) : undefined}
                className={clickable ? 'cursor-pointer text-left' : 'cursor-default text-left'}
                style={{
                  position: 'absolute',
                  left: e.position.x,
                  top: e.position.y,
                  width: e.size.w,
                  height: e.size.h,
                  transform: rot,
                  borderRadius: e.style.borderRadius as string | number | undefined ?? 0,
                  overflow: 'hidden',
                  border: selected ? `4px solid ${st.color ?? '#7A1832'}` : 'none',
                  boxShadow: selected ? '0 0 0 6px rgba(255,241,181,0.55)' : 'none',
                  padding: 0,
                  opacity,
                  background: st.background as string ?? 'rgba(42,11,18,0.08)',
                  pointerEvents: clickable ? 'auto' : 'none',
                  outline: 'none',
                }}
                aria-label="Cambiar foto"
              >
                {filled ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={content}
                    alt=""
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      display: 'block', transform: frameToCss(frame),
                    }}
                  />
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
                    {editable ? (e.placeholder ?? 'Toca para subir foto') : 'Foto'}
                  </span>
                )}
              </Tag>
            )
          }

          if (e.type === 'icon') {
            const Icon = storyIcon(e.content)
            const size = (st.fontSize as number | undefined) ?? 64
            return (
              <div
                key={e.id}
                style={{
                  position: 'absolute',
                  left: e.position.x, top: e.position.y,
                  width: e.size.w, height: e.size.h,
                  transform: rot,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: (st.color as string) ?? '#7A1832',
                  opacity,
                  pointerEvents: 'none',
                  ...(st.background ? { background: st.background as string } : {}),
                  borderRadius: (st.borderRadius as string | number) ?? 0,
                }}
              >
                {Icon ? <Icon size={size} aria-hidden="true" /> : null}
              </div>
            )
          }

          if (e.type === 'shape' || e.type === 'line') {
            return (
              <div
                key={e.id}
                style={{
                  position: 'absolute',
                  left: e.position.x, top: e.position.y,
                  width: e.size.w, height: e.size.h,
                  transform: rot,
                  opacity,
                  pointerEvents: 'none',
                  ...st,
                }}
              />
            )
          }

          if (e.type === 'sticker') {
            return (
              <div
                key={e.id}
                style={{
                  position: 'absolute',
                  left: e.position.x, top: e.position.y,
                  width: e.size.w, height: e.size.h,
                  transform: rot,
                  opacity,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: (st.fontSize as number) ?? 120,
                  lineHeight: 1,
                  pointerEvents: 'none',
                  ...st,
                }}
              >
                {content}
              </div>
            )
          }

          // text y badge
          const isBadge = e.type === 'badge'
          const maxLines = e.constraints?.maxLines
          const clamped: CSSProperties = maxLines
            ? { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }
            : {}
          const Tag = clickable ? 'button' : 'div'
          return (
            <Tag
              type={clickable ? 'button' : undefined}
              key={e.id}
              onClick={clickable ? () => onElementClick?.(e) : undefined}
              className={clickable ? 'cursor-pointer text-left' : 'cursor-default text-left'}
              style={{
                position: 'absolute',
                left: e.position.x,
                top: e.position.y,
                width: e.size.w,
                minHeight: e.size.h,
                transform: rot,
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
                opacity,
                whiteSpace: 'pre-wrap',
                textShadow: st.textShadow as string | undefined,
                boxShadow: isBadge ? (st.boxShadow as string | undefined) : selected ? '0 0 0 6px rgba(255,241,181,0.55)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                outline: selected ? '4px solid #7A1832' : 'none',
                outlineOffset: 2,
                pointerEvents: clickable ? 'auto' : 'none',
                ...clamped,
              }}
            >
              {content}
              {interactive && editable && e.type === 'text' && !content && (
                <span style={{ opacity: 0.4, fontSize: (st.fontSize as number) * 0.8 }}>
                  {e.placeholder ?? 'Escribe aquí…'}
                </span>
              )}
            </Tag>
          )
        })}
      </div>
    </div>
  )
}

/** Export helpers reusados por los editores. */
export { CANVAS_W as StoryCanvasW, CANVAS_H as StoryCanvasH, elementMaxLength }