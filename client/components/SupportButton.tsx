'use client'
import { Mail } from 'lucide-react'

const SUPPORT_EMAIL = 'braveheadquarters@gmail.com'

interface SupportButtonProps {
  subject?: string
  label?: string
  variant?: 'full' | 'inline' | 'compact'
  className?: string
}

/**
 * Reusable "Escribir a soporte" button. Opens a mailto to
 * braveheadquarters@gmail.com with an optional subject.
 *
 * variants:
 *  - full    -> card-style with helper text (landing/error pages)
 *  - inline  -> button row (forms, footers)
 *  - compact -> icon-only-ish small button
 */
export default function SupportButton({
  subject = 'Ayuda con BRÄVE Studio',
  label = 'Escribir a soporte',
  variant = 'inline',
  className = '',
}: SupportButtonProps) {
  const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
  const hint = 'Si tienes algún problema, escríbenos y te ayudamos.'

  if (variant === 'full') {
    return (
      <div className={className}>
        <p className="text-xs mb-2" style={{ color: '#591427', opacity: 0.7 }}>
          {hint}
        </p>
        <a
          href={href}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.2)' }}
        >
          <Mail size={16} />
          {label}
        </a>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <a
        href={href}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${className}`}
        style={{ background: '#FFF1B5', color: '#591427' }}
      >
        <Mail size={12} />
        {label}
      </a>
    )
  }

  // inline
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <p className="text-xs" style={{ color: '#591427', opacity: 0.6 }}>
        {hint}
      </p>
      <a
        href={href}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
        style={{ background: '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.18)' }}
      >
        <Mail size={14} />
        {label}
      </a>
    </div>
  )
}