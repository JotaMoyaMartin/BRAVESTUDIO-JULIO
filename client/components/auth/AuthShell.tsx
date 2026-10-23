'use client'
/**
 * Marco de las pantallas de entrada (login y acceso Skool), 23-oct-2026.
 * Tarjeta centrada como siempre, sobre fondo granate con luz suave y grano:
 * más elegante, sin fotos.
 */
import type { ReactNode } from 'react'

const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")"

export default function AuthShell({ eyebrow, title, subtitle, children, footer }: {
  eyebrow: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-10"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, #7A1832 0%, #591427 45%, #2B0F18 100%)' }}>
      {/* Luces y grano */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full opacity-40 blur-3xl" style={{ background: '#B8324F' }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-32 w-[520px] h-[520px] rounded-full opacity-25 blur-3xl" style={{ background: '#F6E7A6' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      <div className="relative w-full max-w-[400px]">
        {/* Marca */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-xl"
            style={{ background: 'rgba(255,247,238,0.1)', border: '1px solid rgba(246,231,166,0.35)', color: '#F6E7A6', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}>✦</div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#F6E7A6' }}>{eyebrow}</p>
          <h1 className="mt-1 text-[40px] leading-none" style={{ color: '#FFF7EE', fontFamily: 'var(--font-instrument), "Instrument Serif", Georgia, serif' }}>
            BRÄVE <em style={{ color: '#F6E7A6' }}>Studio</em>
          </h1>
        </div>

        {/* Tarjeta */}
        <div className="rounded-[28px] p-7 sm:p-8"
          style={{ background: '#FFFBF5', boxShadow: '0 30px 80px -30px rgba(0,0,0,0.6), 0 0 0 1px rgba(246,231,166,0.25)' }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52, background: '#FFF1B5' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bravi2.png" alt="" className="bravi-float" style={{ width: 36, height: 36, objectFit: 'contain' }} draggable={false} />
            </span>
            <div>
              <h2 className="text-[22px] leading-tight font-semibold" style={{ color: '#2B1A1F' }}>{title}</h2>
              {subtitle && <p className="text-[14px] leading-snug mt-0.5" style={{ color: '#6B5A5F' }}>{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>

        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>
  )
}
