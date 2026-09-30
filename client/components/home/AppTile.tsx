'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

export interface AppTileLive {
  /** Portadas reales (9:16) que rotan de fondo — la sección es VIVA, no estática. */
  covers: string[]
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

const LIVE_ROTATE_MS = 4200

// Fan de portadas: leve abanico (como fotos de polaroid sobre una mesa) para
// que el tile se sienta de contenido, no de botón.
const LIVE_TILTS = [-5, 4, -2, 6, -4, 3]

/** Tile VIVO: título GRANDE (lo que llama la atención) y las portadas REALES
 *  que hay dentro de la sección en abanico. Sin portada fija: vive de los
 *  datos de la propia sección (móvil: título arriba + fila de portadas;
 *  pantallas anchas: texto a la izquierda + abanico a la derecha). */
function LiveCollageTile({
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
  // Primer render (SSR = cliente): orden de la base de datos. La rotación
  // (post-mount, sin Math.random en render) renueva qué portadas se ven.
  const [shown, setShown] = useState(() => live.covers.slice(0, 4))
  useEffect(() => {
    setShown(live.covers.slice(0, 4))
    if (n <= 4) return
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % n
      setShown([0, 1, 2, 3].map(k => live.covers[(i + k) % n]))
    }, LIVE_ROTATE_MS)
    return () => clearInterval(t)
  }, [live.covers, n])

  const { bg, color } = TONES[tone]
  return (
    <Link href={href} className="block" aria-label={label}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative flex flex-col sm:flex-row rounded-[var(--radius-md)] overflow-hidden aspect-auto sm:aspect-[2/1]"
        style={{ boxShadow: 'var(--shadow-soft)', background: bg }}
      >
        {/* Título protagonista + frase de apoyo */}
        <div className="px-4 pt-3.5 sm:px-6 sm:pt-6 flex-1 min-w-0">
          <p
            className="text-lg sm:text-[28px] font-extrabold text-cherry-dark leading-tight"
            style={{ letterSpacing: '-0.6px' }}
          >
            {label}
          </p>
          <p className="text-[11px] sm:text-sm font-semibold leading-snug text-cherry-dark" style={{ opacity: 0.7 }}>
            {live.caption}
          </p>
          <span
            className="mt-1.5 sm:mt-2 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold text-cherry-dark"
            style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.10)' }}
          >
            {n} {live.noun}
          </span>
        </div>
        {/* Abanico de portadas reales (se montan tras el SSR, sin desordenar
            el primer render: hidratación limpia) */}
        <div className="mt-2.5 sm:mt-0 flex-1 sm:flex-none sm:w-[44%] flex items-end sm:items-center justify-end sm:justify-center px-3 pb-2.5 sm:px-0 sm:pb-0 min-h-0">
          {shown.map((src, i) => (
            <img
              key={src.slice(-48) + String(i)}
              src={src}
              alt=""
              className="h-[110px] sm:h-[70%] sm:max-h-[150px] w-auto aspect-[9/16] rounded-[4px] object-cover -ml-3.5 first:ml-0 sm:-ml-6 sm:first:ml-0"
              style={{
                transform: `rotate(${LIVE_TILTS[i % LIVE_TILTS.length]}deg)`,
                border: '2px solid white',
                boxShadow: '0 3px 12px rgba(42,14,22,0.25)',
              }}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
      </motion.div>
    </Link>
  )
}

export default function AppTile({ href, icon: Icon, label, desc, tone, image, imageAspect, live }: AppTileProps) {
  if (live && live.covers.length > 0) {
    return <LiveCollageTile href={href} label={label} tone={tone} live={live} />
  }
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