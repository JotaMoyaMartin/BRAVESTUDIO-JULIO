'use client'
import Link from 'next/link'

const LINKS = [
  { label: 'Planes', href: '/pricing' },
  { label: 'Soporte', href: 'mailto:braveheadquartes@gmail.com' },
  { label: 'Términos', href: '#' },
  { label: 'Privacidad', href: '#' },
]

export default function LandingFooter() {
  return (
    <footer className="bg-cherry-dark text-cream py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: 'var(--color-cherry)' }}
              >
                <span className="text-white text-sm">✦</span>
              </div>
              <span className="font-bold text-sm">BRÄVE Studio</span>
            </div>
            <p className="text-xs opacity-70 max-w-xs">
              Contenido estratégico para estilistas y salones de belleza.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-100"
              style={{ opacity: 0.85, color: 'var(--color-cream)', border: '1px solid rgba(255,241,181,0.25)' }}
            >
              Ya tengo cuenta
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-xs hover:opacity-100 transition-opacity"
                  style={{ opacity: 0.7, color: 'var(--color-cream)' }}
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div
          className="mt-8 pt-6 flex flex-col sm:flex-row sm:justify-between gap-2 text-xs"
          style={{ borderTop: '1px solid rgba(255,241,181,0.15)', opacity: 0.6 }}
        >
          <span>© {new Date().getFullYear()} BRÄVE Studio</span>
          <a href="mailto:braveheadquartes@gmail.com" className="hover:opacity-100">
            braveheadquartes@gmail.com
          </a>
        </div>
      </div>
    </footer>
  )
}