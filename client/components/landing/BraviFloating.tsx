'use client'
import BraviBubble from './BraviBubble'

interface Props {
  message: string
  size?: number
  className?: string
  /** Where to anchor — pass absolute positioning via className */
  position?: string
}

/**
 * Lightweight floating Bravi with a speech bubble.
 * Place instances throughout the landing to give the feeling
 * that Bravi is present during the whole visit.
 */
export default function BraviFloating({ message, size = 70, className = '', position = '' }: Props) {
  return (
    <div className={`absolute z-30 pointer-events-none hidden lg:block ${position} ${className}`}>
      <BraviBubble size={size} message={message} />
    </div>
  )
}