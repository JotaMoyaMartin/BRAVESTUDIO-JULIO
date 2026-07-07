'use client'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface QuickActionCardProps {
  href: string
  icon: LucideIcon
  label: string
  desc: string
  tone: 'cherry' | 'blue' | 'buttermilk' | 'pink'
}

const TONES = {
  cherry: { bg: 'var(--color-cherry)', color: 'white' },
  blue: { bg: 'var(--color-pastel-blue)', color: '#2c5a78' },
  buttermilk: { bg: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' },
  pink: { bg: '#fce8ee', color: 'var(--color-cherry)' },
}

export default function QuickActionCard({ href, icon: Icon, label, desc, tone }: QuickActionCardProps) {
  const { bg, color } = TONES[tone]
  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="h-full p-5 rounded-[var(--radius-md)] flex flex-col items-start gap-3"
        style={{ background: bg, color, minHeight: '140px' }}
      >
        <Icon size={26} />
        <div>
          <p className="text-base font-bold leading-tight">{label}</p>
          <p className="text-xs mt-1 opacity-75 leading-snug">{desc}</p>
        </div>
      </motion.div>
    </Link>
  )
}