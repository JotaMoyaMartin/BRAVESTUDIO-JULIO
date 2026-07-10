'use client'

import { useState, useEffect } from 'react'
import { Film, LayoutGrid, FileText, Star, Rocket, Calendar, Library, Heart, Activity, Clock, Flame, CheckCircle } from 'lucide-react'
import Badge from '@/components/ui/Badge'

interface UsageData {
  summary: {
    totalContent: number
    totalPublished: number
    totalScheduled: number
    totalSaves: number
    activeDays: number
    streak: number
    firstActivity: string | null
    lastActivity: string | null
    lastVisitedSection: string | null
  }
  calendar30: Array<{ date: string; total: number; content: number; saves: number; events: number }>
  typeBreakdown: { reel: number; carrusel: number; story: number }
  statusBreakdown: { library: number; scheduled: number; done: number; draft: number }
  sectionUsage: Array<{ section: string; label: string; count: number }>
  recentItems: Array<{
    id: string
    type: string
    status: string
    tag: string | null
    title: string
    service: string | null
    retoStatus: string | null
    createdAt: string
    doneAt: string | null
  }>
  recentSaves: Array<{ type: 'inspiracion' | 'transicion'; title: string; date: string }>
  reto: {
    status: string
    currentDay: number
    currentPhase: string
    startedAt: string | null
    completedAt: string | null
    postsPerWeek: number
    objective: string
    retoContentCount: number
    retoPublished: number
  } | null
  brand: {
    completionStatus: string
    hasStrategy: boolean
    createdAt: string
    updatedAt: string
    salonName: string
    city: string
  } | null
  recentEvents: Array<{ eventType: string; date: string }>
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'crear-contenido': <Film size={12} />,
  'stories': <Activity size={12} />,
  'reto-10k': <Rocket size={12} />,
  'calendario': <Calendar size={12} />,
  'biblioteca': <Library size={12} />,
  'inspiracion-reels': <Heart size={12} />,
  'transiciones-reels': <Heart size={12} />,
  'plan-contenidos': <FileText size={12} />,
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  reel: <Film size={12} />,
  carrusel: <LayoutGrid size={12} />,
  story: <Activity size={12} />,
}

const STATUS_LABELS: Record<string, { label: string; tone: 'green' | 'cherry' | 'buttermilk' | 'neutral' }> = {
  done: { label: 'Publicado', tone: 'green' },
  scheduled: { label: 'Programado', tone: 'cherry' },
  library: { label: 'Biblioteca', tone: 'buttermilk' },
  draft: { label: 'Borrador', tone: 'neutral' },
}

const SECTION_LABELS: Record<string, string> = {
  'inicio': 'Inicio',
  'planificar': 'Planificación',
  'crear-contenido': 'Crear Contenido',
  'mi-marca': 'Mi Marca',
  'biblioteca': 'Biblioteca',
  'calendario': 'Calendario',
  'stories': 'Stories',
  'inspiracion-reels': 'Inspiración Reels',
  'transiciones-reels': 'Transiciones Reels',
  'reto-10k': 'Reto 10K',
  'mi-estrategia': 'Mi Estrategia',
  'plan-contenidos': 'Plan de Contenidos',
}

export default function UserUsageDetail({ userId }: { userId: string }) {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/users/${userId}/usage`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  if (loading) {
    return <p className="text-xs text-cherry-dark opacity-50">Cargando uso detallado…</p>
  }
  if (!data) {
    return <p className="text-xs text-cherry-dark opacity-50">No se pudo cargar el detalle de uso.</p>
  }

  const s = data.summary
  const maxSectionCount = Math.max(...data.sectionUsage.map(sec => sec.count), 1)

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmtDateTime(d: string) {
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  // Calendar: build weeks (columns = days, we show 30 days as a grid)
  const calendar = data.calendar30
  const maxDayTotal = Math.max(...calendar.map(d => d.total), 1)

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Contenidos" value={s.totalContent} icon={<Film size={14} />} />
        <StatBox label="Publicados" value={s.totalPublished} icon={<CheckCircle size={14} />} tone="green" />
        <StatBox label="Guardados" value={s.totalSaves} icon={<Heart size={14} />} tone="cherry" />
        <StatBox label="Días activa" value={s.activeDays} icon={<Calendar size={14} />} />
        <StatBox label="Racha actual" value={s.streak} icon={<Flame size={14} />} tone="cherry" />
        <StatBox label="Programados" value={s.totalScheduled} icon={<Clock size={14} />} tone="buttermilk" />
      </div>

      {/* First/Last activity + last section */}
      <div className="rounded-[var(--radius-sm)] bg-cream p-3 border border-soft space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-cherry-dark opacity-60">Primera actividad</span>
          <span className="font-medium text-cherry-dark">{fmtDate(s.firstActivity)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-cherry-dark opacity-60">Última actividad</span>
          <span className="font-medium text-cherry-dark">{fmtDate(s.lastActivity)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-cherry-dark opacity-60">Últ. sección visitada</span>
          <span className="font-medium text-cherry-dark">{s.lastVisitedSection ? SECTION_LABELS[s.lastVisitedSection] || s.lastVisitedSection : '—'}</span>
        </div>
      </div>

      {/* Activity calendar (last 30 days) */}
      <div>
        <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Actividad últimos 30 días</p>
        <div className="grid grid-cols-15 gap-1" style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}>
          {calendar.map((day, i) => {
            const intensity = day.total === 0 ? 0 : Math.ceil((day.total / maxDayTotal) * 4)
            const bg = intensity === 0
              ? 'rgba(122,24,50,0.06)'
              : intensity === 1
              ? 'rgba(122,24,50,0.2)'
              : intensity === 2
              ? 'rgba(122,24,50,0.4)'
              : intensity === 3
              ? 'rgba(122,24,50,0.65)'
              : 'var(--color-cherry)'
            return (
              <div
                key={i}
                title={`${new Date(day.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${day.total} acciones`}
                className="aspect-square rounded-[3px]"
                style={{ background: bg }}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-cherry-dark opacity-50">
          <span>Menos</span>
          <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'rgba(122,24,50,0.06)' }} />
          <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'rgba(122,24,50,0.2)' }} />
          <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'rgba(122,24,50,0.4)' }} />
          <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'rgba(122,24,50,0.65)' }} />
          <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--color-cherry)' }} />
          <span>Más</span>
        </div>
      </div>

      {/* Section usage for this user */}
      <div>
        <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Secciones que usa</p>
        <div className="space-y-2">
          {data.sectionUsage.filter(sec => sec.count > 0).length === 0 ? (
            <p className="text-xs text-cherry-dark opacity-40">Sin uso registrado todavía.</p>
          ) : (
            data.sectionUsage.filter(sec => sec.count > 0).map(sec => (
              <div key={sec.section}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-cherry-dark flex items-center gap-1.5">
                    {SECTION_ICONS[sec.section]} {sec.label}
                  </span>
                  <span className="text-xs font-semibold text-cherry-dark opacity-70">{sec.count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(122,24,50,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(sec.count / maxSectionCount) * 100}%`, background: 'var(--color-cherry)' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Type + Status breakdowns */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Por tipo</p>
          <div className="space-y-1.5">
            {([
              { label: 'Reels', value: data.typeBreakdown.reel },
              { label: 'Carruseles', value: data.typeBreakdown.carrusel },
              { label: 'Stories', value: data.typeBreakdown.story },
            ]).map(t => {
              const max = Math.max(data.typeBreakdown.reel, data.typeBreakdown.carrusel, data.typeBreakdown.story, 1)
              return (
                <div key={t.label}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-cherry-dark">{t.label}</span>
                    <span className="font-semibold text-cherry-dark">{t.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(122,24,50,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(t.value / max) * 100}%`, background: 'var(--color-cherry)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Por estado</p>
          <div className="space-y-1.5">
            {([
              { label: 'Biblioteca', value: data.statusBreakdown.library },
              { label: 'Programado', value: data.statusBreakdown.scheduled },
              { label: 'Publicado', value: data.statusBreakdown.done },
              { label: 'Borrador', value: data.statusBreakdown.draft },
            ]).map(t => {
              const max = Math.max(data.statusBreakdown.library, data.statusBreakdown.scheduled, data.statusBreakdown.done, data.statusBreakdown.draft, 1)
              return (
                <div key={t.label}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-cherry-dark">{t.label}</span>
                    <span className="font-semibold text-cherry-dark">{t.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(122,24,50,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(t.value / max) * 100}%`, background: 'var(--color-cherry-dark)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Reto 10K detail */}
      {data.reto && (
        <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--color-buttermilk)', border: '1px solid rgba(122,24,50,0.1)' }}>
          <p className="text-xs font-bold text-cherry-dark mb-2 flex items-center gap-1.5">
            <Rocket size={12} /> Reto 10K
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-cherry-dark opacity-60">Estado:</span> <span className="font-medium text-cherry-dark">{data.reto.status}</span></div>
            <div><span className="text-cherry-dark opacity-60">Día:</span> <span className="font-medium text-cherry-dark">{data.reto.currentDay}/30</span></div>
            <div><span className="text-cherry-dark opacity-60">Fase:</span> <span className="font-medium text-cherry-dark">{data.reto.currentPhase}</span></div>
            <div><span className="text-cherry-dark opacity-60">Posts/sem:</span> <span className="font-medium text-cherry-dark">{data.reto.postsPerWeek}</span></div>
            <div><span className="text-cherry-dark opacity-60">Contenidos:</span> <span className="font-medium text-cherry-dark">{data.reto.retoContentCount}</span></div>
            <div><span className="text-cherry-dark opacity-60">Publicados:</span> <span className="font-medium text-cherry-dark">{data.reto.retoPublished}</span></div>
            {data.reto.startedAt && (
              <div className="col-span-2"><span className="text-cherry-dark opacity-60">Empezó:</span> <span className="font-medium text-cherry-dark">{fmtDate(data.reto.startedAt)}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Mi Marca detail */}
      {data.brand && (
        <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--color-buttermilk)', border: '1px solid rgba(122,24,50,0.1)' }}>
          <p className="text-xs font-bold text-cherry-dark mb-2 flex items-center gap-1.5">
            <Star size={12} /> Mi Marca
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-cherry-dark opacity-60">Estado:</span>{' '}
              {data.brand.completionStatus === 'complete'
                ? <Badge tone="green">Completa</Badge>
                : data.brand.completionStatus === 'partial'
                ? <Badge tone="buttermilk">Parcial</Badge>
                : <Badge tone="neutral">Vacía</Badge>}
            </div>
            {data.brand.hasStrategy && <div><span className="text-cherry-dark opacity-60">Estrategia:</span> <Badge tone="cherry">Sí</Badge></div>}
            <div><span className="text-cherry-dark opacity-60">Actualizada:</span> <span className="font-medium text-cherry-dark">{fmtDate(data.brand.updatedAt)}</span></div>
            {data.brand.salonName && <div className="col-span-2"><span className="text-cherry-dark opacity-60">Salón:</span> <span className="font-medium text-cherry-dark">{data.brand.salonName}</span></div>}
          </div>
        </div>
      )}

      {/* Recent content items */}
      {data.recentItems.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Contenido reciente</p>
          <div className="space-y-1.5">
            {data.recentItems.map(item => {
              const st = STATUS_LABELS[item.status] || { label: item.status, tone: 'neutral' as const }
              return (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)] bg-cream">
                  {TYPE_ICONS[item.type] || <FileText size={12} />}
                  <span className="flex-1 text-xs font-medium text-cherry-dark truncate">{item.title}</span>
                  {item.tag === 'reto-10k' && <Badge tone="cherry">Reto</Badge>}
                  {item.tag === 'premium-script' && <Badge tone="buttermilk">Premium</Badge>}
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <span className="text-[10px] text-cherry-dark opacity-40 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent saves */}
      {data.recentSaves.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Guardados recientes</p>
          <div className="space-y-1.5">
            {data.recentSaves.map((save, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)] bg-cream">
                <Heart size={12} className="text-cherry" />
                <span className="flex-1 text-xs font-medium text-cherry-dark truncate">{save.title}</span>
                <Badge tone={save.type === 'inspiracion' ? 'buttermilk' : 'blue'}>{save.type === 'inspiracion' ? 'Inspiración' : 'Transición'}</Badge>
                <span className="text-[10px] text-cherry-dark opacity-40 whitespace-nowrap">
                  {new Date(save.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, icon, tone = 'neutral' }: { label: string; value: number; icon: React.ReactNode; tone?: 'neutral' | 'green' | 'cherry' | 'buttermilk' }) {
  const colors = {
    neutral: { bg: 'rgba(122,24,50,0.06)', color: 'var(--color-cherry-dark)' },
    green: { bg: 'var(--color-pastel-green)', color: '#2a5a2a' },
    cherry: { bg: 'rgba(122,24,50,0.1)', color: 'var(--color-cherry)' },
    buttermilk: { bg: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' },
  }
  const c = colors[tone]
  return (
    <div className="rounded-[var(--radius-sm)] p-2.5 text-center" style={{ background: c.bg }}>
      <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color: c.color }}>{icon}</div>
      <p className="text-lg font-bold" style={{ color: c.color }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-60" style={{ color: c.color }}>{label}</p>
    </div>
  )
}