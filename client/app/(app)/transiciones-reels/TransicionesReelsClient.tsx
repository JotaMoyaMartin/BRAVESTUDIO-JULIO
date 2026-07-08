'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wand2, ExternalLink, ArrowRight } from 'lucide-react'
import { ReelTransition } from '@/types/database'

interface Props {
  transitions: ReelTransition[]
}

export default function TransicionesReelsClient({ transitions }: Props) {
  const [selected, setSelected] = useState<ReelTransition | null>(null)

  if (transitions.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <div className="text-center py-16 rounded-[var(--radius-md)] bg-white" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
          <Wand2 size={32} className="mx-auto mb-3 text-cherry opacity-50" />
          <p className="text-sm text-cherry-dark opacity-70">Aún no hay transiciones disponibles. Vuelve pronto</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {transitions.map((item) => (
          <div
            key={item.id}
            className="rounded-[var(--radius-md)] overflow-hidden bg-white flex flex-col"
            style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
          >
            <div className="relative aspect-[9/16] overflow-hidden bg-cream">
              <img
                src={item.cover_image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 md:p-4 flex flex-col gap-2 flex-1">
              <p className="font-semibold text-sm text-cherry-dark" style={{ lineHeight: 1.35 }}>{item.title}</p>
              <p className="text-xs text-ink opacity-70" style={{ lineHeight: 1.4 }}>{item.short_description}</p>
              <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                <button
                  onClick={() => setSelected(item)}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold btn-secondary"
                >
                  Ver idea
                </button>
                {item.instagram_url && (
                  <a
                    href={item.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold btn-ghost"
                    title="Ver en Instagram"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Panel lateral / modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-full md:max-w-md bg-cream overflow-y-auto md:rounded-l-[var(--radius-lg)] rounded-t-[var(--radius-lg)]"
              style={{ boxShadow: 'var(--shadow-strong)' }}
            >
              <PanelContent
                item={selected}
                onClose={() => setSelected(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionHeader() {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">
        Transiciones para tus Reels
      </h1>
      <p className="mt-2 text-sm text-ink opacity-75">
        Ideas de transiciones para crear contenido que enganche.
      </p>
    </div>
  )
}

function PanelContent({ item, onClose }: {
  item: ReelTransition
  onClose: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="relative aspect-[9/16] overflow-hidden bg-cream">
        <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 shadow-medium"
          aria-label="Cerrar"
        >
          <X size={18} className="text-cherry-dark" />
        </button>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-cherry-dark" style={{ lineHeight: 1.3 }}>{item.title}</h2>
          <p className="mt-2 text-sm text-ink opacity-80">{item.description}</p>
        </div>

        {item.idea_text && (
          <DetailBlock label="Idea" text={item.idea_text} color="cherry" />
        )}
        {item.why_text && (
          <DetailBlock label="Por qué funciona" text={item.why_text} color="blue" />
        )}
        {item.how_text && (
          <DetailBlock label="Cómo adaptarlo" text={item.how_text} color="green" />
        )}

        <div className="flex flex-col gap-2 pt-2">
          {item.instagram_url && (
            <a
              href={item.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full justify-center py-3"
            >
              <ExternalLink size={16} /> Ver Reel en Instagram
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailBlock({ label, text, color }: { label: string; text: string; color: 'cherry' | 'blue' | 'green' }) {
  const bg = color === 'cherry' ? 'rgba(122,24,50,0.06)' : color === 'blue' ? 'var(--color-pastel-blue)' : 'var(--color-pastel-green)'
  const fg = color === 'cherry' ? 'var(--color-cherry-dark)' : color === 'blue' ? '#1a3a4a' : '#1a3a2a'
  const labelColor = color === 'cherry' ? 'var(--color-cherry)' : color === 'blue' ? '#2a5a6a' : '#2a5a3a'
  return (
    <div className="rounded-[var(--radius-sm)] p-4" style={{ background: bg }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: labelColor, opacity: 0.85 }}>{label}</p>
      <p className="text-sm" style={{ color: fg, lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}