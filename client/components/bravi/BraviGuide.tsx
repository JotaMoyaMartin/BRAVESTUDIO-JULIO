'use client'
import Bravi from './Bravi'
import { BraviContext } from '@/lib/bravi-messages'

interface Props {
  section: string
  size?: number
  context?: Partial<BraviContext>
  className?: string
}

export default function BraviGuide({ section, size = 64, context, className }: Props) {
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