'use client'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface Props {
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  hasBrand: boolean
}

/**
 * Toggle "USAR MI MARCA" — cuando está activo, la generación de contenido
 * usa la estrategia completa del salón (servicios a promocionar, clienta
 * ideal, pilares, estilo de comunicación...).
 *
 * Si no hay marca configurada, se muestra deshabilitado con un enlace
 * a /mi-marca para que la usuaria sepa que la opción existe y cómo activarla.
 */
export default function UsarMiMarcaToggle({ enabled, onChange, disabled, hasBrand }: Props) {
  if (!hasBrand) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: 'var(--color-warm-gray)',
          border: '1.5px dashed rgba(122,24,50,0.25)',
          opacity: 0.85,
        }}
      >
        <span
          className="inline-flex items-center justify-center w-9 h-5 rounded-full flex-shrink-0"
          style={{ background: 'rgba(122,24,50,0.15)' }}
        >
          <span className="w-3.5 h-3.5 rounded-full bg-white opacity-60" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold" style={{ color: 'var(--color-cherry-dark)' }}>
              ✦ Usar Mi Marca
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(122,24,50,0.15)', color: 'var(--color-cherry-dark)' }}
            >
              Inactivo
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-cherry-dark)', opacity: 0.7 }}>
            Configura tu estrategia en{' '}
            <Link href="/mi-marca" className="font-semibold underline" style={{ color: 'var(--color-cherry)' }}>
              Mi Marca
            </Link>{' '}
            para activar esta opción.
          </p>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all w-full text-left"
      style={{
        background: enabled ? 'rgba(122,24,50,0.06)' : 'var(--color-warm-gray)',
        border: `1.5px solid ${enabled ? 'var(--color-cherry)' : 'rgba(122,24,50,0.15)'}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        className="inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors flex-shrink-0"
        style={{ background: enabled ? 'var(--color-cherry)' : 'rgba(122,24,50,0.2)' }}
      >
        <span
          className="w-3.5 h-3.5 rounded-full bg-white shadow-soft transition-transform"
          style={{ transform: enabled ? 'translateX(8px)' : 'translateX(-8px)' }}
        />
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold" style={{ color: 'var(--color-cherry-dark)' }}>
            ✦ Usar Mi Marca
          </span>
          {enabled ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'var(--color-cherry)', color: 'white' }}>
              <Sparkles size={9} /> On
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(122,24,50,0.12)', color: 'var(--color-cherry-dark)' }}>
              Off
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-cherry-dark)', opacity: 0.65 }}>
          {enabled
            ? 'Generando con tu estrategia, servicios a promocionar y clienta ideal.'
            : 'Generación genérica sin usar la información de tu salón.'}
        </p>
      </div>
    </button>
  )
}