'use client'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { ReelInspiration, ReelTransition } from '@/types/database'
import { reelCategory, categoryLabel } from '@/lib/reel-categories'
import { isNovedad } from '@/lib/reel-novedades'
import { reelCoverUrl } from '@/lib/reel-cover'

type Item = Pick<ReelInspiration | ReelTransition, 'id' | 'title' | 'cover_image' | 'instagram_url'>

/**
 * REELS VIRALES en Inicio (21-oct-2026) — sustituye a los tres bloques de
 * antes (botón Inspiración, caja Inspiración y caja Transiciones).
 * Hoja burdeos con las portadas en vertical: se desliza con el dedo, avanza
 * sola despacio (se para al tocarla) y cada portada abre ESE reel.
 */
export default function ReelsViralesHero({ inspirations, transitions }: { inspirations: Item[]; transitions: Item[] }) {
  const items = useMemo(() => {
    const all = [...(inspirations ?? []), ...(transitions ?? [])].filter(r => !!r?.cover_image)
    // Las novedades primero: es lo que hace volver.
    return [...all.filter(isNovedad), ...all.filter(r => !isNovedad(r))]
  }, [inspirations, transitions])

  const stripRef = useRef<HTMLDivElement | null>(null)
  const [paused, setPaused] = useState(false)

  // Avance automático suave (cada 3 s una portada); se detiene al interactuar
  // y con «reducir movimiento».
  useEffect(() => {
    const el = stripRef.current
    if (!el || paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => {
      const card = el.querySelector<HTMLElement>('[data-card]')
      const step = (card?.offsetWidth ?? 140) + 12
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' })
    }, 3000)
    return () => clearInterval(t)
  }, [paused, items.length])

  if (items.length === 0) return null

  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-lg)] bg-burdeos text-crema"
      style={{ boxShadow: 'var(--shadow-strong)' }}
      aria-labelledby="reels-virales-title"
    >
      {/* Brillo cálido de fondo */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-40 blur-3xl" style={{ background: '#B8324F' }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 w-72 h-72 rounded-full opacity-25 blur-3xl" style={{ background: 'var(--color-mantequilla)' }} />

      <div className="relative px-5 pt-5 sm:px-6 sm:pt-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="reels-virales-title" className="text-[26px] sm:text-[30px] font-semibold leading-tight text-white">Reels virales</h2>
          <p className="mt-1 text-[15px] text-crema/80">
            {items.length} reels que ya funcionan en salones. Desliza y toca para verlos.
          </p>
        </div>
      </div>

      <div
        ref={stripRef}
        className="relative mt-4 flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-5 sm:px-6 pb-1"
        onPointerDown={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onFocus={() => setPaused(true)}
        onWheel={() => setPaused(true)}
      >
        {items.slice(0, 16).map(r => (
          <ReelCover key={r.id} item={r} />
        ))}
        <Link
          href="/inspiracion-reels"
          data-card
          className="snap-start flex-shrink-0 w-[132px] sm:w-[150px] aspect-[9/16] rounded-2xl border-[1.5px] border-crema/30 flex flex-col items-center justify-center gap-2 text-center px-3 hover:bg-white/5"
        >
          <span className="w-11 h-11 rounded-full bg-mantequilla text-burdeos flex items-center justify-center"><ArrowRight size={20} aria-hidden /></span>
          <span className="text-sm font-semibold">Ver los {items.length}</span>
        </Link>
      </div>

      <div className="relative px-5 sm:px-6 pt-4 pb-5 sm:pb-6">
        <Link href="/inspiracion-reels" className="btn-secondary w-full sm:w-auto justify-center">
          <Play size={16} fill="currentColor" aria-hidden /> Ver todos los reels virales
        </Link>
      </div>
    </section>
  )
}

function ReelCover({ item }: { item: Item }) {
  const [broken, setBroken] = useState(false)
  const nuevo = isNovedad(item)
  return (
    <Link
      href={`/inspiracion-reels?reel=${encodeURIComponent(item.id)}`}
      data-card
      className="group snap-start relative flex-shrink-0 w-[132px] sm:w-[150px] aspect-[9/16] rounded-2xl overflow-hidden bg-cereza"
      aria-label={`Ver reel: ${item.title}`}
    >
      {!broken && item.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={reelCoverUrl(item.cover_image) ?? undefined}
          alt=""
          width={150}
          height={267}
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(42,8,18,0.35) 0%, rgba(42,8,18,0) 30%, rgba(42,8,18,0) 50%, rgba(42,8,18,0.85) 100%)' }} />
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[12px] font-semibold bg-black/45 text-white backdrop-blur-sm max-w-[calc(100%-1rem)] truncate">
        {nuevo ? 'Nuevo' : categoryLabel(reelCategory(item))}
      </span>
      <span aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/85 text-burdeos flex items-center justify-center opacity-90 group-hover:scale-110 transition-transform">
        <Play size={18} fill="currentColor" className="ml-0.5" />
      </span>
      <p className="absolute bottom-2 left-2 right-2 text-[13px] font-semibold leading-tight text-white" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {item.title}
      </p>
    </Link>
  )
}
