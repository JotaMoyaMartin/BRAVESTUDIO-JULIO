'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AskTeamButton from '@/components/equipo/AskTeamButton'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Star, ExternalLink, Play, LayoutGrid, GalleryVertical, Film, Lightbulb, Camera, Sparkles, ChevronUp,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { ReelInspiration, ReelTransition } from '@/types/database'
import {
  reelCategory, categoryLabel, INSPIRACION_CATEGORY_ORDER, TRANSICION_CATEGORY_ORDER, ReelCategory,
} from '@/lib/reel-categories'
import { isNovedad } from '@/lib/reel-novedades'
import { reelCoverUrl } from '@/lib/reel-cover'

// REELS VIRALES (21-oct-2026) — antes «Inspiración de Reels» + «Transiciones».
// Una sola galería con filtros; al tocar un reel se abre el modo «uno a uno»
// (desliza hacia arriba como en TikTok). Los reels de Instagram se ven DENTRO
// de la app con el reproductor oficial de IG; cada uno trae «Hazlo tuyo».

type Kind = 'inspiracion' | 'transicion'
type Row = Pick<ReelInspiration, 'id' | 'title' | 'short_description' | 'description' | 'cover_image' | 'instagram_url' | 'idea_text' | 'why_text' | 'how_text'>
interface Reel extends Row { kind: Kind; cat: ReelCategory; nuevo: boolean }

interface Props {
  userId: string
  inspirations: (ReelInspiration | ReelTransition)[]
  transitions: (ReelInspiration | ReelTransition)[]
  savedIds: string[]
  savedTransitionIds: string[]
  initialCat?: 'inspiracion' | 'transiciones'
  initialReelId?: string | null
}

const TRANSITION_CATS = new Set<ReelCategory>(TRANSICION_CATEGORY_ORDER)

/** Los reels de transición no son hablados: no tiene sentido ofrecer guion. */
function isSpoken(r: Reel) {
  if (r.kind !== 'inspiracion' || TRANSITION_CATS.has(r.cat) || r.cat === 'clip') return false
  // Reels de resultado sin voz («nada de hablar», «sin hablar»…): tampoco.
  const txt = `${r.idea_text || ''} ${r.how_text || ''} ${r.description || ''}`.toLowerCase()
  return !/(nada de hablar|sin hablar|no hace falta hablar|sin voz|no habla)/.test(txt)
}

/** Indicaciones prácticas de grabación según el tipo de reel. */
function recordingTips(r: Reel): string[] {
  if (r.cat === 'gesto') return [
    'Móvil fijo (trípode o apoyado) y el mismo encuadre en las dos tomas.',
    'Termina la primera toma con el gesto y empieza la segunda con el mismo gesto.',
    'Corta justo en el gesto y haz que coincida con el golpe de la música.',
  ]
  if (r.cat === 'objeto') return [
    'Acerca el objeto (cepillo, toalla, secador) hasta tapar la cámara al final de la toma 1.',
    'Empieza la toma 2 con el objeto tapando la cámara y retíralo.',
    'Une las tomas en el momento en que la pantalla queda tapada.',
  ]
  if (r.cat === 'clip') return [
    'Un solo clip de 5 a 8 segundos: el resultado, tu salón o una escena con la clienta.',
    'Móvil fijo y luz natural; no hace falta hablar ni editar cortes.',
    'Pon un texto corto encima (una frase o dos tiempos con remate) y un audio en tendencia.',
  ]
  if (r.cat === 'fotos') return [
    'Elige de 6 a 8 fotos o clips con el mismo encuadre de rostro.',
    'Cambia de imagen cada 0,5–1 s, al ritmo de la música.',
    'Deja un texto fijo arriba durante todo el reel (la idea en una frase).',
  ]
  if (r.cat === 'camara') return [
    'No muevas la cámara entre tomas: cambia solo el look o la clienta.',
    'Marca en el suelo dónde se coloca la clienta para que el encaje sea perfecto.',
    'Tomas cortas (1–2 s) al ritmo de la música.',
  ]
  return [
    'Graba en vertical con luz de ventana de frente; el salón ordenado detrás.',
    'Di el gancho en los 2 primeros segundos mirando a cámara.',
    'Alterna tú hablando con planos de detalle del trabajo. Ideal entre 20 y 40 segundos.',
  ]
}

function embedUrl(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/instagram\.com\/(?:[A-Za-z0-9_.]*\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/)
  if (!m) return null
  return `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed`
}

export default function InspiracionReelsClient({
  userId,
  inspirations,
  transitions,
  savedIds: initialSavedIds,
  savedTransitionIds: initialSavedTransitionIds,
  initialCat = 'inspiracion',
  initialReelId = null,
}: Props) {
  const toast = useToast()
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds)
  const [savedTransitionIds, setSavedTransitionIds] = useState<string[]>(initialSavedTransitionIds)
  const [toggling, setToggling] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>(initialCat === 'transiciones' ? 'transiciones' : 'todos')
  const [feedIndex, setFeedIndex] = useState<number | null>(null)

  const all: Reel[] = useMemo(() => {
    const map = (rows: (ReelInspiration | ReelTransition)[], kind: Kind): Reel[] =>
      rows.map(r => ({ ...(r as Row), kind, cat: reelCategory(r), nuevo: isNovedad(r) }))
    const list = [...map(inspirations, 'inspiracion'), ...map(transitions, 'transicion')]
    return [...list.filter(r => r.nuevo), ...list.filter(r => !r.nuevo)]
  }, [inspirations, transitions])

  // Filtros: Todos · Transiciones (las 3 juntas) · categorías de inspiración con reels.
  const chips = useMemo(() => {
    const count = (f: (r: Reel) => boolean) => all.filter(f).length
    const out: Array<{ id: string; label: string; n: number }> = [{ id: 'todos', label: 'Todos', n: all.length }]
    const nNuevos = count(r => r.nuevo)
    if (nNuevos) out.push({ id: 'nuevos', label: 'Nuevos', n: nNuevos })
    const nTrans = count(r => r.kind === 'transicion' || TRANSITION_CATS.has(r.cat))
    if (nTrans) out.push({ id: 'transiciones', label: 'Transiciones', n: nTrans })
    for (const c of INSPIRACION_CATEGORY_ORDER) {
      const n = count(r => r.kind === 'inspiracion' && r.cat === c)
      if (n) out.push({ id: c, label: categoryLabel(c), n })
    }
    return out
  }, [all])

  const items = useMemo(() => {
    if (filter === 'todos') return all
    if (filter === 'nuevos') return all.filter(r => r.nuevo)
    if (filter === 'transiciones') return all.filter(r => r.kind === 'transicion' || TRANSITION_CATS.has(r.cat))
    return all.filter(r => r.kind === 'inspiracion' && r.cat === filter)
  }, [all, filter])

  // Desde Inicio (?reel=id): abre ese reel directamente en modo uno a uno.
  useEffect(() => {
    if (!initialReelId) return
    const i = all.findIndex(r => r.id === initialReelId)
    if (i >= 0) { setFilter('todos'); setFeedIndex(i) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSaved = useCallback(
    (r: Reel) => (r.kind === 'inspiracion' ? savedIds : savedTransitionIds).includes(r.id),
    [savedIds, savedTransitionIds],
  )

  async function toggleSaved(r: Reel) {
    if (toggling) return
    if (userId === 'demo') {
      toast.show('Guardar se activa con tu cuenta; en la demo solo se ve.', 'info')
      return
    }
    setToggling(r.id)
    const supabase = createClient()
    const saved = isSaved(r)
    const table = r.kind === 'inspiracion' ? 'saved_inspirations' : 'saved_transitions'
    const col = r.kind === 'inspiracion' ? 'inspiration_id' : 'transition_id'
    const setList = r.kind === 'inspiracion' ? setSavedIds : setSavedTransitionIds
    const { error } = saved
      ? await supabase.from(table).delete().eq('user_id', userId).eq(col, r.id)
      : await supabase.from(table).insert({ user_id: userId, [col]: r.id } as never)
    if (error) {
      toast.show('No se pudo guardar. Inténtalo de nuevo.', 'info')
    } else {
      setList(prev => (saved ? prev.filter(x => x !== r.id) : [...prev, r.id]))
      toast.show(saved ? 'Quitado de tus favoritos' : 'Guardado en tus favoritos', saved ? 'info' : 'success')
    }
    setToggling(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reels virales"
        subtitle="Reels que ya funcionan en salones, con lo que necesitas para hacerlos tuyos. Toca uno para verlo aquí mismo."
        actions={
          items.length > 0 ? (
            <button onClick={() => setFeedIndex(0)} className="btn-primary">
              <GalleryVertical size={16} aria-hidden /> Ver uno a uno
            </button>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="toolbar" aria-label="Filtrar reels">
        {chips.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} aria-pressed={filter === c.id} className="chip flex-shrink-0">
            {c.label}
            <span className={`text-[12px] tabular-nums ${filter === c.id ? 'text-crema/75' : 'text-tinta-2'}`}>{c.n}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          section="inspiracion-reels"
          title="Todavía no hay reels aquí"
          text="Estamos preparando nuevos reels virales para tu salón. Mientras tanto, prueba otro filtro."
          action={<button onClick={() => setFilter('todos')} className="btn-secondary">Ver todos los reels</button>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((r, i) => (
            <GridCard
              key={`${r.kind}-${r.id}`}
              reel={r}
              saved={isSaved(r)}
              onOpen={() => setFeedIndex(i)}
              onToggleSaved={() => toggleSaved(r)}
              busy={toggling === r.id}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {feedIndex !== null && items.length > 0 && (
          <Feed
            items={items}
            startIndex={Math.min(feedIndex, items.length - 1)}
            onClose={() => setFeedIndex(null)}
            isSaved={isSaved}
            onToggleSaved={toggleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Cover({ reel, className = '' }: { reel: Reel; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (broken || !reel.cover_image) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br from-cereza to-burdeos flex items-center justify-center ${className}`}>
        <Film size={28} className="text-crema/50" aria-hidden />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={reelCoverUrl(reel.cover_image) ?? undefined}
      alt=""
      width={270}
      height={480}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
    />
  )
}

function GridCard({ reel, saved, onOpen, onToggleSaved, busy }: {
  reel: Reel
  saved: boolean
  onOpen: () => void
  onToggleSaved: () => void
  busy: boolean
}) {
  return (
    <div className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-cereza">
      <button onClick={onOpen} className="absolute inset-0 text-left" aria-label={`Ver reel: ${reel.title}`}>
        <Cover reel={reel} className="transition-transform duration-500 group-hover:scale-105" />
        <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(42,8,18,0.35) 0%, rgba(42,8,18,0) 28%, rgba(42,8,18,0) 48%, rgba(42,8,18,0.88) 100%)' }} />
        <span aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/85 text-burdeos flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={20} fill="currentColor" className="ml-0.5" />
        </span>
        <span className="absolute bottom-0 inset-x-0 p-3 space-y-1">
          <span className="block text-[14px] font-semibold leading-snug text-white" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {reel.title}
          </span>
        </span>
      </button>
      <span className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-full text-[12px] font-semibold max-w-[calc(100%-3.5rem)] truncate bg-black/45 text-white backdrop-blur-sm">
        {reel.nuevo ? 'Nuevo' : categoryLabel(reel.cat)}
      </span>
      <button
        onClick={onToggleSaved}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        className={`absolute top-1.5 right-1.5 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${saved ? 'bg-mantequilla text-burdeos' : 'bg-black/35 text-white hover:bg-black/55'}`}
      >
        <Star size={17} fill={saved ? 'currentColor' : 'none'} aria-hidden />
      </button>
    </div>
  )
}

/** Modo uno a uno: pantalla completa, deslizar hacia arriba para el siguiente. */
function Feed({ items, startIndex, onClose, isSaved, onToggleSaved }: {
  items: Reel[]
  startIndex: number
  onClose: () => void
  isSaved: (r: Reel) => boolean
  onToggleSaved: (r: Reel) => void
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(startIndex)
  const [sheet, setSheet] = useState(false)

  // Arranca en el reel tocado; bloquea el scroll de la página de fondo.
  useEffect(() => {
    const el = scrollRef.current
    const go = () => { if (el) el.scrollTop = startIndex * el.clientHeight }
    go()
    const raf = requestAnimationFrame(go) // tras el primer pintado (alturas ya reales)
    const main = document.querySelector('main')
    const prev = main?.style.overflow
    if (main) main.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const h = el?.clientHeight ?? 0
        el?.scrollBy({ top: e.key === 'ArrowDown' ? h : -h, behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      if (main) main.style.overflow = prev || ''
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ¿Qué reel está en pantalla? Cada página mide una pantalla: basta con la
  // posición del scroll. Solo ese reel carga el reproductor (ahorra datos y
  // para el audio del anterior al deslizar).
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.clientHeight === 0) return
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / el.clientHeight)))
    setActive(prev => {
      if (prev !== i) setSheet(false)
      return i
    })
  }, [items.length])

  const current = items[active]

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-[#16060B] text-crema"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label="Reels virales, uno a uno"
    >
      {/* Barra superior */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-gradient-to-b from-[#16060B] to-transparent">
        <button onClick={onClose} className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold">
          <LayoutGrid size={16} aria-hidden /> Galería
        </button>
        <span className="text-sm font-semibold tabular-nums text-crema/80" aria-live="polite">{active + 1} / {items.length}</span>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Cerrar">
          <X size={18} aria-hidden />
        </button>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar overscroll-contain">
        {items.map((r, i) => (
          <section
            key={`${r.kind}-${r.id}`}
            data-index={i}
            className="h-full overflow-hidden snap-start snap-always flex flex-col md:flex-row md:items-center md:justify-center gap-3 md:gap-8 px-4 pt-[calc(env(safe-area-inset-top)+4.25rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            <Player reel={r} live={Math.abs(i - active) === 0} />
            <div className="md:w-[380px] md:max-h-[80dvh] md:overflow-y-auto md:pr-1 flex-shrink-0 space-y-3 min-w-0">
              <ReelInfo reel={r} saved={isSaved(r)} onToggleSaved={() => onToggleSaved(r)} onOpenTips={() => setSheet(true)} />
              {/* En ordenador «Hazlo tuyo» va siempre a la vista, al lado del vídeo */}
              <div className="hidden md:block"><HazloTuyo reel={r} /></div>
            </div>
          </section>
        ))}
      </div>

      {/* Móvil: «Hazlo tuyo» en hoja inferior */}
      <AnimatePresence>
        {sheet && current && (
          <>
            <motion.button
              className="md:hidden fixed inset-0 z-30 bg-black/50"
              aria-label="Cerrar Hazlo tuyo"
              onClick={() => setSheet(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="md:hidden fixed inset-x-0 bottom-0 z-40 max-h-[78dvh] overflow-y-auto overscroll-contain rounded-t-[28px] bg-crema text-tinta px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-borde" aria-hidden />
              <HazloTuyo reel={current} light />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Player({ reel, live }: { reel: Reel; live: boolean }) {
  const src = embedUrl(reel.instagram_url)
  // Tamaño: que quepa en vertical dejando sitio a la información debajo (móvil)
  // o al lado (ordenador). El embed de IG mide ~9:16 más su cabecera.
  return (
    <div
      className="relative mx-auto md:mx-0 flex-shrink-0 max-w-full rounded-[20px] overflow-hidden bg-black h-[calc(100dvh-16.5rem)] md:h-[min(760px,calc(100dvh-7rem))]"
      style={{ aspectRatio: '9 / 16.2' }}
    >
      {live && src ? (
        <iframe
          src={src}
          title={reel.title}
          loading="lazy"
          scrolling="no"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0 bg-white"
        />
      ) : (
        <>
          <Cover reel={reel} />
          <span aria-hidden className="absolute inset-0 bg-black/25" />
          <span aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/85 text-burdeos flex items-center justify-center">
            <Play size={22} fill="currentColor" className="ml-0.5" />
          </span>
        </>
      )}
    </div>
  )
}

function ReelInfo({ reel, saved, onToggleSaved, onOpenTips }: {
  reel: Reel
  saved: boolean
  onToggleSaved: () => void
  onOpenTips: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-mantequilla">{reel.nuevo ? 'Nuevo · ' : ''}{categoryLabel(reel.cat)}</p>
        <h2 className="text-lg font-semibold leading-snug text-white truncate md:whitespace-normal">{reel.title}</h2>
        {reel.short_description && <p className="hidden md:block text-[15px] text-crema/75 leading-relaxed">{reel.short_description}</p>}
      </div>
      <div className="flex gap-2">
        <div className="md:hidden flex flex-1">
          <button onClick={onOpenTips} className="btn-secondary flex-1 justify-center">
            <ChevronUp size={16} aria-hidden /> Hazlo tuyo
          </button>
        </div>
        {isSpoken(reel) && (
          <div className="hidden md:flex flex-1">
            <GuionLink reel={reel} className="flex-1 justify-center" />
          </div>
        )}
        <AskTeamButton titulo={`Quiero un reel como: ${reel.title}`} texto={reel.instagram_url ?? reel.short_description ?? undefined} seccion="reels-virales" label="Para mi equipo"
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-12 px-3.5 rounded-[var(--radius-sm)] bg-white/10 text-white hover:bg-white/20 text-sm font-semibold" />
        <button
          onClick={onToggleSaved}
          aria-pressed={saved}
          aria-label={saved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          className={`w-12 h-12 flex-shrink-0 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors ${saved ? 'bg-mantequilla text-burdeos' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <Star size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        </button>
        {reel.instagram_url && (
          <a
            href={reel.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 flex-shrink-0 rounded-[var(--radius-sm)] flex items-center justify-center bg-white/10 text-white hover:bg-white/20"
            aria-label="Abrir en Instagram (si aquí no carga)"
            title="Abrir en Instagram (si aquí no carga)"
          >
            <ExternalLink size={17} aria-hidden />
          </a>
        )}
      </div>
    </div>
  )
}

function GuionLink({ reel, className = '' }: { reel: Reel; className?: string }) {
  // Brief listo para la IA: la idea del reel como inspiración (no copia),
  // adaptada al salón. Crear guiones salta directo a los ganchos (auto=1).
  const tema = `Quiero un Reel hablado inspirado en este que ya funciona: «${reel.title}». ${reel.idea_text || reel.short_description || ''} Adáptalo a mi salón y a mi forma de hablar, con un enfoque propio, no una copia.`
  return (
    <Link
      href={`/crear-contenido?tema=${encodeURIComponent(tema.replace(/\s+/g, ' ').trim().slice(0, 600))}&auto=1`}
      className={`btn-primary ${className}`}
    >
      <Sparkles size={16} aria-hidden /> Crear mi guion con esta idea
    </Link>
  )
}

/** «Hazlo tuyo»: la idea, por qué funciona y cómo grabarlo — útil en todos los reels. */
function HazloTuyo({ reel, light = false }: { reel: Reel; light?: boolean }) {
  const head = light ? 'text-burdeos' : 'text-white'
  const body = light ? 'text-tinta' : 'text-crema/85'
  const box = light ? 'bg-white border border-borde' : 'bg-white/[0.06]'
  return (
    <div className="space-y-3">
      <p className={`text-base font-semibold ${head}`}>Hazlo tuyo</p>
      {reel.idea_text && (
        <TipBlock icon={<Lightbulb size={16} aria-hidden />} title="La idea" text={reel.idea_text} head={head} body={body} box={box} />
      )}
      {reel.why_text && (
        <TipBlock icon={<Sparkles size={16} aria-hidden />} title="Por qué funciona" text={reel.why_text} head={head} body={body} box={box} />
      )}
      <div className={`rounded-2xl p-4 ${box}`}>
        <p className={`flex items-center gap-2 text-[14px] font-semibold ${head}`}><Camera size={16} aria-hidden /> Cómo grabarlo</p>
        {reel.how_text && <p className={`mt-1.5 text-[15px] leading-relaxed ${body}`}>{reel.how_text}</p>}
        <ol className={`mt-2 space-y-1.5 text-[15px] leading-relaxed ${body}`}>
          {recordingTips(reel).map((t, i) => (
            <li key={i} className="flex gap-2.5">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full text-[12px] font-semibold flex items-center justify-center ${light ? 'bg-mantequilla text-burdeos' : 'bg-mantequilla/90 text-burdeos'}`}>{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
      {isSpoken(reel) ? (
        <div className="md:hidden"><GuionLink reel={reel} className="w-full justify-center" /></div>
      ) : (
        <p className={`text-[14px] ${light ? 'text-tinta-2' : 'text-crema/60'}`}>
          {reel.cat === 'clip'
            ? 'Es un clip único con texto: no necesita guion. Graba tu clip, ponle tu frase y listo.'
            : 'Es un reel sin hablar: se basa en la edición y en la música, así que no necesita guion.'}
        </p>
      )}
    </div>
  )
}

function TipBlock({ icon, title, text, head, body, box }: { icon: React.ReactNode; title: string; text: string; head: string; body: string; box: string }) {
  return (
    <div className={`rounded-2xl p-4 ${box}`}>
      <p className={`flex items-center gap-2 text-[14px] font-semibold ${head}`}>{icon} {title}</p>
      <p className={`mt-1.5 text-[15px] leading-relaxed ${body}`}>{text}</p>
    </div>
  )
}

