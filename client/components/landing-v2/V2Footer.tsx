'use client'
import Link from 'next/link'

/**
 * Footer V2. Links reales: anclas de landing, login real, contacto real
 * (el email de soporte que ya usa la landing actual). Sin iconos sociales
 * sin enlace — no incluimos iconos que no tengamos.
 */
const CONTACT_EMAIL = 'braveheadquartes@gmail.com'

const LINKS = [
  { label: 'Funciones', href: '#funciones' },
  { label: 'Precios', href: '#precios' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Iniciar sesión', href: '/login' },
  { label: 'Contacto', href: `mailto:${CONTACT_EMAIL}` },
  { label: 'Privacidad', href: '#' },
  { label: 'Términos', href: '#' },
]

export default function V2Footer() {
  return (
    <footer style={{ background: 'var(--v2-vino-deep)', color: 'var(--v2-on-dark)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          {/* Marca */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-white"
                style={{ background: 'var(--color-cherry)' }}
                aria-hidden="true"
              >
                ✦
              </span>
              <span className="font-extrabold tracking-tight">BRÄVE Studio</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--v2-on-dark-soft)' }}>
              Tu sistema de marketing para el salón. Estrategia, contenido y publicación en un solo lugar.
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Links del footer" className="flex flex-wrap gap-x-8 gap-y-3">
            {LINKS.map((l) =>
              l.href.startsWith('#') || l.href.startsWith('mailto:') ? (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-[13px] font-semibold transition-opacity hover:opacity-100"
                  style={{ color: 'var(--v2-on-dark)', opacity: 0.75 }}
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-[13px] font-semibold transition-opacity hover:opacity-100"
                  style={{ color: 'var(--v2-on-dark)', opacity: 0.75 }}
                >
                  {l.label}
                </Link>
              )
            )}
          </nav>
        </div>

        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
          style={{ borderTop: '1px solid var(--v2-border-dark)', opacity: 0.6 }}
        >
          <span>© {new Date().getFullYear()} BRÄVE Studio · Hecho para estilistas y salones de belleza</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:opacity-100 transition-opacity">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}