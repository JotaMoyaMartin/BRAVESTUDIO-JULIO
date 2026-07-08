'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Beneficios', href: '#beneficios' },
  { label: 'Planes', href: '#planes' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Funciones', href: '#funciones' },
  { label: 'Preguntas', href: '#faq' },
]

export default function LandingHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 transition-all"
      style={{
        background: scrolled ? 'rgba(255,253,245,0.88)' : 'var(--color-cream)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: scrolled ? '1px solid rgba(255,241,181,0.6)' : '1px solid transparent',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--color-cherry)' }}
          >
            <span className="text-white text-base">✦</span>
          </div>
          <span className="font-bold text-base text-cherry-dark">BRÄVE Studio</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-cherry-dark opacity-70 hover:opacity-100 transition-opacity"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm font-semibold text-cherry-dark hidden sm:inline-flex items-center px-3.5 py-2 rounded-xl transition-all hover:-translate-y-0.5"
            style={{
              background: 'var(--color-buttermilk)',
              border: '1.5px solid rgba(122,24,50,0.18)',
            }}
          >
            Ya tengo cuenta
          </Link>
          <Link href="/signup" className="btn-primary text-sm hidden sm:inline-flex">
            Empieza gratis
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg text-cherry-dark"
            aria-label="Menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="lg:hidden border-t"
          style={{ background: 'var(--color-cream)', borderColor: 'rgba(255,241,181,0.6)' }}
        >
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-cherry-dark hover:bg-buttermilk transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,241,181,0.4)' }}>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 justify-center text-sm font-semibold text-cherry-dark inline-flex items-center px-3.5 py-2.5 rounded-xl transition-colors"
                style={{
                  background: 'var(--color-buttermilk)',
                  border: '1.5px solid rgba(122,24,50,0.18)',
                }}
              >
                Ya tengo cuenta
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="btn-primary flex-1 justify-center text-sm"
              >
                Empieza gratis
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}