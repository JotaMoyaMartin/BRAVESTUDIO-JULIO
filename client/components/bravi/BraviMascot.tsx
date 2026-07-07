'use client'
// Compatibility shim — new code should use components/bravi/Bravi instead
import Bravi, { BraviStatic } from './Bravi'
import { BraviContext } from '@/lib/bravi-messages'

interface BraviMascotProps {
  size?: number
  message?: string
  mood?: 'happy' | 'excited' | 'thinking' | 'waving' // deprecated, ignored
  showMessage?: boolean
  context?: BraviContext
  className?: string
}

export default function BraviMascot({
  size = 100,
  message,
  showMessage = false,
  context,
  className = '',
}: BraviMascotProps) {
  // If a static message is provided, use the static variant (no context logic)
  if (message && !context) {
    return <BraviStatic size={size} message={showMessage ? message : undefined} className={className} />
  }
  return <Bravi size={size} context={context} showMessage={showMessage} className={className} />
}