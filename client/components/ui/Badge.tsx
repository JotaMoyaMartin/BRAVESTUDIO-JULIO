import { HTMLAttributes } from 'react'

type Tone = 'cherry' | 'buttermilk' | 'blue' | 'green' | 'danger' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const TONES: Record<Tone, { bg: string; color: string }> = {
  cherry: { bg: 'rgba(122,24,50,0.1)', color: 'var(--color-cherry)' },
  buttermilk: { bg: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' },
  blue: { bg: 'var(--color-pastel-blue)', color: '#2c5a78' },
  green: { bg: 'var(--color-pastel-green)', color: '#2a5a2a' },
  danger: { bg: '#fde8e8', color: 'var(--color-danger)' },
  neutral: { bg: 'rgba(90,20,39,0.06)', color: 'var(--color-cherry-dark)' },
}

export default function Badge({ tone = 'neutral', className = '', children, ...rest }: BadgeProps) {
  const { bg, color } = TONES[tone]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}
      style={{ background: bg, color }}
      {...rest}
    >
      {children}
    </span>
  )
}