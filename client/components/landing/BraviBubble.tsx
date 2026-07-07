'use client'
import { BraviStatic } from '@/components/bravi/Bravi'

interface Props {
  size?: number
  message: string
  className?: string
  /** Position the bubble above (default) or below Bravi */
  bubblePosition?: 'top' | 'bottom'
}

/**
 * Reusable Bravi mascot with a stylized speech bubble.
 * Used in the landing hero and differentiation sections.
 */
export default function BraviBubble({
  size = 90,
  message,
  className = '',
  bubblePosition = 'top',
}: Props) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`} style={{ userSelect: 'none' }}>
      {bubblePosition === 'top' && <Bubble message={message} />}
      <BraviStatic size={size} />
      {bubblePosition === 'bottom' && <Bubble message={message} />}
    </div>
  )
}

function Bubble({ message }: { message: string }) {
  return (
    <div className="bravi-appear relative max-w-[220px]">
      {/* Pointer triangle */}
      <div
        style={{
          position: 'absolute',
          bottom: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '10px solid var(--color-buttermilk)',
        }}
      />
      <div
        className="px-3.5 py-2.5 rounded-[var(--radius-md)] text-xs font-medium text-center leading-relaxed"
        style={{
          background: 'var(--color-buttermilk)',
          color: 'var(--color-cherry-dark)',
          border: '1.5px solid rgba(122,24,50,0.12)',
        }}
      >
        {message}
      </div>
    </div>
  )
}