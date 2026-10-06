'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { CTA_PRICING_ANCHOR, MICROCOPY_TRIAL } from './content'

const DISMISS_KEY = 'brave_v2_sticky_dismissed'

/**
 * CTA fijo inferior SOLO en móvil. Aparece tras el primer scroll (>650px).
 * Descartable con ✕ (se recuerda en sessionStorage para no ser invasivo).
 */
export default function V2StickyCTA() {
  const [visible, setVisible] = useState(false)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setEnabled(false)
        return
      }
    } catch {
      // sessionStorage no disponible → el CTA simplemente se muestra
    }

    const onScroll = () => setVisible(window.scrollY > 650)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!enabled) return null

  function dismiss() {
    setEnabled(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // sin persistencia disponible
    }
  }

  return (
    <div
      className="v2-sticky-cta md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pb-3"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(120%)', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
    >
      <div
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'rgba(46,8,18,0.94)', backdropFilter: 'blur(12px)', border: '1px solid var(--v2-border-dark)', boxShadow: '0 -8px 30px rgba(20,4,8,0.35)' }}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: 'var(--v2-on-dark)' }}>Empieza hoy</p>
          <p className="text-[10px] truncate" style={{ color: 'var(--v2-on-dark-soft)' }}>{MICROCOPY_TRIAL}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link href={CTA_PRICING_ANCHOR} className="v2-cta v2-cta-light v2-btn v2-btn-light" style={{ padding: '0.6rem 1rem', fontSize: '0.68rem' }}>
            Empieza gratis
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar aviso"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full"
            style={{ color: 'var(--v2-on-dark-soft)' }}
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}