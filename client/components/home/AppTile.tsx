'use client'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

export interface AppTileProps {
  href: string
  icon: LucideIcon
  label: string
  desc: string
  tone: 'cherry' | 'blue' | 'buttermilk' | 'pink' | 'green' | 'cream'
  /** Portada ilustrada: si viene, el tile es un banner con la imagen
   *  (el texto/CTA ya están en la propia imagen). */
  image?: string
}

const TONES = {
  cherry: { bg: 'var(--color-cherry)', color: 'white', iconBg: 'rgba(255,255,255,0.18)', border: 'none' },
  blue: { bg: 'var(--color-pastel-blue)', color: '#2c5a78', iconBg: 'rgba(122,24,50,0.10)', border: 'none' },
  buttermilk: { bg: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)', iconBg: 'rgba(122,24,50,0.10)', border: 'none' },
  pink: { bg: '#fce8ee', color: 'var(--color-cherry)', iconBg: 'rgba(122,24,50,0.10)', border: 'none' },
  green: { bg: 'var(--color-pastel-green)', color: 'var(--color-cherry-dark)', iconBg: 'rgba(122,24,50,0.10)', border: 'none' },
  cream: { bg: 'var(--color-cream)', color: 'var(--color-cherry-dark)', iconBg: 'rgba(122,24,50,0.10)', border: '1.5px solid rgba(122,24,50,0.10)' },
}

export default function AppTile({ href, icon: Icon, label, desc, tone, image }: AppTileProps) {
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
            style={{ aspectRatio: '1712 / 896' }}
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