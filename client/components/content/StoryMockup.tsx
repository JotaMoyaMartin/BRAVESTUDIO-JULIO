'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SingleStory, StorySticker } from '@/lib/ai/prompts/stories'

const ROLE_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(160deg, #a8425a 0%, #8a2840 100%)',
  2: 'linear-gradient(160deg, #4a7a8a 0%, #3a6a7a 100%)',
  3: 'linear-gradient(160deg, #d4a830 0%, #b8860b 100%)',
}

const ROLE_LABEL_COLORS: Record<number, string> = {
  1: '#FFF1B5',
  2: '#C1DBE8',
  3: '#FFF1B5',
}

const ROLE_EMOJIS: Record<number, string> = {
  1: '🔴',
  2: '🔵',
  3: '🟡',
}

const TEXT_TRUNCATE_LIMIT = 120

function StickerRender({ sticker }: { sticker: StorySticker }) {
  const baseStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(12px)',
    color: 'white',
    borderRadius: '12px',
  }

  switch (sticker.type) {
    case 'poll':
      return (
        <div className="px-3 py-2 flex flex-col items-center gap-1.5" style={baseStyle}>
          <p className="text-[11px] font-semibold text-center">{sticker.label}</p>
          <div className="flex gap-1.5">
            {(sticker.options || ['Sí', 'No']).map((opt, i) => (
              <span
                key={i}
                className="text-[10px] font-bold px-3 py-1 rounded-full"
                style={{ background: i === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)' }}
              >
                {opt}
              </span>
            ))}
          </div>
        </div>
      )
    case 'question':
      return (
        <div className="px-3 py-2 w-full max-w-[160px]" style={baseStyle}>
          <p className="text-[11px] font-semibold mb-1 text-center">{sticker.label}</p>
          <div
            className="text-[9px] px-2 py-1.5 rounded-lg text-center"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            Escribe tu respuesta…
          </div>
        </div>
      )
    case 'emoji-slider':
      return (
        <div className="px-3 py-2 flex items-center gap-2" style={baseStyle}>
          <span className="text-base">{sticker.emoji || '😍'}</span>
          <div className="flex-1 min-w-[60px]">
            <div
              className="h-1 rounded-full relative"
              style={{ background: 'rgba(255,255,255,0.3)' }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{ left: '50%', background: 'white' }}
              />
            </div>
          </div>
          <span className="text-[9px]">{sticker.label}</span>
        </div>
      )
    case 'mention':
    case 'hashtag':
    case 'location': {
      const prefix = sticker.type === 'mention' ? '@' : sticker.type === 'hashtag' ? '#' : '📍 '
      return (
        <div className="px-3 py-1.5 rounded-full" style={baseStyle}>
          <p className="text-[10px] font-semibold">{prefix}{sticker.label}</p>
        </div>
      )
    }
    default:
      return null
  }
}

interface Props {
  story: SingleStory
  index: number
  children?: React.ReactNode
}

export default function StoryMockup({ story, index, children }: Props) {
  const gradient = ROLE_GRADIENTS[story.number] || ROLE_GRADIENTS[1]
  const labelColor = ROLE_LABEL_COLORS[story.number] || ROLE_LABEL_COLORS[1]
  const emoji = ROLE_EMOJIS[story.number] || '🔴'
  const [expanded, setExpanded] = useState(false)
  const isLong = story.text.length > TEXT_TRUNCATE_LIMIT
  const displayText = !expanded && isLong
    ? story.text.slice(0, TEXT_TRUNCATE_LIMIT).trimEnd() + '…'
    : story.text

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone-style 9:16 mockup — suavizado y espacioso */}
      <div
        className="relative w-full max-w-[260px] sm:max-w-[300px] aspect-[9/16] rounded-[28px] overflow-hidden flex flex-col"
        style={{
          background: gradient,
          boxShadow: '0 8px 28px rgba(89,20,39,0.18)',
          border: '2px solid rgba(255,255,255,0.15)',
        }}
      >
        {/* Top bar — story number + role */}
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            {story.number}
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', color: labelColor }}
          >
            {emoji} {story.role}
          </span>
        </div>

        {/* Story progress bar (Instagram-style) */}
        <div className="px-5 pb-2 flex gap-1">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className="h-0.5 flex-1 rounded-full"
              style={{
                background: n <= story.number ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        {/* Main text — grande, legible, con expand/collapse */}
        <div className="flex-1 px-6 py-3 flex flex-col items-center justify-center overflow-y-auto">
          <p
            className="text-lg sm:text-xl leading-[1.7] tracking-wide font-medium text-center"
            style={{ color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
          >
            {displayText}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold transition-all"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              {expanded ? <><ChevronUp size={13} /> Ver menos</> : <><ChevronDown size={13} /> Ver más</>}
            </button>
          )}
        </div>

        {/* Sticker — structured or legacy */}
        {story.sticker ? (
          <div className="px-5 pb-3 flex justify-center">
            <StickerRender sticker={story.sticker} />
          </div>
        ) : story.stickerSuggestion ? (
          <div className="px-5 pb-3 flex justify-center">
            <div
              className="text-[10px] px-3 py-1.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)' }}
            >
              🏷️ {story.stickerSuggestion}
            </div>
          </div>
        ) : null}

        {/* Bottom — visual idea */}
        <div className="px-5 pb-4 pt-2" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <p className="text-[10px] leading-relaxed text-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
            📸 {story.visualIdea}
          </p>
        </div>
      </div>

      {/* Action buttons below mockup */}
      {children && <div className="flex gap-2 items-center justify-center flex-wrap">{children}</div>}
    </div>
  )
}