'use client'
import { SingleStory, StorySticker } from '@/lib/ai/prompts/stories'

const ROLE_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(160deg, #a8425a 0%, #8a2840 100%)',
  2: 'linear-gradient(160deg, #4a7a8a 0%, #3a6a7a 100%)',
  3: 'linear-gradient(160deg, #d4a830 0%, #b8860b 100%)',
}

const ROLE_EMOJIS: Record<number, string> = {
  1: '🔴',
  2: '🔵',
  3: '🟡',
}

// Deterministic position: poll/question usually at top or bottom, never middle.
// Story 1 → bottom (intrigue, interaction at end), Story 2 → top, Story 3 → bottom (CTA).
const STICKER_POSITION: Record<number, 'top' | 'bottom' | 'none'> = {
  1: 'bottom',
  2: 'top',
  3: 'bottom',
}

function StickerRender({ sticker, compact }: { sticker: StorySticker; compact?: boolean }) {
  const baseStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.22)',
    backdropFilter: 'blur(12px)',
    color: 'white',
    borderRadius: '10px',
  }
  const pad = compact ? 'px-2.5 py-1.5' : 'px-3 py-2'

  switch (sticker.type) {
    case 'poll':
      return (
        <div className={`${pad} flex flex-col items-center gap-1`} style={baseStyle}>
          <p className="text-[10px] font-semibold text-center leading-tight">{sticker.label}</p>
          <div className="flex gap-1">
            {(sticker.options || ['Sí', 'No']).map((opt, i) => (
              <span
                key={i}
                className="text-[9px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: i === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)' }}
              >
                {opt}
              </span>
            ))}
          </div>
        </div>
      )
    case 'question':
      return (
        <div className={`${pad} w-full max-w-[150px]`} style={baseStyle}>
          <p className="text-[10px] font-semibold mb-1 text-center leading-tight">{sticker.label}</p>
          <div
            className="text-[8px] px-2 py-1 rounded-md text-center"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)' }}
          >
            Escribe tu respuesta…
          </div>
        </div>
      )
    case 'emoji-slider':
      return (
        <div className={`${pad} flex items-center gap-2`} style={baseStyle}>
          <span className="text-sm">{sticker.emoji || '😍'}</span>
          <div className="flex-1 min-w-[50px]">
            <div className="h-0.5 rounded-full relative" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={{ left: '50%', background: 'white' }} />
            </div>
          </div>
        </div>
      )
    case 'mention':
    case 'hashtag':
    case 'location': {
      const prefix = sticker.type === 'mention' ? '@' : sticker.type === 'hashtag' ? '#' : '📍 '
      return (
        <div className={`${pad} rounded-full`} style={baseStyle}>
          <p className="text-[9px] font-semibold">{prefix}{sticker.label}</p>
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
  const emoji = ROLE_EMOJIS[story.number] || '🔴'
  const stickerPos = STICKER_POSITION[story.number] || 'none'
  const hasSticker = !!(story.sticker || story.stickerSuggestion)
  const showStickerTop = hasSticker && stickerPos === 'top'
  const showStickerBottom = hasSticker && stickerPos === 'bottom'

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone-style 9:16 mockup — simula una Story real de Instagram */}
      <div
        className="relative w-full max-w-[240px] sm:max-w-[260px] aspect-[9/16] rounded-[24px] overflow-hidden flex flex-col"
        style={{
          background: gradient,
          boxShadow: '0 8px 28px rgba(89,20,39,0.18)',
          border: '2px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Instagram-style progress bars (top) */}
        <div className="px-4 pt-4 pb-2 flex gap-1 flex-shrink-0">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className="h-0.5 flex-1 rounded-full"
              style={{
                background: n <= story.number ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>

        {/* Sticker top */}
        {showStickerTop && (
          <div className="px-5 pt-1 pb-2 flex justify-center flex-shrink-0">
            {story.sticker ? (
              <StickerRender sticker={story.sticker} compact />
            ) : (
              <div
                className="text-[9px] px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.18)', color: 'white', backdropFilter: 'blur(8px)' }}
              >
                🏷️ {story.stickerSuggestion}
              </div>
            )}
          </div>
        )}

        {/* Main text — centrado, legible, tamaño real de Story */}
        <div className="flex-1 px-5 flex flex-col items-center justify-center text-center overflow-hidden">
          <p
            className="text-[13px] sm:text-sm leading-snug font-medium"
            style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
          >
            {story.text}
          </p>
        </div>

        {/* Sticker bottom */}
        {showStickerBottom && (
          <div className="px-5 pt-2 pb-3 flex justify-center flex-shrink-0">
            {story.sticker ? (
              <StickerRender sticker={story.sticker} compact />
            ) : (
              <div
                className="text-[9px] px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.18)', color: 'white', backdropFilter: 'blur(8px)' }}
              >
                🏷️ {story.stickerSuggestion}
              </div>
            )}
          </div>
        )}

        {/* Instagram-style bottom gradient (sutil) */}
        <div
          className="h-12 flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.18) 100%)' }}
        />
      </div>

      {/* Role tag below mockup (no dentro del mockup) */}
      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#591427' }}>
        <span>{emoji}</span>
        <span>{story.role}</span>
      </div>

      {/* Action buttons below mockup */}
      {children && <div className="flex gap-2 items-center justify-center flex-wrap">{children}</div>}
    </div>
  )
}