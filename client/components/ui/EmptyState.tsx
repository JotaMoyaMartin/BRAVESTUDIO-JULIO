import { ReactNode } from 'react'
import BraviGuide from '@/components/bravi/BraviGuide'

/**
 * Pantalla vacía (dirección visual 21-oct-2026): dice qué aparecerá aquí y
 * ofrece UNA acción, la siguiente que tiene sentido. Bravi acompaña solo aquí.
 */
export default function EmptyState({
  section,
  title,
  text,
  action,
}: {
  /** Sección para el mensaje de Bravi. */
  section: string
  title: string
  text?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-rosa/60 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-shrink-0 max-w-[220px]">
        <BraviGuide section={section} size={56} placement="empty" />
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-base font-semibold text-burdeos">{title}</p>
        {text && <p className="text-[15px] leading-relaxed text-tinta-2">{text}</p>}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  )
}
