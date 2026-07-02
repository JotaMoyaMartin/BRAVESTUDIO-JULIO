'use client'
import { SingleStory } from '@/lib/ai/prompts/stories'

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
      {/* Phone-style 9:16 mockup */}
      <div
        className="relative w-full max-w-[200px] aspect-[9/16] rounded-[24px] overflow-hidden flex flex-col"
        style={{
          background: gradient,
          boxShadow: '0 8px 32px rgba(89,20,39,0.25)',
          border: '2px solid rgba(255,255,255,0.15)',
        }}
      >
        {/* Top bar — story number + role */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            {story.number}
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', color: labelColor }}
          >
            {story.role}
          </span>
        </div>

        {/* Story progress bar (Instagram-style) */}
        <div className="px-3 pb-2 flex gap-1">
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

        {/* Main text */}
        <div className="flex-1 px-4 py-2 flex items-center">
          <p
            className="text-sm leading-relaxed font-medium text-center"
            style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
          >
            {story.text}
          </p>
        </div>

        {/* Sticker suggestion */}
        {story.stickerSuggestion && (
          <div className="px-4 pb-3 flex justify-center">
            <div
              className="text-[10px] px-3 py-1.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)' }}
            >
              🏷️ {story.stickerSuggestion}
            </div>
          </div>
        )}

        {/* Bottom — visual idea */}
        <div className="px-3 pb-3 pt-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
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