'use client'
/**
 * LO QUE PUBLICAMOS (clientas del servicio, 24-oct-2026): el calendario que
 * prepara su equipo BRÄVE, semana a semana, con el estado de cada publicación.
 */
import Link from 'next/link'
import { CalendarDays, Clapperboard, Image as ImageIcon, Images, LayoutGrid, Send } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { ESTADO_PUB, TIPO_LABEL, groupByWeek, type Publicacion, type PubTipo } from '@/lib/equipo/types'

const ICON: Record<PubTipo, typeof Clapperboard> = { reel: Clapperboard, carrusel: Images, post: ImageIcon, story: LayoutGrid }
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
}
const weekLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((start.getTime() - today.getTime()) / 86_400_000)
  if (diff <= 0 && diff > -7) return 'Esta semana'
  if (diff > 0 && diff <= 7) return 'La semana que viene'
  return `Semana del ${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
}

// Solo en modo demo (local, sin cuenta): muestra cómo se verá.
const DEMO: Publicacion[] = (() => {
  const base = new Date(); const iso = (n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
  return [
    { id: '1', user_id: 'demo', fecha: iso(-2), tipo: 'reel', titulo: 'Antes y después: balayage caramelo', nota: null, estado: 'publicado' },
    { id: '2', user_id: 'demo', fecha: iso(1), tipo: 'carrusel', titulo: '5 errores que amarillean tu rubio', nota: 'Con tus fotos del martes', estado: 'listo' },
    { id: '3', user_id: 'demo', fecha: iso(3), tipo: 'reel', titulo: 'Tu rutina de mañana en el salón', nota: 'Necesitamos tu vídeo hablando a cámara', estado: 'preparando' },
    { id: '4', user_id: 'demo', fecha: iso(8), tipo: 'post', titulo: 'Testimonio de Laura', nota: null, estado: 'preparando' },
  ]
})()

export default function LoQuePublicamosClient({ pubs, demo, pendientes: aprobar = [], enlazada = true }: { pubs: Publicacion[] | null; demo?: boolean; pendientes?: Array<{ token: string; week: number; month: string }>; enlazada?: boolean }) {
  const items = demo ? DEMO : pubs ?? []
  const weeks = groupByWeek(items)
  const pendientes = items.filter(p => p.estado !== 'publicado').length

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Lo que publicamos" subtitle="Tu calendario: lo que tu equipo BRÄVE está preparando y publicando en tus redes." />
      {demo && <p className="rounded-2xl bg-warm-gray p-3 text-[13px] text-tinta-2">Modo demo: así se verá cuando tu equipo cargue tu calendario.</p>}
      {aprobar.map(p => (
        <a key={p.token} href={`/team/preview/${p.token}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-burdeos text-crema p-4 sm:p-5" data-tone="dark">
          <span><span className="block text-[13px] font-semibold text-mantequilla">Tu equipo espera tu visto bueno</span><span className="block text-[17px] font-semibold !text-crema">Planificación de la semana {p.week} · {p.month}</span></span>
          <span className="rounded-full bg-mantequilla text-burdeos px-4 py-2 text-[14px] font-semibold">Revisar y aprobar →</span>
        </a>
      ))}
      {!demo && !enlazada && <p className="rounded-2xl bg-warm-gray p-3 text-[13px] text-tinta-2">Tu equipo aún está enlazando tu cuenta con tu planificación. En cuanto lo haga, la verás aquí.</p>}

      {!items.length ? (
        <section className="card p-6 text-center space-y-3">
          <CalendarDays size={32} className="mx-auto text-cereza" aria-hidden />
          <p className="text-[18px] font-semibold text-ink">Tu equipo está preparando tu calendario</p>
          <p className="text-[15px] text-tinta-2 max-w-md mx-auto">En cuanto lo tenga, verás aquí qué se publica cada semana. Mientras, mándale fotos y vídeos de tus trabajos: es lo que más ayuda.</p>
          <Link href="/mi-equipo" className="btn-primary inline-flex"><Send size={16} aria-hidden /> Enviar material</Link>
        </section>
      ) : (
        <>
          <p className="text-[15px] text-ink">{pendientes ? <>Tu equipo tiene <strong>{pendientes}</strong> {pendientes === 1 ? 'publicación' : 'publicaciones'} en marcha.</> : 'Todo lo de estas semanas está publicado. 🎉'}</p>
          {weeks.map(w => (
            <section key={w.week} className="space-y-2" aria-label={weekLabel(w.week)}>
              <h2 className="text-[15px] font-semibold text-cereza">{weekLabel(w.week)}</h2>
              <ul className="space-y-2">
                {w.items.map(p => {
                  const Icon = ICON[p.tipo]
                  const st = ESTADO_PUB[p.estado]
                  return (
                    <li key={p.id} className="card p-4 flex gap-3 items-start">
                      <div className="w-14 flex-shrink-0 text-center">
                        <p className="text-[12px] uppercase tracking-wide text-tinta-2">{dayLabel(p.fecha).split(' ')[0]}</p>
                        <p className="text-[22px] font-semibold text-ink leading-none tabular-nums">{dayLabel(p.fecha).split(' ')[1]}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-tinta-2 flex items-center gap-1.5"><Icon size={14} aria-hidden /> {TIPO_LABEL[p.tipo]}</p>
                        <p className="text-[16px] font-semibold text-ink leading-snug">{p.titulo}</p>
                        {p.nota && <p className="text-[14px] text-tinta-2 mt-0.5">{p.nota}</p>}
                        <span className={`inline-block mt-2 rounded-full px-3 py-1 text-[12px] font-semibold ${st.tone}`}>{st.label}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          <div className="rounded-2xl bg-rosa/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-burdeos">¿Tienes fotos o vídeos nuevos? Tu equipo los usa en tus próximas publicaciones.</p>
            <Link href="/mi-equipo" className="btn-primary"><Send size={16} aria-hidden /> Enviar material</Link>
          </div>
        </>
      )}
    </div>
  )
}
