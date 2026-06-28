'use client'

interface BraviMascotProps {
  size?: number
  message?: string
  mood?: 'happy' | 'excited' | 'thinking' | 'waving'
  showMessage?: boolean
  className?: string
}

export default function BraviMascot({
  size = 100,
  message,
  showMessage = false,
  className = '',
}: BraviMascotProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`} style={{ userSelect: 'none' }}>
      <div
        className="bravi-float bravi-appear"
        style={{ fontSize: size * 0.8, lineHeight: 1 }}
      >
        🤖
      </div>

      {/* Speech bubble */}
      {showMessage && message && (
        <div className="bravi-appear relative max-w-[220px]">
          <div style={{
            position: 'absolute', top: -8, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '10px solid #FFF1B5',
          }} />
          <div
            className="px-4 py-3 rounded-2xl text-sm font-medium text-center leading-relaxed"
            style={{ background: '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.12)' }}
          >
            {message}
          </div>
        </div>
      )}
    </div>
  )
}
