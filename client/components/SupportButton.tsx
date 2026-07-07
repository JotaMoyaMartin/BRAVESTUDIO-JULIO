'use client'
import { useState } from 'react'
import { Mail, Copy, Check } from 'lucide-react'

const SUPPORT_EMAIL = 'braveheadquartes@gmail.com'

interface SupportButtonProps {
  subject?: string
  label?: string
  variant?: 'full' | 'inline' | 'compact'
  className?: string
}

/**
 * Reusable "Escribir a soporte" button. Copies the support email to the
 * clipboard and attempts to open a mailto:. Also shows the email address
 * visibly so the user can copy it manually if mailto doesn't work.
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
  const [copied, setCopied] = useState(false)
  const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
  const hint = 'Si tienes algún problema, escríbenos y te ayudamos.'

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Copy email to clipboard first so user has it even if mailto fails
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard not available — let mailto proceed
    }
    // Allow the anchor's default mailto navigation to happen
  }

  if (variant === 'full') {
    return (
      <div className={className}>
        <p className="text-xs mb-2" style={{ color: '#591427', opacity: 0.7 }}>
          {hint}
        </p>
        <a
          href={href}
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.2)' }}
        >
          {copied ? <Check size={16} /> : <Mail size={16} />}
          {copied ? '¡Email copiado!' : label}
        </a>
        <p className="text-xs mt-2 font-mono" style={{ color: '#591427', opacity: 0.6 }}>
          {SUPPORT_EMAIL}
        </p>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <a
        href={href}
        onClick={handleClick}
        title={copied ? '¡Email copiado!' : SUPPORT_EMAIL}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${className}`}
        style={{ background: copied ? '#B8D8B0' : '#FFF1B5', color: '#591427' }}
      >
        {copied ? <Check size={12} /> : <Mail size={12} />}
        {copied ? '¡Copiado!' : label}
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
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
        style={{ background: copied ? '#B8D8B0' : '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.18)' }}
      >
        {copied ? <Check size={14} /> : <Mail size={14} />}
        {copied ? '¡Email copiado!' : label}
      </a>
      <p className="text-xs font-mono select-all" style={{ color: '#591427', opacity: 0.55 }}>
        {SUPPORT_EMAIL}
      </p>
    </div>
  )
}