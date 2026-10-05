'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export interface AppTileLive {
  /** Portadas reales (9:16) que rotan de fondo — la sección es VIVA, no estática. */
  covers: string[]
  /** Etiqueta flotante por portada (misma posición que covers): su categoría. */
  tags?: (string | null)[]
  /** Total del apartado para el contador (si el deck enseña menos portadas
   *  de las que hay — p.ej. covers que aún no están desplegadas). */
  total?: number
  /** Frase gancho grande (Poppins 800). */
  caption: string
  /** Contador del chip: "3 reels listos" / "9 transiciones". */
  noun: string
}

export interface AppTileProps {
  href: string
  icon: LucideIcon
  label: string
  desc: string
  tone: 'cherry' | 'blue' | 'buttermilk' | 'pink' | 'green' | 'cream'
  /** Portada ilustrada: si viene, el tile es un banner con la imagen
   *  (el texto/CTA ya están en la propia imagen). */
  image?: string
  /** Aspect ratio de la portada (CSS). Por defecto 1:2 horizontal. */
  imageAspect?: string
  /** Tile vivo (portadas reales rotando): manda sobre `image` cuando hay portadas. */
  live?: AppTileLive
  /** Copy para el estado vivo (lo rellena ToolsSection cuando hay datos). */
  liveCaption?: string
  liveNoun?: string
}

const TONES = {
  cherry: { bg: 'var(--color-cherry)', color: 'white', iconBg: 'rgba(255,255,255,0.18)', border: 'none' },
  blue: { bg: 'var(--color-pastel-blue)', color: '#2c5a78', iconBg: 'rgba(122,24,50,0.10)', border: 'none' },
  buttermilk: { bg: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)', iconBg: 'rgba(122,24,50,0.10)', border: 'none' },
  pink: { bg: '#fce8ee', color: 'var(--color-cherry)', iconBg: 'rgba(122,24,50,0.10)', border: 'none' },
  green: { bg: 'var(--color-pastel-green)', color: 'var(--color-cherry-dark)', iconBg: 'rgba(122,24,50,0.10)', border: 'none' },
  cream: { bg: 'var(--color-cream)', color: 'var(--color-cherry-dark)', iconBg: 'rgba(122,24,50,0.10)', border: '1.5px solid rgba(122,24,50,0.10)' },
}

const LIVE_ROTATE_MS = 2600

// Deck del hero: la portada protagonista con un leve giro y dos asomando detrás.
const HERO_TILTS = [-3, -7, 6]

/** Tile VIVO (hero): el texto GRANDE a la izquierda (lo diseña Jota) y a la
 *  derecha un deck dinámico que va pasando las portadas REALES de la sección,
 *  cada una con su categoría flotando encima. Determinista en SSR (sin
 *  Math.random): la rotación empieza post-mount, hidratación limpia. */
function LiveHeroTile({
  href,
  label,
  tone,
  live,
}: {
  href: string
  label: string
  tone: keyof typeof TONES
  live: AppTileLive
}) {
  const n = live.covers.length
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (n <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % n), LIVE_ROTATE_MS)
    return () => clearInterval(t)
  }, [n])

  const { bg, color } = TONES[tone]
  const heroCover = live.covers[idx]
  const heroTag = live.tags?.[idx] ?? null
  // Dos portadas de fondo (las siguientes en la cola).
  const back = [1, 2].map(k => live.covers[(idx + k) % n])

  return (
    <Link href={href} className="block" aria-label={label}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative flex flex-col sm:flex-row rounded-[var(--radius-md)] overflow-hidden aspect-auto sm:aspect-[2/1]"
        style={{ boxShadow: 'var(--shadow-soft)', background: bg }}
      >
        {/* Izquierda — texto grande + CTA */}
        <div className="px-4 pt-3.5 sm:px-6 sm:py-6 flex-1 min-w-0 flex flex-col">
          <p
            className="text-xl sm:text-[32px] font-extrabold leading-tight"
            style={{ letterSpacing: '-0.8px', color }}
          >
            {label}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-sm font-semibold leading-snug" style={{ color, opacity: 0.75 }}>
            {live.caption}
          </p>
          <div className="mt-2 sm:mt-auto sm:pt-3 flex items-center gap-2.5 flex-wrap">
            <span
              className="w-fit px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5"
              style={{ background: 'white', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.10)' }}
            >
              Ver ideas <ArrowRight size={12} />
            </span>
            <span className="text-[10px] font-bold" style={{ color, opacity: 0.6 }}>
              {live.total ?? n} {live.noun}
            </span>
          </div>
        </div>
        {/* Derecha — deck dinámico: portadas reales pasando solas */}
        <div className="mt-2.5 sm:mt-0 relative flex-1 sm:flex-none sm:w-[42%] min-h-[132px] sm:min-h-0 flex items-end sm:items-center justify-center px-3 pb-3 sm:px-0 sm:pb-0">
          {back.map((src, k) => (
            <img
              key={'back' + k + src}
              src={src}
              alt=""
              className="absolute h-[104px] sm:h-[62%] sm:max-h-[140px] w-auto aspect-[9/16] object-cover rounded-lg"
              style={{
                border: '2px solid white',
                boxShadow: '0 3px 12px rgba(42,14,22,0.22)',
                transform: `rotate(${HERO_TILTS[k + 1]}deg) translateX(${k === 0 ? -38 : 38}px)`,
                zIndex: k === 0 ? 2 : 1,
              }}
              loading="lazy"
            />
          ))}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={heroCover}
              src={heroCover}
              alt=""
              className="relative h-[128px] sm:h-[76%] sm:max-h-[172px] w-auto aspect-[9/16] object-cover rounded-lg"
              style={{ border: '2px solid white', boxShadow: '0 6px 18px rgba(42,14,22,0.30)', zIndex: 3 }}
              initial={{ opacity: 0, y: 26, scale: 0.92, rotate: 0 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: HERO_TILTS[0] }}
              exit={{ opacity: 0, y: -22, scale: 0.94, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              loading="eager"
            />
          </AnimatePresence>
          {/* Chip flotante: la categoría de la portada en pantalla */}
          <div className="absolute z-20 bottom-1.5 right-2 sm:bottom-4 sm:right-3">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={heroTag ?? 'n'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                style={{
                  background: 'white',
                  color: 'var(--color-cherry-dark)',
                  border: '1.5px solid rgba(122,24,50,0.12)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                {heroTag ?? live.noun}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

export default function AppTile({ href, icon: Icon, label, desc, tone, image, imageAspect, live }: AppTileProps) {
  // La portada curada (image) manda sobre el tile vivo: es la cara que Jota
  // eligió para la sección. El abanico de portadas reales solo si no hay banner.
  if (image) {
    return (
      <Link href={href} className="block" aria-label={label}>
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="rounded-[var(--radius-md)] overflow-hidden"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          <img
            src={image}
            alt={label}
            className="w-full h-full object-cover block"
            style={{ aspectRatio: imageAspect || '1774 / 887' }}
            loading="lazy"
          />
        </motion.div>
      </Link>
    )
  }
  // Tile vivo (hero con deck dinámico): solo si no hay portada curada.
  if (live && live.covers.length > 0) {
    return <LiveHeroTile href={href} label={label} tone={tone} live={live} />
  }
  const { bg, color, iconBg, border } = TONES[tone]
  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="min-h-[168px] sm:min-h-[176px] p-5 rounded-[var(--radius-md)] flex flex-col items-start gap-3"
        style={{ background: bg, color, border, boxShadow: 'var(--shadow-soft)' }}
      >
        <span
          className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon size={26} />
        </span>
        <div>
          <p className="text-[15px] font-bold leading-tight">{label}</p>
          <p className="text-xs mt-1 opacity-75 leading-snug">{desc}</p>
        </div>
      </motion.div>
    </Link>
  )
}