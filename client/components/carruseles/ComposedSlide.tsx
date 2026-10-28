'use client'
/**
 * Una slide de carrusel 4:5 compuesta en HTML: fondo + capas de texto.
 * Todo se mide en cqw (ancho del lienzo), así la miniatura, el editor y la
 * exportación a 1080×1350 son idénticos.
 */
import { forwardRef } from 'react'
import { fontPair, splitAccents, splitPoster, titleSizeCqw, type SlideDesign } from '@/lib/carruseles/composer'

interface Props {
  design: SlideDesign
  title: string
  support?: string
  index: number
  total: number
  /** Firma pequeña del salón (opcional). */
  signature?: string
  className?: string
  /** 4:5 carrusel (por defecto) o 9:16 story con zonas seguras de Instagram. */
  ratio?: '4:5' | '9:16'
}

const ComposedSlide = forwardRef<HTMLDivElement, Props>(function ComposedSlide(
  { design, title, support, index, total, signature, className = '', ratio = '4:5' },
  ref,
) {
  const pair = fontPair(design.fontPair)
  const light = design.tone === 'claro'
  const ink = light ? '#FFFFFF' : '#2B1A1F'
  const inkSoft = light ? 'rgba(255,255,255,0.86)' : 'rgba(43,26,31,0.78)'
  // Silencio: todo el titular en el mismo color, el acento lo da la letra.
  const accentColor = design.layout === 'silencio' || design.layout === 'recorte' ? ink : light ? '#FFF1B5' : '#7A1832'
  const size = titleSizeCqw(title, pair, design.scale)
  const L = design.layout

  // Velo de legibilidad según dónde va el texto
  // Texto oscuro sobre foto: velo crema (aclara) en lugar de negro.
  const v = light ? (design.tint || '20,6,10') : '255,247,238'
  const veil =
    design.bg.kind === 'color' || design.overlay <= 0
      ? 'none'
      : L === 'abajo' || L === 'revista'
        ? `linear-gradient(180deg, rgba(${v},${design.overlay * 0.35}) 0%, rgba(${v},0) 35%, rgba(${v},${design.overlay * 0.9}) 72%, rgba(${v},${Math.min(0.9, design.overlay * 1.6)}) 100%)`
        : L === 'arriba'
          ? `linear-gradient(0deg, rgba(${v},0) 45%, rgba(${v},${Math.min(0.85, design.overlay * 1.5)}) 100%)`
          : L === 'lateral'
            ? `linear-gradient(90deg, rgba(${v},${Math.min(0.85, design.overlay * 1.6)}) 0%, rgba(${v},${design.overlay * 0.6}) 55%, rgba(${v},0) 100%)`
            : `rgba(${v},${design.overlay})`

  const titleNode = (
    <h3
      style={{
        margin: 0,
        fontFamily: pair.title.family,
        fontWeight: pair.title.weight,
        textTransform: pair.title.upper ? 'uppercase' : 'none',
        letterSpacing: pair.title.tracking,
        fontStretch: pair.title.stretch,
        lineHeight: pair.title.lineHeight,
        fontSize: `${size}cqw`,
        color: ink,
        textWrap: 'balance',
        textShadow: light && design.bg.kind === 'photo' ? '0 0.3cqw 2cqw rgba(0,0,0,0.25)' : 'none',
      }}
    >
      {splitAccents(title).map((p, i) =>
        p.accent ? (
          <span key={i} style={{ fontFamily: pair.accent.family, fontWeight: pair.accent.weight, fontStyle: pair.accent.italic ? 'italic' : 'normal', color: accentColor, textTransform: 'none' }}>
            {p.t}
          </span>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </h3>
  )
  const supportNode = support ? (
    <p style={{ margin: 0, marginTop: '2.4cqw', fontFamily: pair.body.family, fontWeight: pair.body.weight, lineHeight: pair.body.lineHeight, fontSize: '3.5cqw', color: inkSoft, textWrap: 'pretty' }}>
      {support}
    </p>
  ) : null

  const pad = '7cqw'
  // Story: arriba va el nombre de la cuenta y abajo la barra de respuesta.
  const story = ratio === '9:16'
  const padTop = story ? '26cqw' : pad
  const padBottom = story ? '38cqw' : pad
  const aspect = story ? '9 / 16' : '4 / 5'
  const counter = (
    <span style={{ fontFamily: pair.body.family, fontWeight: 600, fontSize: '2.6cqw', color: inkSoft, letterSpacing: '0.04em' }}>
      {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </span>
  )

  if (L === 'recorte') {
    return <CutoutSlide ref={ref} design={design} titleNode={titleNode} support={support} pair={pair} inkSoft={inkSoft} className={className} story={story} />
  }

  if (L === 'marco') {
    return <PosterSlide ref={ref} design={design} title={title} support={support} className={className} story={story} />
  }

  return (
    <div
      ref={ref}
      data-preview
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: aspect, containerType: 'inline-size', background: design.bg.kind === 'color' ? design.bg.color : '#2B1A1F' }}
    >
      {design.bg.kind === 'photo' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={design.bg.src} alt="" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      )}
      {veil !== 'none' && <div aria-hidden className="absolute inset-0" style={{ background: veil }} />}

      {/* Capas de texto según la composición */}
      {L === 'silencio' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: story ? '0 9cqw 8cqw' : '0 9cqw' }}>
          {design.label && (
            <p style={{ margin: 0, marginBottom: '3.4cqw', fontFamily: pair.body.family, fontWeight: 500, fontSize: '2.7cqw', letterSpacing: '0.14em', textTransform: 'uppercase', color: inkSoft }}>{design.label}</p>
          )}
          {titleNode}
          {support && (
            <p style={{ margin: 0, marginTop: '4.6cqw', maxWidth: '72cqw', fontFamily: pair.body.family, fontWeight: 400, lineHeight: 1.45, fontSize: '3.15cqw', color: inkSoft, textWrap: 'pretty' }}>{support}</p>
          )}
        </div>
      ) : L === 'tarjeta' ? (
        <div className="absolute" style={{ left: pad, right: pad, bottom: padBottom }}>
          <div style={{ background: '#FFF7EE', borderRadius: '3.2cqw', padding: '6cqw 6cqw 5.4cqw', boxShadow: '0 2cqw 6cqw rgba(20,6,10,0.25)' }}>
            {design.label && <p style={{ margin: 0, marginBottom: '2cqw', fontFamily: pair.body.family, fontWeight: 600, fontSize: '2.8cqw', color: '#7A1832' }}>{design.label}</p>}
            <div style={{ ['--ink' as string]: '#2B1A1F' }}>
              <ComposedText title={title} support={support} pairId={design.fontPair} scale={design.scale * 0.86} ink="#2B1A1F" inkSoft="rgba(43,26,31,0.75)" accent="#7A1832" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="absolute flex flex-col"
          style={{
            left: pad,
            right: L === 'lateral' ? '34cqw' : pad,
            top: L === 'arriba' || L === 'lateral' ? padTop : L === 'centro' ? 0 : undefined,
            bottom: L === 'abajo' || L === 'revista' ? padBottom : L === 'centro' ? 0 : undefined,
            justifyContent: L === 'centro' ? 'center' : L === 'lateral' ? 'center' : 'flex-start',
            height: L === 'lateral' ? (story ? 'calc(100% - 64cqw)' : 'calc(100% - 14cqw)') : undefined,
            textAlign: L === 'centro' ? 'center' : 'left',
            alignItems: L === 'centro' ? 'center' : 'flex-start',
          }}
        >
          {titleNode}
          {supportNode}
        </div>
      )}

      {L === 'silencio' && design.note && (
        <p className="absolute text-center" style={{ left: '12cqw', right: '12cqw', bottom: story ? '40cqw' : '9cqw', margin: 0, fontFamily: pair.body.family, fontWeight: 500, fontSize: '2.75cqw', lineHeight: 1.35, letterSpacing: '0.06em', textTransform: 'uppercase', color: ink }}>{design.note}</p>
      )}

      {/* Revista: número y etiqueta arriba */}
      {L === 'revista' && (
        <div className="absolute flex items-center" style={{ left: pad, right: pad, top: padTop, gap: '2.4cqw' }}>
          <span style={{ fontFamily: pair.title.family, fontWeight: pair.title.weight, fontSize: '7cqw', lineHeight: 1, color: ink }}>{String(index + 1).padStart(2, '0')}</span>
          <span style={{ height: '0.3cqw', flex: '0 0 9cqw', background: inkSoft }} />
          {design.label && <span style={{ fontFamily: pair.body.family, fontWeight: 600, fontSize: '3cqw', color: inkSoft }}>{design.label}</span>}
        </div>
      )}

      {/* Pie: contador (no en revista ni en stories) y firma */}
      {!story && <div className="absolute flex items-center justify-between" style={{ left: pad, right: pad, bottom: L === 'tarjeta' || L === 'abajo' || L === 'revista' ? '2.6cqw' : '4.4cqw' }}>
        {L !== 'revista' && L !== 'tarjeta' && L !== 'abajo' && L !== 'silencio' ? counter : <span />}
        {signature && <span style={{ fontFamily: pair.body.family, fontWeight: 600, fontSize: '2.6cqw', color: inkSoft }}>{signature}</span>}
      </div>}
    </div>
  )
})

export default ComposedSlide

/**
 * Recortes: color liso, etiqueta y titular arriba, y 1–3 personas sin fondo
 * solapadas abajo (la del centro delante).
 */
const CUTOUT_POS: Record<number, React.CSSProperties[]> = {
  1: [{ left: '12cqw', width: '76cqw', zIndex: 1 }],
  2: [{ left: '-4cqw', width: '60cqw', zIndex: 1 }, { right: '-4cqw', width: '60cqw', zIndex: 2 }],
  3: [{ left: '-6cqw', width: '50cqw', zIndex: 1 }, { left: '25cqw', width: '44cqw', zIndex: 2 }, { right: '-6cqw', width: '52cqw', zIndex: 3 }],
}
const CutoutSlide = forwardRef<HTMLDivElement, {
  design: SlideDesign; titleNode: React.ReactNode; support?: string; pair: ReturnType<typeof fontPair>; inkSoft: string; className: string; story?: boolean
}>(function CutoutSlide({ design, titleNode, support, pair, inkSoft, className, story }, ref) {
  const cuts = (design.cutouts || []).slice(0, 3)
  const pos = CUTOUT_POS[cuts.length] || []
  const bg = design.bg.kind === 'color' ? design.bg.color : '#9C8B7A'
  return (
    <div ref={ref} data-preview className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: story ? '9 / 16' : '4 / 5', containerType: 'inline-size', background: bg }}>
      {cuts.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src + i} src={src} alt="" crossOrigin="anonymous" draggable={false} className="absolute bottom-0 h-auto object-contain object-bottom" style={{ ...pos[i], maxHeight: i === 1 ? '64cqw' : '78cqw' }} />
      ))}
      <div className="absolute flex flex-col items-center text-center" style={{ left: '8cqw', right: '8cqw', top: story ? '30cqw' : '13cqw', zIndex: 5 }}>
        {design.label && (
          <p style={{ margin: 0, marginBottom: '5cqw', fontFamily: pair.body.family, fontWeight: 500, fontSize: '3cqw', letterSpacing: '0.08em', textTransform: 'uppercase', color: inkSoft }}>{design.label}</p>
        )}
        {titleNode}
        {support && <p style={{ margin: 0, marginTop: '2.6cqw', fontFamily: pair.body.family, fontSize: '3.2cqw', lineHeight: 1.4, color: inkSoft }}>{support}</p>}
      </div>
    </div>
  )
})

/**
 * Póster: papel claro, foto enmarcada y el titular partido en dos bloques que
 * pisan las esquinas del marco (arriba-izquierda y abajo-derecha).
 */
const PosterSlide = forwardRef<HTMLDivElement, { design: SlideDesign; title: string; support?: string; className: string; story?: boolean }>(function PosterSlide(
  { design, title, support, className, story },
  ref,
) {
  const pair = fontPair(design.fontPair)
  const [a, b] = splitPoster(title)
  const longest = Math.max(a.length, b.length, 4)
  // Archivo ancha en mayúsculas ≈ 1 em por letra: que el bloque quepa en ~88 cqw.
  const size = +(Math.min(17, 88 / (longest * 1.02)) * design.scale).toFixed(2)
  const titleColor = design.tone === 'oscuro' ? '#591427' : '#E8C552'
  const paper = design.bg.kind === 'color' ? design.bg.color : '#ECEAE6'
  // Marco de la foto: en story baja para respetar el nombre y la barra de respuesta.
  const top = story ? 36 : 22
  const bottom = story ? 60 : 29
  const block = (t: string, pos: React.CSSProperties) => (
    <span className="absolute whitespace-nowrap" style={{ ...pos, fontFamily: pair.title.family, fontWeight: pair.title.weight, fontStretch: pair.title.stretch, textTransform: pair.title.upper ? 'uppercase' : 'none', letterSpacing: pair.title.tracking, lineHeight: 1, fontSize: `${size}cqw`, color: titleColor }}>
      {t}
    </span>
  )
  return (
    <div ref={ref} data-preview className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: story ? '9 / 16' : '4 / 5', containerType: 'inline-size', background: paper }}>
      {design.bg.kind === 'photo' && (
        <div className="absolute overflow-hidden" style={{ left: '5.5cqw', right: '5.5cqw', top: `${top}cqw`, bottom: `${bottom}cqw`, background: '#2B1A1F' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={design.bg.src} alt="" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          {design.overlay > 0 && <div aria-hidden className="absolute inset-0" style={{ background: `rgba(20,6,10,${design.overlay})` }} />}
        </div>
      )}
      {block(a, { left: '2.5cqw', top: `calc(${top}cqw - ${size * 0.62}cqw)` })}
      {b && block(b, { right: '2.5cqw', bottom: `calc(${bottom}cqw - ${size * 0.42}cqw)` })}
      {support && (
        <p className="absolute" style={{ left: '5.5cqw', bottom: story ? (design.note ? '45cqw' : '41cqw') : design.note ? '10cqw' : '6cqw', width: '50cqw', margin: 0, fontFamily: pair.body.family, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.18, fontSize: '3.5cqw', color: '#1D1416' }}>{support}</p>
      )}
      {design.note && (
        <p className="absolute" style={{ left: '5.5cqw', bottom: story ? '40cqw' : '5cqw', margin: 0, fontFamily: pair.body.family, fontWeight: 500, textTransform: 'uppercase', fontSize: '2.7cqw', color: '#1D1416' }}>{design.note}</p>
      )}
    </div>
  )
})

/** Titular + apoyo reutilizable (dentro de la tarjeta crema). */
function ComposedText({ title, support, pairId, scale, ink, inkSoft, accent }: {
  title: string; support?: string; pairId: string; scale: number; ink: string; inkSoft: string; accent: string
}) {
  const pair = fontPair(pairId)
  const size = titleSizeCqw(title, pair, scale)
  return (
    <>
      <h3 style={{ margin: 0, fontFamily: pair.title.family, fontWeight: pair.title.weight, textTransform: pair.title.upper ? 'uppercase' : 'none', letterSpacing: pair.title.tracking, lineHeight: pair.title.lineHeight, fontSize: `${size}cqw`, color: ink, textWrap: 'balance' }}>
        {splitAccents(title).map((p, i) =>
          p.accent
            ? <span key={i} style={{ fontFamily: pair.accent.family, fontWeight: pair.accent.weight, fontStyle: pair.accent.italic ? 'italic' : 'normal', color: accent, textTransform: 'none' }}>{p.t}</span>
            : <span key={i}>{p.t}</span>,
        )}
      </h3>
      {support && <p style={{ margin: 0, marginTop: '2cqw', fontFamily: pair.body.family, fontWeight: pair.body.weight, lineHeight: pair.body.lineHeight, fontSize: '3.3cqw', color: inkSoft }}>{support}</p>}
    </>
  )
}
