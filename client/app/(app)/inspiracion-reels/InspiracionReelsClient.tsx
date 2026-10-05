'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Star, ExternalLink, ArrowRight, Check, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { ReelInspiration, ReelTransition } from '@/types/database'
import { reelCategory, categoryLabel, INSPIRACION_CATEGORY_ORDER, TRANSICION_CATEGORY_ORDER } from '@/lib/reel-categories'
import { isNovedad } from '@/lib/reel-novedades'
import BraviGuide from '@/components/bravi/BraviGuide'

// Ficha común para inspiraciones y transiciones (mismo esquema de datos).
type RefItem = Pick<ReelInspiration, 'id' | 'title' | 'short_description' | 'description' | 'cover_image' | 'instagram_url' | 'idea_text' | 'why_text' | 'how_text'>

interface Props {
  userId: string
  inspirations: (ReelInspiration | ReelTransition)[]
  transitions: (ReelInspiration | ReelTransition)[]
  savedIds: string[]
  savedTransitionIds: string[]
  initialCat?: 'inspiracion' | 'transiciones'
}

type Cat = 'inspiracion' | 'transiciones'

export default function InspiracionReelsClient({
  userId,
  inspirations,
  transitions,
  savedIds: initialSavedIds,
  savedTransitionIds: initialSavedTransitionIds,
  initialCat = 'inspiracion',
}: Props) {
  const toast = useToast()
  const [cat, setCat] = useState<Cat>(initialCat)
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds)
  const [savedTransitionIds, setSavedTransitionIds] = useState<string[]>(initialSavedTransitionIds)
  const [selected, setSelected] = useState<RefItem | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)

  /** Cambio de pestaña: resetea también el filtro de categoría. */
  function selectCat(c: Cat) {
    setCat(c)
    setFilter(null)
  }

  const itemsRaw = cat === 'inspiracion' ? inspirations : transitions
  const savedForCat = cat === 'inspiracion' ? savedIds : savedTransitionIds
  const novedades = itemsRaw.filter(isNovedad)

  // Chips de categoría (curación en lib/reel-categories.ts): solo las que tienen reels.
  const order = cat === 'inspiracion' ? INSPIRACION_CATEGORY_ORDER : TRANSICION_CATEGORY_ORDER
  const counts = new Map<string, number>()
  for (const it of itemsRaw) {
    const c = reelCategory(it)
    counts.set(c, (counts.get(c) || 0) + 1)
  }
  const chips = order.filter(c => (counts.get(c) || 0) > 0)
  const items = !filter ? itemsRaw : itemsRaw.filter(it => reelCategory(it) === filter)

  async function toggleSaved(category: Cat, item: RefItem) {
    if (toggling) return
    if (userId === 'demo') {
      toast.show('El guardado se activa con tu cuenta real — en demo solo se ve', 'info')
      return
    }
    setToggling(item.id)
    const supabase = createClient()
    if (category === 'inspiracion') {
      const isSaved = savedIds.includes(item.id)
      if (isSaved) {
        const { error } = await supabase.from('saved_inspirations').delete().eq('user_id', userId).eq('inspiration_id', item.id)
        if (!error) {
          setSavedIds(prev => prev.filter(x => x !== item.id))
          toast.show('Eliminada de tu biblioteca', 'info')
        }
      } else {
        const { error } = await supabase.from('saved_inspirations').insert({ user_id: userId, inspiration_id: item.id })
        if (!error) {
          setSavedIds(prev => [...prev, item.id])
          toast.show('Guardada en tu biblioteca')
        }
      }
    } else {
      const isSaved = savedTransitionIds.includes(item.id)
      if (isSaved) {
        const { error } = await supabase.from('saved_transitions').delete().eq('user_id', userId).eq('transition_id', item.id)
        if (!error) {
          setSavedTransitionIds(prev => prev.filter(x => x !== item.id))
          toast.show('Eliminada de tu biblioteca', 'info')
        }
      } else {
        const { error } = await supabase.from('saved_transitions').insert({ user_id: userId, transition_id: item.id })
        if (!error) {
          setSavedTransitionIds(prev => [...prev, item.id])
          toast.show('Guardada en tu biblioteca')
        }
      }
    }
    setToggling(null)
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <CatTabs cat={cat} setCat={selectCat} nInsp={inspirations.length} nTrans={transitions.length} />
        <div className="text-center py-16 rounded-[var(--radius-md)] bg-white" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
          <Sparkles size={32} className="mx-auto mb-3 text-cherry opacity-50" />
          <p className="text-sm text-cherry-dark opacity-70">
            {cat === 'inspiracion' ? 'Aún no hay inspiraciones disponibles. Vuelve pronto ✨' : 'Aún no hay transiciones disponibles. Vuelve pronto ✨'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader />

      {novedades.length > 0 && <NovedadesStrip items={novedades} onOpen={setSelected} />}

      <CatTabs cat={cat} setCat={selectCat} nInsp={inspirations.length} nTrans={transitions.length} />

      <CatFilter chips={chips} counts={counts} filter={filter} setFilter={setFilter} />

      {/* Consejo de audio */}
      <div
        className="rounded-[var(--radius-md)] p-4 flex items-start gap-3"
        style={{ background: 'rgba(193,219,232,0.25)', border: '1.5px solid rgba(74,122,138,0.2)' }}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base" style={{ background: 'var(--color-pastel-blue)' }}>
          🎵
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-cherry-dark mb-0.5">Consejo Bravi</p>
          <p className="text-sm text-cherry-dark opacity-80 leading-relaxed">
            El audio es tan importante como la imagen. <strong>Compagina los golpes de música con los cortes de tu reel</strong> para que todo fluya al ritmo correcto.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {items.map(item => {
          const isSaved = savedForCat.includes(item.id)
          const playsInApp = !!item.instagram_url
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
                <span
                  className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(0,0,0,0.45)', color: 'white', backdropFilter: 'blur(4px)' }}
                >
                  {categoryLabel(reelCategory(item))}
                </span>
                {playsInApp && (
                  <span
                    className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"
                    style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}
                  >
                    <Play size={9} fill="currentColor" /> Se ve aquí
                  </span>
                )}
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
                    onClick={(e) => { e.stopPropagation(); toggleSaved(cat, item) }}
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
                      title="Ver en Instagram (plan B si el embed pide login)"
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

      {/* Panel lateral / modal — ahora con visor in-app */}
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
                isSaved={savedForCat.includes(selected.id)}
                cat={cat}
                onToggleSaved={() => toggleSaved(cat, selected)}
                onClose={() => setSelected(null)}
                userInDemo={userId === 'demo'}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Novedades de la semana: los reels destacados (lib/reel-novedades.ts) en
 *  una tira deslizable arriba del todo — siempre visibles, en ambas pestañas. */
function NovedadesStrip({ items, onOpen }: { items: RefItem[]; onOpen: (it: RefItem) => void }) {
  return (
    <section className="rounded-[var(--radius-md)] p-4" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.14)' }}>
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-base font-bold text-cherry-dark">Novedades de la semana 🔥</h2>
        <p className="text-[11px] text-ink opacity-60">renovamos cada semana</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onOpen(item)}
            className="relative flex-shrink-0 w-[150px] text-left group"
            aria-label={item.title}
          >
            <div className="relative aspect-[9/16] rounded-[var(--radius-sm)] overflow-hidden bg-cream">
              <img
                src={item.cover_image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <span
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide"
                style={{ background: 'var(--color-cherry)', color: 'white' }}
              >
                Nuevo
              </span>
              <span
                className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}
              >
                {categoryLabel(reelCategory(item))}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-cherry-dark leading-tight px-0.5" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.title}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}

function CatFilter({ chips, counts, filter, setFilter }: {
  chips: string[]
  counts: Map<string, number>
  filter: string | null
  setFilter: (f: string | null) => void
}) {
  if (chips.length === 0) return null
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter(null)}
        className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5"
        style={
          !filter
            ? { background: 'var(--color-cherry-dark)', color: 'white' }
            : { background: 'white', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.15)' }
        }
      >
        Todos
        <span
          className="px-1.5 rounded-full text-[10px]"
          style={!filter ? { background: 'rgba(255,255,255,0.25)' } : { background: 'var(--color-buttermilk)' }}
        >
          {total}
        </span>
      </button>
      {chips.map(c => (
        <button
          key={c}
          onClick={() => setFilter(filter === c ? null : c)}
          className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5"
          style={
            filter === c
              ? { background: 'var(--color-cherry)', color: 'white', boxShadow: 'var(--shadow-soft)' }
              : { background: 'white', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.15)' }
          }
        >
          {categoryLabel(c)}
          <span
            className="px-1.5 rounded-full text-[10px]"
            style={filter === c ? { background: 'rgba(255,255,255,0.25)' } : { background: 'var(--color-buttermilk)' }}
          >
            {counts.get(c)}
          </span>
        </button>
      ))}
    </div>
  )
}

function CatTabs({ cat, setCat, nInsp, nTrans }: { cat: Cat; setCat: (c: Cat) => void; nInsp: number; nTrans: number }) {
  const tabs: { id: Cat; label: string; n: number }[] = [
    { id: 'inspiracion', label: 'Inspiración', n: nInsp },
    { id: 'transiciones', label: 'Transiciones', n: nTrans },
  ]
  return (
    <div className="flex gap-2.5">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setCat(t.id)}
          className="px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2"
          style={
            cat === t.id
              ? { background: 'var(--color-cherry)', color: 'white', boxShadow: 'var(--shadow-soft)' }
              : { background: 'white', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.15)' }
          }
        >
          {t.label}
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px]"
            style={cat === t.id ? { background: 'rgba(255,255,255,0.25)' } : { background: 'var(--color-buttermilk)' }}
          >
            {t.n}
          </span>
        </button>
      ))}
    </div>
  )
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-4">
      <BraviGuide section="inspiracion-reels" size={72} />
      <div className="flex-1">
        <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">
          Encuentra inspiración para tu próximo Reel ✨
        </h1>
        <p className="mt-2 text-sm text-ink opacity-75">
          Pulsa cualquier tarjeta para verla aquí mismo. Guarda tus favoritas con la estrella.
        </p>
      </div>
    </div>
  )
}

function PanelContent({ item, isSaved, cat, onToggleSaved, onClose, userInDemo }: {
  item: RefItem
  isSaved: boolean
  cat: Cat
  onToggleSaved: () => void
  onClose: () => void
  userInDemo: boolean
}) {
  const igEmbed = item.instagram_url
    ? (item.instagram_url.match(/instagram\.com\/(?:[A-Za-z0-9_.]*\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/) as [string, string, string] | null)
    : null
  const embedSrc = igEmbed ? `https://www.instagram.com/${igEmbed[1] === 'p' ? 'p' : 'reel'}/${igEmbed[2]}/embed` : null

  return (
    <div className="flex flex-col h-full">
      {/* Visor: el reel se reproduce dentro de la app (embed oficial de IG) */}
      {igEmbed && embedSrc ? (
        <div className="relative bg-cream pt-4 px-4 pb-2">
          <div
            className="rounded-[var(--radius-md)] overflow-hidden mx-auto bg-white relative"
            style={{ aspectRatio: '9 / 16.6', maxWidth: 420, border: '1.5px solid rgba(122,24,50,0.12)' }}
          >
            <iframe
              key={igEmbed[1]}
              src={embedSrc}
              title={item.title}
              frameBorder={0}
              scrolling="no"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 shadow-medium z-10"
            aria-label="Cerrar"
          >
            <X size={18} className="text-cherry-dark" />
          </button>
        </div>
      ) : (
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
      )}

      <div className="p-5 md:p-6 space-y-5">
        <div>
          <span
            className="inline-block mb-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(122,24,50,0.08)', color: 'var(--color-cherry)' }}
          >
            {categoryLabel(reelCategory(item))}
          </span>
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
            onClick={() => (userInDemo ? undefined : onToggleSaved())}
            className="btn-secondary w-full justify-center py-3"
            title={userInDemo ? 'Se activa con tu cuenta real' : undefined}
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