'use client'
import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'

type Mood = 'motivate' | 'tip' | 'info' | 'warn' | 'celebrate'

const MOOD_CFG: Record<Mood, { bg: string; bubble: string; accent: string; face: string }> = {
  motivate:  { bg: '#7A1832', bubble: '#FFF1B5', accent: '#7A1832', face: '😎' },
  tip:       { bg: '#A04060', bubble: '#C1DBE8', accent: '#591427', face: '💡' },
  info:      { bg: '#591427', bubble: '#C1DBE8', accent: '#591427', face: '🙂' },
  warn:      { bg: '#A04060', bubble: '#FFF1B5', accent: '#7A1832', face: '🤔' },
  celebrate: { bg: '#2a8a4a', bubble: '#B8D8B0', accent: '#2a8a4a', face: '🎉' },
}

interface Props {
  messages: { text: string; mood?: Mood }[]
  /** Position: 'inline' shows a card; 'float' pins to bottom-right of viewport */
  variant?: 'inline' | 'float'
  /** Auto-rotate messages every N ms (only if multiple). 0 = no rotation. Default 8000 */
  rotateMs?: number
  className?: string
}

export default function BraviMascot({ messages, variant = 'inline', rotateMs = 8000, className = '' }: Props) {
  const [idx, setIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (messages.length <= 1 || rotateMs === 0 || dismissed) return
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), rotateMs)
    return () => clearInterval(t)
  }, [messages.length, rotateMs, dismissed])

  if (dismissed || messages.length === 0) return null

  const msg = messages[idx]
  const mood = msg.mood || 'info'
  const cfg = MOOD_CFG[mood]

  const body = (
    <div className={`flex items-start gap-3 ${variant === 'float' ? 'max-w-[320px]' : ''}`}>
      {/* Mascot avatar */}
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md relative"
        style={{ background: cfg.bg }}
        aria-label="BRAVI"
        title="BRAVI"
      >
        <span className="text-white font-bold text-[15px] leading-none">B</span>
        <span className="absolute -top-1 -right-1 text-[14px] leading-none">{cfg.face}</span>
      </div>

      {/* Speech bubble */}
      <div
        className="relative flex-1 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[12.5px] leading-snug shadow-sm"
        style={{ background: cfg.bubble, color: cfg.accent }}
      >
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold mb-0.5 opacity-70">
          <Sparkles size={10} /> BRAVI
        </div>
        <div className="text-[#1a1a1a]">{msg.text}</div>
        {messages.length > 1 && (
          <div className="flex gap-1 mt-2">
            {messages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i) }}
                className={`h-1 rounded-full transition-all ${i === idx ? 'w-4' : 'w-1.5 opacity-50'}`}
                style={{ background: cfg.accent }}
                aria-label={`Mensaje ${i + 1}`}
              />
            ))}
          </div>
        )}
        {variant === 'float' && (
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center text-[#8a8680] hover:text-[#1a1a1a]"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  )

  if (variant === 'float') {
    return (
      <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
        {body}
      </div>
    )
  }

  return <div className={className}>{body}</div>
}