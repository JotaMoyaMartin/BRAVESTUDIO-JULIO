import { ReactNode } from 'react'

/**
 * Cabecera única de sección (dirección visual 21-oct-2026):
 * título + para qué sirve, alineado a la izquierda; acciones a la derecha
 * en ordenador y debajo en el móvil. Sin Bravi ni etiquetas en mayúsculas.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: ReactNode
  /** Botones secundarios de la sección (p. ej. «Ir a Biblioteca»). */
  actions?: ReactNode
  /** Debajo del título: pasos del recorrido, filtros… */
  children?: ReactNode
}) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1>{title}</h1>
          {subtitle && <p className="text-[15px] leading-relaxed text-tinta-2 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 sm:flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
