'use client'
import Bravi from './Bravi'
import { BraviContext } from '@/lib/bravi-messages'

interface Props {
  section: string
  size?: number
  context?: Partial<BraviContext>
  className?: string
  /** Dirección visual (21-oct-2026): Bravi vive en Inicio y en las pantallas
   *  vacías, NO en las cabeceras (apretaba los títulos en el móvil). Las
   *  cabeceras existentes usan 'header' por defecto y no pintan nada. */
  placement?: 'header' | 'empty'
}

export default function BraviGuide({ section, size = 64, context, className, placement = 'header' }: Props) {
  if (placement === 'header') return null
  const ctx: BraviContext = {
    section,
    streak: 0,
    itemsToday: 0,
    hasScheduled: false,
    hour: new Date().getHours(),
    ...context,
  }
  return <Bravi size={size} context={ctx} showMessage className={className} />
}
