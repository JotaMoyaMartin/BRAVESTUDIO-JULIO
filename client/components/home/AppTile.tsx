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

/** Tile VIVO: portada real a sangre que rota sola + degradado + texto grande.
 *  No hace falta portada fija: el tile se actualiza a sí mismo con lo que
 *  hay en la sección (cada visita puede enseñarte algo distinto). */
function LiveCollageTile({ href, label, live }: { href: string; label: string; live: AppTileLive }) {
  const n = live.covers.length
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (n <= 1) return
    // El salto inicial va en el mount (Math.random en render rompería SSR/hidratación).
    setIdx(Math.floor(Math.random() * n))
    const t = setInterval(() => setIdx(i => (i + 1) % n), LIVE_ROTATE_MS)
    return () => clearInterval(t)
  }, [n])

  return (
    <Link href={href} className="block" aria-label={label}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative rounded-[var(--radius-md)] overflow-hidden"
        style={{ aspectRatio: '1774 / 887', boxShadow: 'var(--shadow-soft)', background: 'var(--color-cherry-dark)' }}
      >
        {live.covers.map((src, i) => (
          <img
            key={src.slice(-48) + String(i)}
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === idx ? 1 : 0 }}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(42,14,22,0.92) 0%, rgba(42,14,22,0.40) 55%, rgba(42,14,22,0.05) 100%)' }}
        />
        <span
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(4px)' }}
        >
          {n} {live.noun}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--color-buttermilk)' }}>
            {label}
          </p>
          <p
            className="mt-1 text-lg sm:text-2xl font-extrabold text-white leading-tight"
            style={{ letterSpacing: '-0.5px', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
          >
            {live.caption}
          </p>
        </div>
      </motion.div>
    </Link>
  )
}

export default function AppTile({ href, icon: Icon, label, desc, tone, image, imageAspect, live }: AppTileProps) {
  if (live && live.covers.length > 0) {
    return <LiveCollageTile href={href} label={label} live={live} />
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