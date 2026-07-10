'use client'
import { BraviPose } from '@/lib/bravi-messages'

interface Props {
  message: string
  size?: number
  pose?: BraviPose
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

/**
 * Bravi mascot + speech bubble en composición horizontal.
 * Un solo bloque de texto, mascota a la izquierda, bocadillo apuntando a la derecha.
 */
export default function BraviTip({ message, size = 48, pose = 'normal', className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ userSelect: 'none' }}>
      {/* Mascota */}
      <div
        className="bravi-appear rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: POSE_BG[pose],
        }}
      >
        <img
          src="/bravi2.png"
          alt="Bravi"
          className={POSE_ANIMATION[pose]}
          style={{
            width: size * 0.82,
            height: size * 0.82,
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(89,20,39,0.18))',
          }}
          draggable={false}
        />
      </div>

      {/* Bocadillo apuntando a Bravi (cola a la izquierda) */}
      <div className="bravi-appear relative flex-1 min-w-0">
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: -7,
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderRight: '9px solid var(--color-buttermilk)',
          }}
        />
        <div
          className="px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium leading-relaxed"
          style={{
            background: 'var(--color-buttermilk)',
            color: 'var(--color-cherry-dark)',
            border: '1.5px solid rgba(122,24,50,0.12)',
          }}
        >
          {message}
        </div>
      </div>
    </div>
  )
}