'use client'
/**
 * Story con arte (lib/stories/mockups.ts): imagen de fondo + SUS fotos en
 * los huecos + sus textos. Se pinta a 1080×1920 y se escala para la vista.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { splitHighlight, type MockupTemplate, type MockupText } from '@/lib/stories/mockups'

export interface MockupState {
  /** slotId → foto (dataURL suya o ruta de ejemplo) */
  photos: Record<string, string>
  /** slotId → encuadre vertical 0–100 */
  focus: Record<string, number>
  /** textId → texto */
  texts: Record<string, string>
}

const FONT: Record<MockupText['font'], string> = {
  serif: 'var(--font-instrument), "Instrument Serif", Georgia, serif',
  script: 'var(--font-pinyon), "Pinyon Script", cursive',
  sans: 'var(--font-sans, inherit), system-ui, sans-serif',
}

function TextBox({ t, value }: { t: MockupText; value: string }) {
  const style: CSSProperties = {
    position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h,
    display: 'flex', alignItems: 'center', justifyContent: t.align === 'left' ? 'flex-start' : 'center',
    textAlign: t.align ?? 'center', color: t.color, fontFamily: FONT[t.font], fontSize: t.size,
    lineHeight: t.font === 'sans' ? 1.45 : 1.05, fontStyle: t.italic ? 'italic' : undefined,
    textTransform: t.upper ? 'uppercase' : undefined, letterSpacing: t.upper ? '0.18em' : undefined,
    whiteSpace: 'pre-line', fontWeight: t.font === 'sans' ? 500 : 400, overflow: 'hidden',
    ...(t.panel ? { background: 'rgba(250,246,240,0.88)', borderRadius: 28, padding: '10px 28px' } : {}),
  }
  return (
    <div style={style}>
      <span>
        {splitHighlight(value).map((p, i) => (
          <span key={i} style={p.hi ? { fontStyle: 'italic', fontFamily: FONT.serif } : undefined}>{p.text}</span>
        ))}
      </span>
    </div>
  )
}

/** Lienzo a tamaño real (1080×1920). */
export function MockupCanvas({ tpl, state }: { tpl: MockupTemplate; state: MockupState }) {
  return (
    <div style={{ position: 'relative', width: 1080, height: 1920, overflow: 'hidden', background: '#EEE' }}>
      {/* El arte de fondo; las fotos van encima, en su hueco exacto. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tpl.art} alt="" style={{ position: 'absolute', inset: 0, width: 1080, height: 1920 }} />
      {tpl.slots.map(s => (
        <div key={s.id} style={{ position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h, overflow: 'hidden', borderRadius: s.radius ?? 0, background: '#E6E2DD' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.photos[s.id] || s.sample} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${state.focus[s.id] ?? 40}%` }} />
          {s.tag && (
            <span style={{ position: 'absolute', left: 18, bottom: 18, background: 'rgba(250,246,240,0.92)', color: '#591427', fontSize: 26, fontWeight: 600, letterSpacing: '0.16em', padding: '8px 18px', borderRadius: 999 }}>{s.tag}</span>
          )}
        </div>
      ))}
      {tpl.texts.map(t => <TextBox key={t.id} t={t} value={state.texts[t.id] ?? t.value} />)}
    </div>
  )
}

/** Vista escalada: ocupa el ancho de su contenedor (9:16). */
export default function MockupStory({ tpl, state, className }: { tpl: MockupTemplate; state: MockupState; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const k = w / 1080
  return (
    <div ref={ref} className={className} style={{ aspectRatio: '9 / 16', overflow: 'hidden', position: 'relative' }}>
      {w > 0 && (
        <div style={{ transform: `scale(${k})`, transformOrigin: 'top left', width: 1080, height: 1920, position: 'absolute', left: 0, top: 0 }}>
          <MockupCanvas tpl={tpl} state={state} />
        </div>
      )}
    </div>
  )
}

export const emptyMockupState = (): MockupState => ({ photos: {}, focus: {}, texts: {} })
