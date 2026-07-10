'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wand2, ExternalLink, ArrowRight, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { ReelTransition } from '@/types/database'
import BraviMascot from '@/components/bravi/BraviMascot'

interface Props {
  userId: string
  transitions: ReelTransition[]
  savedIds: string[]
}

export default function TransicionesReelsClient({ userId, transitions, savedIds: initialSavedIds }: Props) {
  const toast = useToast()
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds)
  const [selected, setSelected] = useState<ReelTransition | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggleSaved(id: string) {
    if (toggling) return
    setToggling(id)
    const supabase = createClient()
    const isSaved = savedIds.includes(id)
    if (isSaved) {
      const { error } = await supabase.from('saved_transitions').delete().eq('user_id', userId).eq('transition_id', id)
      if (!error) {
        setSavedIds(prev => prev.filter(x => x !== id))
        toast.show('Eliminada de tu biblioteca', 'info')
      }
    } else {
      const { error } = await supabase.from('saved_transitions').insert({ user_id: userId, transition_id: id })
      if (!error) {
        setSavedIds(prev => [...prev, id])
        toast.show('Guardada en tu biblioteca')
      }
    }
    setToggling(null)
  }

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
        {transitions.map((item) => {
          const isSaved = savedIds.includes(item.id)
          return (
            <div
              key={item.id}
              className="idea-card rounded-[var(--radius-md)] overflow-hidden bg-white flex flex-col"
              style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
              onClick={() => setSelected(item)}
            >
              <div className="relative aspect-[9/16] overflow-hidden bg-cream">
                <img
                  src={item.cover_image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {isSaved && (
                  <span
                    className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                    style={{ background: 'var(--color-pastel-green)', color: 'var(--color-cherry-dark)' }}
                  >
                    <Star size={10} fill="currentColor" /> Guardada
                  </span>
                )}
              </div>
              <div className="p-3 md:p-4 flex flex-col gap-2 flex-1">
                <p className="font-semibold text-sm text-cherry-dark" style={{ lineHeight: 1.35 }}>{item.title}</p>
                <p className="text-xs text-ink opacity-70" style={{ lineHeight: 1.4 }}>{item.short_description}</p>
                <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSaved(item.id) }}
                    disabled={toggling === item.id}
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: isSaved ? 'rgba(255, 200, 0, 0.18)' : 'var(--color-buttermilk)',
                      color: 'var(--color-cherry-dark)',
                      opacity: toggling === item.id ? 0.5 : 1,
                      border: '1.5px solid rgba(122,24,50,0.15)',
                    }}
                    title={isSaved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  >
                    {isSaved ? <Star size={13} fill="currentColor" style={{ color: '#e8a800' }} /> : <Star size={13} />}
                    {isSaved ? 'Guardada' : 'Guardar'}
                  </button>
                  {item.instagram_url && (
                    <a
                      href={item.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold btn-ghost"
                      title="Ver en Instagram"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
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
                isSaved={savedIds.includes(selected.id)}
                onToggleSaved={() => toggleSaved(selected.id)}
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
    <div className="flex items-center gap-4">
      <BraviMascot size={72} message="¡Estas transiciones harán que tus reels enganchen! Guarda las que quieras probar ⭐" showMessage />
      <div className="flex-1">
        <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">
          Transiciones para tus Reels
        </h1>
        <p className="mt-2 text-sm text-ink opacity-75">
          Pulsa cualquier tarjeta para ver la idea completa. Guarda tus favoritas con la estrella.
        </p>
      </div>
    </div>
  )
}

function PanelContent({ item, isSaved, onToggleSaved, onClose }: {
  item: ReelTransition
  isSaved: boolean
  onToggleSaved: () => void
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
          <button
            onClick={onToggleSaved}
            className="btn-secondary w-full justify-center py-3"
          >
            {isSaved ? <Star size={16} fill="currentColor" style={{ color: '#e8a800' }} /> : <Star size={16} />}
            {isSaved ? 'Guardada en favoritos' : 'Guardar en favoritos'}
          </button>
          {item.instagram_url && (
            <a
              href={item.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full justify-center py-3"
            >
              <ExternalLink size={16} /> Ver Reel en Instagram
            </a>
          )}
          <Link href="/biblioteca" className="text-xs text-center text-cherry opacity-60 hover:opacity-100 mt-1 flex items-center justify-center gap-1">
            Ver mi biblioteca <ArrowRight size={12} />
          </Link>
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