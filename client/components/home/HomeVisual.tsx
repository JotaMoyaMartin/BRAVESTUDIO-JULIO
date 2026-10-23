'use client'
/**
 * INICIO VISUAL (22-oct-2026): cabecera con foto («Hoy toca» de Mi plan) y
 * herramientas en tarjetas grandes con foto. Lo primero que se ve al entrar.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Calendar, Sparkles } from 'lucide-react'
import type { ContentItem } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { demoGetPlan } from '@/lib/demo-store'
import { planStatus } from '@/lib/plan/progress'
import { openInTool } from '@/lib/plan/open-in-tool'
import { pickBancoPhoto } from '@/lib/banco-ia'
import { isoDay, typeStyle } from '@/components/plan/WeekPlan'

type PlanRow = Pick<ContentItem, 'id' | 'type' | 'title' | 'service' | 'scheduled_date' | 'content_json'>

/** Próximas publicaciones del plan (hoy en adelante), sin las ya publicadas. */
function useUpcoming(userId: string) {
  const [items, setItems] = useState<PlanRow[] | null>(null)
  useEffect(() => {
    const today = isoDay(new Date())
    const pick = (rows: PlanRow[]) => rows
      .filter(r => r.scheduled_date && r.scheduled_date >= today && planStatus(r) !== 'publicado')
      .sort((a, b) => (a.scheduled_date! < b.scheduled_date! ? -1 : 1))
    if (userId === 'demo') {
      setItems(pick(demoGetPlan() as unknown as PlanRow[]))
      return
    }
    createClient().from('content_items')
      .select('id, type, title, service, scheduled_date, content_json')
      .eq('user_id', userId).gte('scheduled_date', today).order('scheduled_date', { ascending: true }).limit(20)
      .then(({ data }) => setItems(pick((data as PlanRow[] | null) ?? [])), () => setItems([]))
  }, [userId])
  return items
}

const whenLabel = (iso: string) => {
  const today = isoDay(new Date())
  const t = new Date(); t.setDate(t.getDate() + 1)
  if (iso === today) return 'Hoy toca'
  if (iso === isoDay(t)) return 'Mañana toca'
  const [y, m, d] = iso.split('-').map(Number)
  return `Lo próximo · ${new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}`
}

interface HeroSlide {
  id: string
  photo: string
  kicker: string
  title: string
  primary: { label: string; onClick?: () => void; href?: string }
  secondary?: { label: string; href: string } | null
}

/**
 * Cabecera de Inicio (22-oct-2026): bienvenida que ROTA entre varios mensajes,
 * cada uno con su foto y su botón. El primero es siempre lo prioritario
 * (Mi Marca → lo que toca en Mi plan → planificar el mes); los demás invitan
 * a Bravi, Reels virales y Estudio de fotos.
 */
export function HomeHero({ userId, greeting, brandCta }: {
  userId: string
  greeting: string
  /** Si falta Mi Marca, la cabecera invita a completarla. */
  brandCta?: { title: string; href: string } | null
}) {
  const router = useRouter()
  const upcoming = useUpcoming(userId)
  const next = upcoming?.[0] ?? null

  const slides: HeroSlide[] = useMemo(() => {
    let first: HeroSlide
    if (brandCta) {
      first = { id: 'marca', photo: '/banco-ia/melenas/melena-ondas-caramelo.jpg', kicker: 'Empieza aquí', title: 'Cuéntame sobre tu salón y te preparo tu estrategia', primary: { label: 'Empezar', href: brandCta.href } }
    } else if (next) {
      const t = typeStyle(next.type)
      first = {
        id: 'hoy',
        photo: pickBancoPhoto({ text: `${next.title} ${next.service ?? ''}`, visual: next.type === 'carrusel' ? 'macro_detail' : 'lifestyle', seed: next.id }) ?? '/banco-ia/melenas/melena-movimiento.jpg',
        kicker: `${whenLabel(next.scheduled_date!)} · ${t.label}${next.service ? ` · ${next.service}` : ''}`,
        title: next.title,
        primary: { label: t.create.label, onClick: () => router.push(openInTool(next as ContentItem, userId)) },
        secondary: { label: 'Ver Mi plan', href: '/calendario' },
      }
    } else {
      first = { id: 'plan', photo: '/banco-ia/salon/espejo-luz.jpg', kicker: 'Tu mes, en un toque', title: 'Planifica tu contenido y te digo qué toca cada día', primary: { label: 'Planifícame el mes', href: '/planificar' } }
    }
    return [
      first,
      { id: 'bravi', photo: '/banco-ia/rubios/rubio-mano-ondas.jpg', kicker: 'Tu asistente', title: '¿Sin ideas hoy? Pídeme un reel, una story o un carrusel', primary: { label: 'Hablar con Bravi', href: '/asistente' } },
      { id: 'virales', photo: '/banco-ia/melenas/melena-sillon-espejo.jpg', kicker: 'Novedades', title: 'Reels que ya funcionan en salones, listos para grabar', primary: { label: 'Ver reels virales', href: '/inspiracion-reels' } },
      { id: 'estudio', photo: '/banco-ia/herramientas/secador-mano.jpg', kicker: 'Estudio de fotos', title: 'Tus fotos con luz y fondo de revista, gratis', primary: { label: 'Mejorar una foto', href: '/estudio' } },
    ]
  }, [brandCta, next, router, userId])

  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || slides.length < 2) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI(v => (v + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [paused, slides.length])
  const loading = upcoming === null && !brandCta
  const cur = slides[Math.min(i, slides.length - 1)]

  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-lg)] min-h-[320px] sm:min-h-[360px] flex items-end text-crema"
      data-tone="dark" aria-roledescription="carrusel" aria-label="Bienvenida"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {slides.map((sl, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={sl.id} src={sl.photo} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover transition-all duration-[1200ms] ease-out"
          style={{ opacity: k === i ? 1 : 0, transform: k === i ? 'scale(1.04)' : 'scale(1)' }} />
      ))}
      <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(43,18,26,0.2) 0%, rgba(43,18,26,0.35) 40%, rgba(43,18,26,0.9) 100%)' }} />
      <div className="relative w-full p-5 sm:p-8 space-y-4">
        <p className="text-[15px] font-semibold text-crema/90">{greeting}</p>
        <div key={cur.id} className="space-y-1.5 animate-[fadeUp_.6s_ease-out]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-mantequilla">{loading ? '\u00a0' : cur.kicker}</p>
          <h1 className="!text-crema text-[26px] sm:text-[34px] leading-tight font-semibold max-w-xl">{loading ? '\u00a0' : cur.title}</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {cur.primary.href
            ? <Link href={cur.primary.href} className="btn-primary justify-center !bg-mantequilla !text-burdeos"><Sparkles size={16} aria-hidden /> {cur.primary.label}</Link>
            : <button onClick={cur.primary.onClick} className="btn-primary justify-center !bg-mantequilla !text-burdeos"><Sparkles size={16} aria-hidden /> {cur.primary.label} <ArrowRight size={16} aria-hidden /></button>}
          {cur.secondary && <Link href={cur.secondary.href} className="btn-ghost justify-center !text-crema !border-white/40"><Calendar size={16} aria-hidden /> {cur.secondary.label}</Link>}
        </div>
        {/* Puntos: cuál se ve y para saltar */}
        <div className="flex gap-1.5 pt-1" role="tablist" aria-label="Mensajes">
          {slides.map((sl, k) => (
            <button key={sl.id} role="tab" aria-selected={k === i} aria-label={sl.kicker}
              onClick={() => { setI(k); setPaused(true) }}
              className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-mantequilla' : 'w-2 bg-white/45'}`} />
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  )
}
