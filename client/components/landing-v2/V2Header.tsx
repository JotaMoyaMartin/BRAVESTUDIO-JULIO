'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { NAV, CTA_PRICING_ANCHOR, CTA_PRIMARY } from './content'

function Logo({ light = true }: { light?: boolean }) {
  return (
    <Link href="/landing-v2" className="flex items-center gap-2" aria-label="BRÄVE Studio — inicio">
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white"
        style={{ background: 'var(--color-cherry)' }}
        aria-hidden="true"
      >
        ✦
      </span>
      <span className="font-extrabold text-sm tracking-tight" style={{ color: light ? 'var(--v2-on-dark)' : 'var(--v2-ink)' }}>
        BRÄVE Studio
      </span>
    </Link>
  )
}

/**
 * Header sticky: transparente sobre el hero oscuro → glass burgundy al hacer scroll.
 * Mobile: logo + hamburguesa con panel desplegable (navegación + login + CTA).
 */
export default function V2Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Bloquear scroll del body con el menú abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="v2-header" data-scrolled={scrolled}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo />

        {/* Nav desktop */}
        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-7">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[13px] font-semibold transition-opacity hover:opacity-100"
              style={{ color: 'var(--v2-on-dark)', opacity: 0.82 }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-semibold transition-opacity hover:opacity-100"
            style={{ color: 'var(--v2-on-dark)', opacity: 0.82 }}
          >
            Iniciar sesión
          </Link>
          <Link href={CTA_PRICING_ANCHOR} className="v2-btn v2-btn-light" style={{ padding: '0.6rem 1.2rem', fontSize: '0.72rem' }}>
            Empieza gratis
          </Link>
        </div>

        {/* Hamburguesa mobile */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="v2-mobile-nav"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ border: '1px solid var(--v2-border-dark)', color: 'var(--v2-on-dark)' }}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Panel mobile */}
      {open && (
        <div
          id="v2-mobile-nav"
          className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto"
          style={{ background: 'rgba(46,8,18,0.97)', backdropFilter: 'blur(14px)' }}
        >
          <nav aria-label="Navegación móvil" className="flex flex-col px-6 pt-6 gap-1">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="py-3.5 text-lg font-bold"
                style={{ color: 'var(--v2-on-dark)', borderBottom: '1px solid var(--v2-border-dark)' }}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="px-6 pt-8 pb-10 flex flex-col gap-3">
            <Link href={CTA_PRICING_ANCHOR} onClick={() => setOpen(false)} className="v2-btn v2-btn-light w-full">
              {CTA_PRIMARY}
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="v2-btn v2-btn-outline w-full"
            >
              Iniciar sesión
            </Link>
            <p className="text-[11px] text-center pt-2" style={{ color: 'var(--v2-on-dark-soft)' }}>
              7 días gratis · Cancela cuando quieras
            </p>
          </div>
        </div>
      )}
    </header>
  )
}