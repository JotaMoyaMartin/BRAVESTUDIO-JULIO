'use client'
import { useEffect, useState } from 'react'
import { pickMessage, DEFAULT_MESSAGE, BraviContext, BraviPose } from '@/lib/bravi-messages'

interface BraviProps {
  size?: number
  context?: BraviContext
  showMessage?: boolean
  className?: string
}

const POSE_ANIMATION: Record<BraviPose, string> = {
  normal: 'bravi-float',
  celebrating: 'bravi-celebrate',
  thinking: 'bravi-think',
}

const POSE_BG: Record<BraviPose, string> = {
  normal: 'rgba(255,241,181,0.6)',
  celebrating: 'rgba(255,233,145,0.7)',
  thinking: 'rgba(255,241,181,0.6)',
}

export default function Bravi({ size = 100, context, showMessage = false, className = '' }: BraviProps) {
  const [msg, setMsg] = useState(DEFAULT_MESSAGE)

  useEffect(() => {
    if (context) {
      setMsg(pickMessage(context))
    } else {
      // minimal context: just time of day
      setMsg(pickMessage({
        streak: 0,
        itemsToday: 0,
        hasScheduled: false,
        hour: new Date().getHours(),
      }))
    }
  }, [context])

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`} style={{ userSelect: 'none' }}>
      <div
        className="bravi-appear rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: POSE_BG[msg.pose],
        }}
      >
        <img
          src="/bravi2.png"
          alt="Bravi"
          className={POSE_ANIMATION[msg.pose]}
          style={{ width: size * 0.85, height: size * 0.85, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(89,20,39,0.18))' }}
          draggable={false}
        />
      </div>

      {showMessage && (
        <div className="bravi-appear relative max-w-[240px]">
          <div style={{
            position: 'absolute', top: -8, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '10px solid var(--color-buttermilk)',
          }} />
          <div
            className="px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium text-center leading-relaxed"
            style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.12)' }}
          >
            {msg.text}
          </div>
        </div>
      )}
    </div>
  )
}

// Also export a static version for SSR / non-context usage
export function BraviStatic({ size = 100, message, className = '' }: { size?: number; message?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`} style={{ userSelect: 'none' }}>
      <div
        className="bravi-appear rounded-full flex items-center justify-center bravi-float"
        style={{
          width: size,
          height: size,
          background: 'rgba(255,241,181,0.5)',
        }}
      >
        <img
          src="/bravi2.png"
          alt="Bravi"
          className="bravi-float"
          style={{ width: size * 0.85, height: size * 0.85, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(89,20,39,0.18))' }}
          draggable={false}
        />
      </div>
      {message && (
        <div className="bravi-appear relative max-w-[240px]">
          <div style={{
            position: 'absolute', top: -8, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '10px solid var(--color-buttermilk)',
          }} />
          <div
            className="px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium text-center leading-relaxed"
            style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.12)' }}
          >
            {message}
          </div>
        </div>
      )}
    </div>
  )
}