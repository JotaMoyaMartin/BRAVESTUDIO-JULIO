// Banners de sección hechos con código (22-oct-2026): mismo lenguaje que las
// portadas ilustradas de /public/tiles (título grande a la izquierda + botón
// píldora con flecha + composición sobre peana a la derecha), pero con fotos
// reales del banco (/public/tiles/secciones) y objetos dibujados con CSS.
// Todo escala con el ancho del banner (unidades cqw), así se ve igual en
// móvil y escritorio. Decorativo: el enlace lleva el aria-label.
import type { CSSProperties, ReactNode } from 'react'
import { ArrowRight, Zap, Camera, Sparkles, Scissors, Play, Heart, Bookmark, ImageIcon, TrendingUp } from 'lucide-react'

export type SectionBannerKind = 'ganchos' | 'carruseles' | 'estudio' | 'videos' | 'analisis'

const IMG = '/tiles/secciones'

interface Theme {
  bg: string
  ink: string
  pill: string
  podium: string
  podiumEdge: string
}

const THEMES: Record<SectionBannerKind, Theme> = {
  ganchos: {
    bg: 'radial-gradient(120% 90% at 78% 30%, #FFF6D2 0%, #FFE9A6 55%, #FCD98A 100%)',
    ink: '#591427', pill: '#7A1832', podium: '#FFF4D6', podiumEdge: '#F2D58E',
  },
  carruseles: {
    bg: 'radial-gradient(120% 90% at 75% 30%, #FDEFF2 0%, #F7D6DE 60%, #EFC3CF 100%)',
    ink: '#591427', pill: '#7A1832', podium: '#FBE8EC', podiumEdge: '#E8BCC7',
  },
  estudio: {
    bg: 'radial-gradient(120% 90% at 75% 30%, #FFFBF6 0%, #F8ECE4 60%, #EEDACE 100%)',
    ink: '#3B1F17', pill: '#7A1832', podium: '#FFF7F0', podiumEdge: '#E6CDBE',
  },
  videos: {
    bg: 'radial-gradient(120% 90% at 75% 30%, #EEF3FF 0%, #D9E4FB 60%, #C6D5F5 100%)',
    ink: '#14224A', pill: '#14224A', podium: '#F1E6EE', podiumEdge: '#CBD6F0',
  },
  analisis: {
    bg: 'radial-gradient(120% 90% at 78% 25%, #8E2443 0%, #6B1630 55%, #4A0F22 100%)',
    ink: '#FFF1B5', pill: '#FFF1B5', podium: '#7E2140', podiumEdge: '#5A1427',
  },
}

const TITLES: Record<SectionBannerKind, [string, string]> = {
  ganchos: ['Banco de', 'Ganchos'],
  carruseles: ['Tus', 'Carruseles'],
  estudio: ['Estudio de', 'Fotos'],
  videos: ['Editar', 'Vídeos'],
  analisis: ['Tu', 'Análisis'],
}

/** Posición en % del banner (izq/arriba) + ancho en % del ancho. */
function at(left: number, top: number, width: number, extra: CSSProperties = {}): CSSProperties {
  return { position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${width}%`, ...extra }
}

/** Rayitas blancas de «brillo», como en las portadas ilustradas. */
function Sparks({ left, top, flip = false }: { left: number; top: number; flip?: boolean }) {
  const bar = (rot: number, dx: number, dy: number, len = 3.4): CSSProperties => ({
    position: 'absolute', left: `${dx}cqw`, top: `${dy}cqw`, width: `${len}cqw`, height: '0.9cqw',
    borderRadius: 99, background: 'rgba(255,255,255,0.92)', transform: `rotate(${rot}deg)`,
    boxShadow: '0 0.3cqw 0.8cqw rgba(89,20,39,0.10)',
  })
  return (
    <div style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: flip ? 'scaleX(-1)' : undefined }}>
      <span style={bar(-60, 0, 0)} />
      <span style={bar(-25, 2.6, 2.6)} />
      <span style={bar(10, 3.2, 6, 3)} />
    </div>
  )
}

/** Peana redonda (dos discos) donde se apoya la composición. */
function Podium({ t, left = 47, width = 50 }: { t: Theme; left?: number; width?: number }) {
  return (
    <>
      <div style={at(left, 79, width, { height: '13%', borderRadius: '50%', background: t.podiumEdge })} />
      <div style={at(left, 74, width, { height: '13%', borderRadius: '50%', background: t.podium, boxShadow: '0 1cqw 2.4cqw rgba(60,20,30,0.16)' })} />
    </>
  )
}

/** Teléfono con foto real dentro. */
function Phone({ src, style, children }: { src: string; style: CSSProperties; children?: ReactNode }) {
  return (
    <div
      style={{
        ...style, aspectRatio: '9 / 18.5', borderRadius: '3.2cqw', padding: '0.7cqw',
        background: 'linear-gradient(145deg, #F4D9D2, #D9AFA6)',
        boxShadow: '0 2.2cqw 4cqw rgba(60,20,30,0.30)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '2.6cqw', overflow: 'hidden', background: '#2b1a1f' }}>
        <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <span style={{ position: 'absolute', top: '2.5%', left: '50%', transform: 'translateX(-50%)', width: '34%', height: '3.2%', borderRadius: 99, background: '#1c1013' }} />
        {children}
      </div>
    </div>
  )
}

/** Baldosa 3D con icono (como los iconos glossy de las portadas). */
function IconTile({ icon, style, bg = '#FBE3E9', fg = '#7A1832' }: { icon: ReactNode; style: CSSProperties; bg?: string; fg?: string }) {
  return (
    <div
      style={{
        ...style, aspectRatio: '1', borderRadius: '2.6cqw', background: bg, color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 -0.7cqw 0 rgba(0,0,0,0.08), 0 1.6cqw 3cqw rgba(60,20,30,0.20)',
      }}
    >
      {icon}
    </div>
  )
}

const ICON = { width: '55%', height: '55%' }

function Ganchos() {
  return (
    <>
      <Podium t={THEMES.ganchos} />
      {/* Bocadillos con ganchos reales del banco */}
      <div style={at(51, 17, 21, { transform: 'rotate(-7deg)', background: 'white', borderRadius: '2cqw', padding: '1.6cqw 1.8cqw', boxShadow: '0 1.6cqw 3cqw rgba(89,20,39,0.18)', color: '#591427', fontWeight: 800, fontSize: '1.65cqw', lineHeight: 1.2 })}>
        «Si te pasa esto, probablemente…»
      </div>
      <div style={at(50, 50, 19, { transform: 'rotate(5deg)', background: '#7A1832', borderRadius: '2cqw', padding: '1.6cqw 1.8cqw', boxShadow: '0 1.6cqw 3cqw rgba(89,20,39,0.25)', color: 'white', fontWeight: 800, fontSize: '1.6cqw', lineHeight: 1.2 })}>
        «3 trucos para que tu color dure»
      </div>
      <Phone src={`${IMG}/ganchos.jpg`} style={at(66, 9, 17, { transform: 'rotate(4deg)' })}>
        <span style={{ position: 'absolute', left: '8%', right: '8%', top: '18%', background: 'rgba(255,255,255,0.94)', color: '#591427', borderRadius: '1.2cqw', padding: '1cqw', fontWeight: 800, fontSize: '1.35cqw', lineHeight: 1.15, textAlign: 'center' }}>
          Si tu rubio siempre acaba amarillo…
        </span>
      </Phone>
      <IconTile icon={<Zap style={ICON} fill="currentColor" />} style={at(86, 16, 10, { transform: 'rotate(8deg)' })} bg="#7A1832" fg="#FFF1B5" />
      <Sparks left={85} top={58} />
    </>
  )
}

function Carruseles() {
  const slide = (src: string, rot: number, left: number, top: number, z: number, label?: string): ReactNode => (
    <div style={at(left, top, 19, { aspectRatio: '4 / 5', transform: `rotate(${rot}deg)`, borderRadius: '1.6cqw', overflow: 'hidden', border: '0.6cqw solid white', boxShadow: '0 1.8cqw 3.6cqw rgba(89,20,39,0.25)', zIndex: z, background: '#eee' })}>
      <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {label && (
        <span style={{ position: 'absolute', left: '7%', right: '7%', bottom: '7%', background: '#7A1832', color: 'white', borderRadius: '1cqw', padding: '0.9cqw 1cqw', fontWeight: 800, fontSize: '1.5cqw', lineHeight: 1.15 }}>
          3 errores con tu balayage
        </span>
      )}
    </div>
  )
  return (
    <>
      <Podium t={THEMES.carruseles} />
      {slide(`${IMG}/carrusel-3.jpg`, 10, 75, 16, 1)}
      {slide(`${IMG}/carrusel-2.jpg`, -9, 53, 18, 2)}
      {slide(`${IMG}/carrusel-1.jpg`, 0, 62, 10, 3, 'label')}
      {/* Puntitos de carrusel */}
      <div style={at(64, 80, 14, { display: 'flex', gap: '0.8cqw', justifyContent: 'center', zIndex: 4 })}>
        {[1, 0, 0, 0, 0].map((on, i) => (
          <span key={i} style={{ width: on ? '2.4cqw' : '0.9cqw', height: '0.9cqw', borderRadius: 99, background: on ? '#7A1832' : 'rgba(122,24,50,0.30)' }} />
        ))}
      </div>
      <IconTile icon={<Bookmark style={ICON} fill="currentColor" />} style={at(88, 52, 8.5, { transform: 'rotate(10deg)', zIndex: 4 })} />
      <IconTile icon={<Heart style={ICON} fill="currentColor" />} style={at(51, 56, 7.5, { transform: 'rotate(-12deg)', zIndex: 4 })} bg="#7A1832" fg="white" />
      <Sparks left={88} top={10} />
    </>
  )
}

function Estudio() {
  return (
    <>
      <Podium t={THEMES.estudio} />
      {/* Polaroid con el resultado */}
      <div style={at(51, 14, 20, { transform: 'rotate(-8deg)', background: 'white', padding: '1cqw 1cqw 3.6cqw', borderRadius: '0.8cqw', boxShadow: '0 1.8cqw 3.6cqw rgba(60,30,20,0.22)' })}>
        <img src={`${IMG}/estudio-2.jpg`} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', borderRadius: '0.4cqw' }} />
      </div>
      <Phone src={`${IMG}/estudio-1.jpg`} style={at(68, 8, 17, { transform: 'rotate(5deg)' })}>
        {/* Interfaz de cámara: obturador */}
        <span style={{ position: 'absolute', left: '50%', bottom: '6%', transform: 'translateX(-50%)', width: '24%', aspectRatio: '1', borderRadius: '50%', border: '0.5cqw solid white', background: 'rgba(255,255,255,0.35)' }} />
        <span style={{ position: 'absolute', left: '10%', right: '10%', top: '14%', bottom: '24%', border: '0.25cqw solid rgba(255,255,255,0.7)', borderRadius: '1cqw' }} />
      </Phone>
      <IconTile icon={<Camera style={ICON} />} style={at(87, 52, 9, { transform: 'rotate(10deg)' })} />
      <IconTile icon={<Sparkles style={ICON} />} style={at(50, 58, 7.5, { transform: 'rotate(-10deg)' })} bg="#7A1832" fg="#FFF1B5" />
      <Sparks left={88} top={12} />
    </>
  )
}

function Videos() {
  return (
    <>
      <Podium t={THEMES.videos} />
      <Phone src={`${IMG}/videos.jpg`} style={at(52, 7, 17, { transform: 'rotate(-4deg)' })}>
        <span style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)', width: '30%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A1832' }}>
          <Play style={{ width: '50%', height: '50%' }} fill="currentColor" />
        </span>
        <span style={{ position: 'absolute', left: '8%', right: '8%', bottom: '10%', background: '#FFF1B5', color: '#14224A', borderRadius: '0.9cqw', padding: '0.7cqw', fontWeight: 800, fontSize: '1.3cqw', textAlign: 'center' }}>
          sin silencios
        </span>
      </Phone>
      {/* Línea de tiempo con cortes */}
      <div style={at(68, 30, 27, { background: 'white', borderRadius: '1.8cqw', padding: '1.6cqw', boxShadow: '0 1.8cqw 3.6cqw rgba(20,34,74,0.18)' })}>
        <div style={{ display: 'flex', gap: '0.6cqw', alignItems: 'center', height: '4.2cqw' }}>
          {[38, 70, 52, 0, 84, 60, 0, 45, 76, 58].map((h, i) =>
            h === 0
              ? <span key={i} style={{ width: '0.5cqw', height: '100%', borderRadius: 99, background: '#E2435F' }} />
              : <span key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 99, background: i % 2 ? '#7A1832' : '#C7A1B0' }} />,
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.6cqw', marginTop: '1.2cqw' }}>
          {['#D9E4FB', '#F7D6DE', '#FFF1B5'].map(c => <span key={c} style={{ flex: 1, height: '2.6cqw', borderRadius: '0.8cqw', background: c }} />)}
        </div>
      </div>
      <IconTile icon={<Scissors style={ICON} />} style={at(86, 58, 9, { transform: 'rotate(10deg)' })} bg="#14224A" fg="white" />
      <Sparks left={88} top={8} />
    </>
  )
}

function Analisis() {
  return (
    <>
      <Podium t={THEMES.analisis} left={46} width={52} />
      {/* Tarjeta con barras (sin números: es una ilustración, no datos) */}
      <div style={at(52, 14, 25, { background: '#FFF7EE', borderRadius: '2cqw', padding: '1.8cqw', boxShadow: '0 2cqw 4cqw rgba(0,0,0,0.30)', transform: 'rotate(-4deg)' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8cqw', color: '#7A1832', fontWeight: 800, fontSize: '1.5cqw' }}>
          <TrendingUp style={{ width: '2.2cqw', height: '2.2cqw' }} /> Lo que funciona
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1cqw', height: '9cqw', marginTop: '1.4cqw' }}>
          {[34, 48, 40, 66, 58, 88].map((h, i) => (
            <span key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '0.7cqw 0.7cqw 0.3cqw 0.3cqw', background: i === 5 ? '#7A1832' : '#F3C7D2' }} />
          ))}
        </div>
      </div>
      {/* Rejilla de Instagram con fotos reales */}
      <div style={at(72, 8, 22, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7cqw', padding: '0.9cqw', background: 'white', borderRadius: '1.8cqw', transform: 'rotate(6deg)', boxShadow: '0 2cqw 4cqw rgba(0,0,0,0.30)' })}>
        {['analisis-1', 'analisis-2', 'analisis-3', 'analisis-4'].map(n => (
          <img key={n} src={`${IMG}/${n}.jpg`} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block', borderRadius: '0.8cqw' }} />
        ))}
      </div>
      <IconTile icon={<ImageIcon style={ICON} />} style={at(51, 60, 7.5, { transform: 'rotate(-10deg)' })} bg="#FFF1B5" fg="#7A1832" />
      <Sparks left={90} top={66} />
    </>
  )
}

const SCENES: Record<SectionBannerKind, () => ReactNode> = {
  ganchos: Ganchos, carruseles: Carruseles, estudio: Estudio, videos: Videos, analisis: Analisis,
}

export default function SectionBanner({ kind }: { kind: SectionBannerKind }) {
  const t = THEMES[kind]
  const [light, bold] = TITLES[kind]
  const Scene = SCENES[kind]
  return (
    <div
      aria-hidden
      style={{ position: 'relative', width: '100%', aspectRatio: '1774 / 887', background: t.bg, overflow: 'hidden', containerType: 'inline-size' }}
    >
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(1.08)', transformOrigin: '52% 58%' }}>
        <Scene />
      </div>
      <div style={{ position: 'absolute', left: '7.5%', top: 0, bottom: 0, width: '42%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: t.ink, zIndex: 5 }}>
        <span style={{ fontSize: '5.8cqw', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.2cqw' }}>{light}</span>
        <span style={{ fontSize: bold.length >= 9 ? '7cqw' : '8.4cqw', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.3cqw', marginTop: '0.6cqw' }}>{bold}</span>
        <span
          style={{
            marginTop: '3.4cqw', width: '15.5cqw', height: '7.6cqw', borderRadius: '3.8cqw', background: t.pill,
            color: kind === 'analisis' ? '#591427' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 -0.6cqw 0 rgba(0,0,0,0.18), 0 1.4cqw 2.6cqw rgba(30,10,20,0.25)',
          }}
        >
          <ArrowRight style={{ width: '3.6cqw', height: '3.6cqw' }} strokeWidth={2.6} />
        </span>
      </div>
    </div>
  )
}
