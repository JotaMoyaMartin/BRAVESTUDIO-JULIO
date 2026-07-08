'use client'
import { SingleStory, StorySticker } from '@/lib/ai/prompts/stories'

const ROLE_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(160deg, #7A1832 0%, #591427 100%)',
  2: 'linear-gradient(160deg, #2a5a6a 0%, #1a3a4a 100%)',
  3: 'linear-gradient(160deg, #b8860b 0%, #7a6000 100%)',
}

const ROLE_LABEL_COLORS: Record<number, string> = {
  1: '#FFF1B5',
  2: '#C1DBE8',
  3: '#FFF1B5',
}

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

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone-style 9:16 mockup — bigger and more legible */}
      <div
        className="relative w-full max-w-[240px] sm:max-w-[280px] aspect-[9/16] rounded-[28px] overflow-hidden flex flex-col"
        style={{
          background: gradient,
          boxShadow: '0 12px 40px rgba(89,20,39,0.3)',
          border: '2px solid rgba(255,255,255,0.15)',
        }}
      >
        {/* Top bar — story number + role */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            {story.number}
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', color: labelColor }}
          >
            {story.role}
          </span>
        </div>

        {/* Story progress bar (Instagram-style) */}
        <div className="px-4 pb-2 flex gap-1">
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

        {/* Main text — larger, scrollable if long */}
        <div className="flex-1 px-5 py-2 flex items-center overflow-y-auto">
          <p
            className="text-base sm:text-lg leading-relaxed font-medium text-center"
            style={{ color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
          >
            {story.text}
          </p>
        </div>

        {/* Sticker — structured or legacy */}
        {story.sticker ? (
          <div className="px-4 pb-3 flex justify-center">
            <StickerRender sticker={story.sticker} />
          </div>
        ) : story.stickerSuggestion ? (
          <div className="px-4 pb-3 flex justify-center">
            <div
              className="text-[10px] px-3 py-1.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)' }}
            >
              🏷️ {story.stickerSuggestion}
            </div>
          </div>
        ) : null}

        {/* Bottom — visual idea */}
        <div className="px-4 pb-3 pt-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <p className="text-[9px] leading-tight text-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
            📸 {story.visualIdea}
          </p>
        </div>
      </div>

      {/* Action buttons below mockup */}
      {children && <div className="flex gap-2 items-center justify-center">{children}</div>}
    </div>
  )
}