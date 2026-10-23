'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Clapperboard, Heart, MessageCircle, Play, Rocket } from 'lucide-react'
import { ReelInspiration, ReelTransition } from '@/types/database'
import { reelCategory, categoryLabel } from '@/lib/reel-categories'
import { isNovedad } from '@/lib/reel-novedades'
import { reelCoverUrl } from '@/lib/reel-cover'
import { setSessionValue } from '@/lib/session-store'

type Item = Pick<ReelInspiration | ReelTransition, 'id' | 'title' | 'cover_image' | 'instagram_url'> & {
  idea_text?: string | null
  short_description?: string | null
}

/**
 * REELS VIRALES en Inicio (21-oct-2026; más atractivo 22-oct-2026):
 * - «Los 3 de esta semana» con números grandes (las novedades primero).
 * - Tira de portadas que se desliza sola y continua (se para al tocarla).
 * - «Grábalo tú» en cada portada: abre Crear guiones con la idea de ese reel.
 */
export default function ReelsViralesHero({ inspirations, transitions, userId = 'demo' }: { inspirations: Item[]; transitions: Item[]; userId?: string }) {
  const router = useRouter()
  const items = useMemo(() => {
    const all = [...(inspirations ?? []), ...(transitions ?? [])].filter(r => !!r?.cover_image)
    // Las novedades primero: es lo que hace volver.
    return [...all.filter(isNovedad), ...all.filter(r => !isNovedad(r))]
  }, [inspirations, transitions])
  const rest = items.slice(0, 16)
  // Dentro del móvil: la portada de una transición real (lo más visual de la sección).
  const phoneCover = useMemo(() => {
    const t = (transitions ?? []).find(r => !!r?.cover_image)
    return (t && reelCoverUrl(t.cover_image)) || '/banco-ia/melenas/melena-movimiento.jpg'
  }, [transitions])

  /** Crear guiones arranca con la idea del reel ya escrita. */
  function recordIt(r: Item) {
    const u = `u:${userId}:guiones2`
    const idea = (r.idea_text || r.short_description || '').trim()
    setSessionValue(`${u}:step`, 'topic')
    setSessionValue(`${u}:idea`, `Quiero hacer un reel como «${r.title}».${idea ? ` ${idea}` : ''}`)
    setSessionValue(`${u}:current`, null)
    setSessionValue(`${u}:hooks`, [])
    setSessionValue(`${u}:picked`, null)
    router.push('/crear-contenido')
  }

  // Deslizamiento continuo y suave; se detiene al tocar y 6 s después sigue.
  const stripRef = useRef<HTMLDivElement | null>(null)
  const [paused, setPaused] = useState(false)
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pause = () => {
    setPaused(true)
    if (resumeRef.current) clearTimeout(resumeRef.current)
    resumeRef.current = setTimeout(() => setPaused(false), 6000)
  }
  useEffect(() => {
    const el = stripRef.current
    if (!el || paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let last = performance.now()
    let pos = el.scrollLeft
    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      pos += dt * 0.03 // ~30 px por segundo
      if (pos >= el.scrollWidth - el.clientWidth - 1) pos = 0
      el.scrollLeft = pos
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, rest.length])
  useEffect(() => () => { if (resumeRef.current) clearTimeout(resumeRef.current) }, [])

  if (items.length === 0) return null

  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-lg)] bg-burdeos text-crema"
      style={{ boxShadow: 'var(--shadow-strong)' }}
      aria-labelledby="reels-virales-title"
      data-tone="dark"
    >
      {/* Brillo cálido de fondo */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-40 blur-3xl" style={{ background: '#B8324F' }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 w-72 h-72 rounded-full opacity-25 blur-3xl" style={{ background: 'var(--color-mantequilla)' }} />

      {/* Cabecera impactante: título grande + móvil con un balayage, corazones y likes animados */}
      <style>{`
        @keyframes rv-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes rv-rise { 0% { transform: translateY(0) scale(.6); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-130px) scale(1.1); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .rv-anim { animation: none !important } }
      `}</style>
      <div className="relative px-5 pt-5 sm:px-7 sm:pt-6 flex items-center gap-3 min-h-[150px] sm:min-h-[180px]">
        <div className="relative z-10 flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/12 px-3 py-1 text-[12px] font-semibold text-mantequilla">
            <Rocket size={13} aria-hidden /> Funciona ahora
          </span>
          <h2 id="reels-virales-title" className="mt-3 font-bold leading-[0.92] tracking-[-0.02em] text-white" style={{ fontSize: 'clamp(40px, 11vw, 64px)', fontFamily: 'var(--font-archivo-wide), var(--font-archivo), system-ui, sans-serif', fontStretch: '115%' }}>
            Reels<br /><span className="text-mantequilla">virales</span>
          </h2>
          <Link href="/inspiracion-reels" className="mt-2 inline-flex items-center gap-1 text-[14px] font-semibold text-crema/90 hover:text-white">
            Ver todos <ArrowRight size={15} aria-hidden />
          </Link>
        </div>

        {/* Móvil con el reel y la reacción */}
        <div aria-hidden className="relative flex-shrink-0 w-[84px] sm:w-[108px] mr-2">
          <div className="rv-anim relative aspect-[9/17] rounded-[22px] bg-tinta p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] rotate-[6deg]" style={{ animation: 'rv-float 4s ease-in-out infinite' }}>
            <div className="relative w-full h-full rounded-[17px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={phoneCover} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)' }} />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 text-burdeos flex items-center justify-center"><Play size={13} fill="currentColor" className="ml-0.5" /></span>
              <span className="absolute right-1 bottom-4 flex flex-col items-center gap-0.5 text-white text-[9px] font-semibold"><Heart size={15} fill="#ff3b6b" stroke="#ff3b6b" />24K</span>
            </div>
          </div>
          {/* corazones que suben */}
          {[0, 1, 2, 3].map(i => (
            <Heart key={i} size={14 + (i % 2) * 6} fill="#ff3b6b" stroke="#ff3b6b"
              className="rv-anim absolute bottom-10 opacity-0"
              style={{ right: `${4 + i * 10}px`, animation: `rv-rise ${2.6 + i * 0.4}s ease-out ${i * 0.7}s infinite` }} />
          ))}
          {/* píldoras de likes y comentarios */}
          <span className="rv-anim absolute -left-10 top-5 sm:-left-12 rounded-full bg-white text-burdeos text-[11px] font-bold px-2.5 py-1 shadow-lg flex items-center gap-1" style={{ animation: 'rv-float 3.4s ease-in-out .3s infinite' }}>
            <Heart size={12} fill="#ff3b6b" stroke="#ff3b6b" /> 12,4K
          </span>
          <span className="rv-anim absolute -left-6 bottom-6 rounded-full bg-mantequilla text-burdeos text-[11px] font-bold px-2.5 py-1 shadow-lg flex items-center gap-1" style={{ animation: 'rv-float 3.8s ease-in-out 1s infinite' }}>
            <MessageCircle size={12} /> 860
          </span>
        </div>
      </div>

      {/* El resto: tira que se mueve sola */}
      {rest.length > 0 && (
        <div
          ref={stripRef}
          className={`relative mt-2 flex gap-3 overflow-x-auto no-scrollbar px-5 sm:px-6 pb-1 ${paused ? 'snap-x snap-mandatory' : ''}`}
          onPointerDown={pause}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={pause}
          onFocus={pause}
          onWheel={pause}
          onTouchStart={pause}
        >
          {rest.map(r => <ReelCover key={r.id} item={r} onRecord={recordIt} />)}
          <Link href="/inspiracion-reels" data-card
            className="snap-start flex-shrink-0 w-[104px] sm:w-[124px] aspect-[9/16] rounded-2xl border-[1.5px] border-crema/30 flex flex-col items-center justify-center gap-2 text-center px-3 hover:bg-white/5">
            <span className="w-11 h-11 rounded-full bg-mantequilla text-burdeos flex items-center justify-center"><ArrowRight size={20} aria-hidden /></span>
            <span className="text-sm font-semibold">Ver los {items.length}</span>
          </Link>
        </div>
      )}

      <div className="h-4 sm:h-5" />
    </section>
  )
}

function ReelCover({ item, onRecord, big = false }: { item: Item; onRecord: (r: Item) => void; big?: boolean }) {
  const [broken, setBroken] = useState(false)
  const nuevo = isNovedad(item)
  return (
    <div data-card className={`group snap-start relative flex-shrink-0 aspect-[9/16] rounded-2xl overflow-hidden bg-cereza ${big ? 'w-full' : 'w-[104px] sm:w-[124px]'}`}>
      <Link href={`/inspiracion-reels?reel=${encodeURIComponent(item.id)}`} className="absolute inset-0" aria-label={`Ver reel: ${item.title}`}>
        {!broken && item.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reelCoverUrl(item.cover_image) ?? undefined} alt="" loading="lazy" onError={() => setBroken(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(42,8,18,0.35) 0%, rgba(42,8,18,0) 30%, rgba(42,8,18,0) 45%, rgba(42,8,18,0.9) 100%)' }} />
        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-black/45 text-white backdrop-blur-sm max-w-[calc(100%-0.75rem)] truncate">
          {nuevo ? 'Nuevo' : categoryLabel(reelCategory(item))}
        </span>
        <span className="absolute bottom-10 left-2 right-2 text-[12px] sm:text-[13px] font-semibold leading-tight text-white"
          style={{ display: '-webkit-box', WebkitLineClamp: big ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </span>
      </Link>
      <button onClick={() => onRecord(item)}
        className="absolute bottom-2 left-2 right-2 rounded-full bg-mantequilla text-burdeos text-[12px] font-semibold py-1.5 flex items-center justify-center gap-1 whitespace-nowrap hover:brightness-95"
        aria-label={`Grábalo tú: ${item.title}`}>
        <Clapperboard size={13} aria-hidden /> Grábalo tú
      </button>
    </div>
  )
}
