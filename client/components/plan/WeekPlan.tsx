'use client'
/**
 * MI PLAN (22-oct-2026): «Hoy toca» + semana legible en el móvil.
 * Sustituye la lista y la rejilla ilegible del calendario como vista principal.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Film, Images, LayoutGrid, Sparkles, ArrowRight, Check, Circle, CircleDashed } from 'lucide-react'
import { PLAN_STATUSES, nextStatus, planStatus, type PlanStatus } from '@/lib/plan/progress'
import type { ContentItem } from '@/types/database'

export const TYPE_STYLE: Record<string, { label: string; color: string; bg: string; icon: typeof Film; create: { href: string; label: string } }> = {
  reel: { label: 'Reel', color: '#7A1832', bg: '#F6E3E8', icon: Film, create: { href: '/teleprompter', label: 'Grabar con teleprompter' } },
  carrusel: { label: 'Carrusel', color: '#2C5A78', bg: '#E1EEF5', icon: Images, create: { href: '/carrusel', label: 'Diseñar el carrusel' } },
  story: { label: 'Stories', color: '#8A5A12', bg: '#FFF1C9', icon: LayoutGrid, create: { href: '/stories', label: 'Diseñar las stories' } },
}
export const typeStyle = (t: string) => TYPE_STYLE[t] || TYPE_STYLE.story

/** AAAA-MM-DD local. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return m
}
const dayName = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('es-ES', opts).replace(/\./g, '')

/** Píldora de estado: un toque pasa Idea → Preparado → Publicado. */
export function StatusPill({ item, onStatus, tone = 'light' }: { item: ContentItem; onStatus: (it: ContentItem, s: PlanStatus) => void; tone?: 'light' | 'dark' }) {
  const s = planStatus(item)
  const label = PLAN_STATUSES.find(x => x.id === s)!.label
  const Icon = s === 'publicado' ? Check : s === 'preparado' ? Circle : CircleDashed
  const cls = tone === 'dark'
    ? s === 'publicado' ? 'bg-mantequilla text-burdeos' : 'bg-white/15 text-crema'
    : s === 'publicado' ? 'bg-[#2A7A4A] text-white' : s === 'preparado' ? 'bg-mantequilla text-burdeos' : 'bg-white text-tinta-2 border border-borde'
  return (
    <button onClick={e => { e.stopPropagation(); onStatus(item, nextStatus(s)) }}
      className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold ${cls}`}
      aria-label={`Estado: ${label}. Toca para pasar a ${PLAN_STATUSES.find(x => x.id === nextStatus(s))!.label}`}>
      <Icon size={13} aria-hidden strokeWidth={2.5} /> {label}
    </button>
  )
}

/** Barra del mes: cuántas publicadas de las programadas. */
export function MonthCounter({ total, done, ready }: { total: number; done: number; ready: number }) {
  if (!total) return null
  const pct = Math.round((done / total) * 100)
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold text-ink">Este mes llevas <span className="text-cereza">{done} de {total}</span> publicadas</p>
        <p className="text-[13px] text-tinta-2">{ready > 0 ? `${ready} listas para subir` : done === total ? '¡Mes completo!' : ''}</p>
      </div>
      <div className="h-2.5 rounded-full bg-warm-gray overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
        <div className="h-full rounded-full bg-cereza transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Lo que toca hoy; si hoy está libre, lo próximo. */
export function HoyToca({ items, onOpen, onCreate, onStatus }: { items: ContentItem[]; onOpen: (it: ContentItem) => void; onCreate: (it: ContentItem) => void; onStatus: (it: ContentItem, s: PlanStatus) => void }) {
  const today = isoDay(new Date())
  // Lo ya publicado no «toca»: hoy y lo próximo solo cuentan lo pendiente.
  const pending = items.filter(i => planStatus(i) !== 'publicado')
  const hoy = pending.filter(i => i.scheduled_date === today)
  const doneToday = items.filter(i => i.scheduled_date === today && planStatus(i) === 'publicado').length
  const next = hoy.length ? null : pending.filter(i => (i.scheduled_date || '') > today).sort((a, b) => (a.scheduled_date! < b.scheduled_date! ? -1 : 1))[0]
  const list = hoy.length ? hoy : next ? [next] : []

  if (!list.length) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-mantequilla p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <p className="text-[13px] font-semibold text-cereza">Hoy toca</p>
          <p className="text-lg font-semibold text-burdeos">{doneToday ? '¡Hoy ya has publicado! No tienes nada más pendiente.' : 'No tienes nada pendiente. ¿Planificamos tu mes?'}</p>
        </div>
        <Link href="/planificar" className="btn-primary justify-center"><Sparkles size={16} aria-hidden /> Planifícame el mes</Link>
      </div>
    )
  }

  const first = list[0]
  const when = hoy.length ? 'Hoy toca' : `Lo próximo · ${dayName(new Date(first.scheduled_date + 'T12:00:00'), { weekday: 'long', day: 'numeric', month: 'long' })}`
  return (
    <div className="rounded-[var(--radius-lg)] bg-burdeos text-crema p-5 sm:p-6 space-y-4" data-tone="dark">
      <p className="text-[13px] font-semibold text-mantequilla first-letter:uppercase">{when}</p>
      {list.map(it => {
        const t = typeStyle(it.type)
        const Icon = t.icon
        return (
          <div key={it.id} className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><Icon size={20} aria-hidden /></span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[13px] text-crema/75">{t.label}{it.service ? ` · ${it.service}` : ''}</p>
                <p className="text-xl font-semibold leading-snug">{it.title}</p>
                <StatusPill item={it} onStatus={onStatus} tone="dark" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => onCreate(it)} className="btn-primary justify-center !bg-mantequilla !text-burdeos">{t.create.label} <ArrowRight size={16} aria-hidden /></button>
              <button onClick={() => onOpen(it)} className="btn-ghost justify-center !text-crema !border-white/30">Ver el guion</button>
              {hoy.length > 0 && <button onClick={() => onStatus(it, 'publicado')} className="btn-ghost justify-center !text-crema !border-white/30"><Check size={16} aria-hidden /> Ya lo he publicado</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Semana de lunes a domingo, un día debajo de otro. */
export function WeekPlan({ items, onOpen, onStatus }: { items: ContentItem[]; onOpen: (it: ContentItem) => void; onStatus: (it: ContentItem, s: PlanStatus) => void }) {
  const [offset, setOffset] = useState(0)
  const today = isoDay(new Date())
  const days = useMemo(() => {
    const start = mondayOf(new Date())
    start.setDate(start.getDate() + offset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [offset])
  const range = `${dayName(days[0], { day: 'numeric', month: 'short' })} – ${dayName(days[6], { day: 'numeric', month: 'short' })}`
  const count = items.filter(i => i.scheduled_date && i.scheduled_date >= isoDay(days[0]) && i.scheduled_date <= isoDay(days[6])).length

  return (
    <section className="card overflow-hidden" aria-label="Semana">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-borde">
        <button onClick={() => setOffset(o => o - 1)} className="w-10 h-10 rounded-full hover:bg-warm-gray flex items-center justify-center text-cereza" aria-label="Semana anterior"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-burdeos">{offset === 0 ? 'Esta semana' : offset === 1 ? 'La semana que viene' : range}</p>
          <p className="text-[13px] text-tinta-2">{offset === 0 || offset === 1 ? `${range} · ` : ''}{count} {count === 1 ? 'publicación' : 'publicaciones'}</p>
        </div>
        <button onClick={() => setOffset(o => o + 1)} className="w-10 h-10 rounded-full hover:bg-warm-gray flex items-center justify-center text-cereza" aria-label="Semana siguiente"><ChevronRight size={20} /></button>
      </header>
      <ol>
        {days.map(d => {
          const iso = isoDay(d)
          const dayItems = items.filter(i => i.scheduled_date === iso)
          const isToday = iso === today
          const past = iso < today
          return (
            <li key={iso} className={`flex gap-3 px-4 py-3 border-b border-borde last:border-0 ${isToday ? 'bg-mantequilla/40' : ''}`}>
              <div className={`w-12 flex-shrink-0 text-center ${past ? 'opacity-50' : ''}`}>
                <p className="text-[12px] font-semibold uppercase text-tinta-2">{dayName(d, { weekday: 'short' })}</p>
                <p className={`text-xl font-semibold leading-none mt-0.5 ${isToday ? 'text-cereza' : 'text-ink'}`}>{d.getDate()}</p>
                {isToday && <p className="text-[11px] font-semibold text-cereza mt-0.5">Hoy</p>}
              </div>
              <div className="flex-1 min-w-0 space-y-2 self-center">
                {dayItems.length === 0 && <p className="text-[14px] text-tinta-2/70">Libre</p>}
                {dayItems.map(it => {
                  const t = typeStyle(it.type)
                  const Icon = t.icon
                  const done = planStatus(it) === 'publicado'
                  return (
                    <div key={it.id} className={`flex flex-col items-start gap-2 rounded-xl px-3 py-2.5 ${done ? 'opacity-75' : ''}`} style={{ background: t.bg }}>
                      <button onClick={() => onOpen(it)} className="w-full min-w-0 text-left flex items-start gap-2.5">
                        <Icon size={17} style={{ color: t.color }} className="flex-shrink-0 mt-0.5" aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold" style={{ color: t.color }}>{t.label}{it.service ? ` · ${it.service}` : ''}</span>
                          <span className={`block text-[15px] font-medium text-ink leading-snug ${done ? 'line-through decoration-1' : ''}`}>{it.title}</span>
                        </span>
                      </button>
                      <span className="pl-[27px]"><StatusPill item={it} onStatus={onStatus} /></span>
                    </div>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
