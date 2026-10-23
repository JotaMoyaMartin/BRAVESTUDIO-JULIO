'use client'
// Aviso honesto cuando la IA falla y la pantalla enseña una plantilla de
// ejemplo en su lugar (los generadores de lib/ai/prompts/* devuelven mock=true).
// Nunca presentamos una plantilla como si fuera un texto de la IA.
import { AlertCircle, RefreshCw } from 'lucide-react'

interface AIUnavailableNoticeProps {
  /** Vuelve a pedir el texto a la IA. Sin él no se muestra el botón. */
  onRetry?: () => void
  retrying?: boolean
  /** Modo demo (sin cuenta/IA): siempre son ejemplos, no tiene sentido reintentar. */
  demo?: boolean
  /** Si lo que se ve debajo es una plantilla de ejemplo (por defecto sí). */
  showsExample?: boolean
  className?: string
}

export default function AIUnavailableNotice({
  onRetry, retrying = false, demo = false, showsExample = true, className = '',
}: AIUnavailableNoticeProps) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${className}`}
      style={{ background: '#fff4e5', border: '1.5px solid #f1c27d', color: '#6b3d00' }}
    >
      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0 space-y-2">
        {demo ? (
          <p>
            <b>Modo demo.</b> Lo que ves es un <b>ejemplo</b>, no un texto escrito por la IA para ti.
          </p>
        ) : (
          <p>
            <b>La IA no está disponible ahora mismo.</b> Inténtalo en unos minutos.
            {showsExample && <> Mientras tanto te dejamos un <b>ejemplo</b> de plantilla, no un texto a tu medida.</>}
          </p>
        )}
        {!demo && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-opacity disabled:opacity-60"
            style={{ background: '#6b3d00', color: 'white', minHeight: 36 }}
          >
            <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} aria-hidden />
            {retrying ? 'Reintentando…' : 'Reintentar'}
          </button>
        )}
      </div>
    </div>
  )
}

/** Etiqueta pequeña para marcar una tarjeta/plantilla como ejemplo. */
export function ExampleBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{ background: '#fff4e5', color: '#6b3d00', border: '1px solid #f1c27d' }}
    >
      Ejemplo
    </span>
  )
}
