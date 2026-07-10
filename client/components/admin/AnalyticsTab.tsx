'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Film, Users, TrendingUp, Star, Rocket,
  Lightbulb, Trophy, Heart, Activity, Calendar, Library,
  CheckCircle, Clock, ArrowUpDown, Crown, Sparkles
} from 'lucide-react'
import { Profile } from '@/types/database'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import UserDrawer from './UserDrawer'

interface Props {
  users: Profile[]
  onUserUpdate: (user: Profile) => void
}

interface AnalyticsData {
  global: {
    totalContent: number
    totalUsers: number
    activeUsers7d: number
    activeUsers30d: number
    avgContentPerUser: number
    brandCompletionRate: number
    retoParticipationRate: number
    totalSaves: number
    totalPublished: number
  }
  userRanking: Array<{
    userId: string
    email: string
    fullName: string
    role: string
    contentCount: number
    publishedCount: number
    scheduledCount: number
    lastActivity: string | null
    retoDay: number
    retoStatus: string
    brandComplete: boolean
    savesCount: number
    contentByType: { reel: number; carrusel: number; story: number }
    activityScore: number
  }>
  sectionUsage: Array<{
    section: string
    label: string
    users: number
    totalActions: number
    percentage: number
  }>
  contentTrends: Array<{ date: string; count: number }>
  typeBreakdown: { reel: number; carrusel: number; story: number }
  statusBreakdown: { library: number; scheduled: number; done: number; draft: number }
  retoStats: {
    participants: number
    active: number
    completed: number
    paused: number
    avgDay: number
    totalContent: number
    byPhase: Record<string, number>
  }
  eventCounts: Array<{ eventType: string; count: number }>
  topInspirations: Array<{ id: string; title: string; saves: number }>
  topTransitions: Array<{ id: string; title: string; saves: number }>
  insights: string[]
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'crear-contenido': <Film size={14} />,
  'stories': <Sparkles size={14} />,
  'mi-marca': <Star size={14} />,
  'reto-10k': <Rocket size={14} />,
  'inspiracion-reels': <Heart size={14} />,
  'transiciones-reels': <Activity size={14} />,
  'calendario': <Calendar size={14} />,
  'biblioteca': <Library size={14} />,
  'mi-estrategia': <Trophy size={14} />,
  'plan-contenidos': <CheckCircle size={14} />,
}

const ROLE_BADGE: Record<string, { tone: 'cherry' | 'buttermilk' | 'blue' | 'neutral'; label: string }> = {
  premium: { tone: 'buttermilk', label: 'Premium' },
  admin: { tone: 'cherry', label: 'Admin' },
  superadmin: { tone: 'cherry', label: 'Super' },
  user: { tone: 'neutral', label: 'User' },
}

export default function AnalyticsTab({ users, onUserUpdate }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [sortBy, setSortBy] = useState<'activityScore' | 'contentCount' | 'publishedCount' | 'savesCount'>('activityScore')

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[var(--radius-md)] bg-white border border-soft animate-pulse" style={{ opacity: 0.4 }} />
          ))}
        </div>
        <div className="h-64 rounded-[var(--radius-md)] bg-white border border-soft animate-pulse" style={{ opacity: 0.3 }} />
        <div className="h-96 rounded-[var(--radius-md)] bg-white border border-soft animate-pulse" style={{ opacity: 0.2 }} />
      </div>
    )
  }

  if (error || !data) {
    return <Card padding="md"><p className="text-sm text-danger">{error || 'No se pudieron cargar las analíticas'}</p></Card>
  }

  const g = data.global
  const maxScore = Math.max(...data.userRanking.map(u => u.activityScore), 1)

  const sortedRanking = [...data.userRanking].sort((a, b) => {
    if (sortBy === 'contentCount') return b.contentCount - a.contentCount
    if (sortBy === 'publishedCount') return b.publishedCount - a.publishedCount
    if (sortBy === 'savesCount') return b.savesCount - a.savesCount
    return b.activityScore - a.activityScore
  })

  function findProfile(userId: string): Profile | null {
    const p = users.find(u => u.id === userId)
    return p || null
  }

  const kpis = [
    { label: 'Contenido total', value: g.totalContent, icon: <Film size={18} />, tone: 'cherry' as const },
    { label: 'Activas 7 días', value: g.activeUsers7d, icon: <TrendingUp size={18} />, tone: 'green' as const },
    { label: 'Promedio/usuaria', value: g.avgContentPerUser, icon: <BarChart3 size={18} />, tone: 'blue' as const },
    { label: 'Marca completa', value: `${g.brandCompletionRate}%`, icon: <Star size={18} />, tone: 'buttermilk' as const },
    { label: 'Participación Reto', value: `${g.retoParticipationRate}%`, icon: <Rocket size={18} />, tone: 'cherry' as const },
    { label: 'Publicados', value: g.totalPublished, icon: <CheckCircle size={18} />, tone: 'green' as const },
  ]

  return (
    <div className="space-y-8">
      {/* 1. KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}>
            <Card padding="md" shadow="soft" className="h-full">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60">{kpi.label}</p>
                  <p className="text-2xl font-bold text-cherry-dark mt-1">{kpi.value}</p>
                </div>
                <span className="text-cherry">{kpi.icon}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 2. Insights */}
      {data.insights.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-cherry-dark mb-3 flex items-center gap-2">
            <Lightbulb size={16} className="text-cherry" /> Insights automáticos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.insights.map((insight, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)]" style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.1)' }}>
                  <Lightbulb size={16} className="text-cherry flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-cherry-dark" style={{ lineHeight: 1.5 }}>{insight}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Ranking de usuarias */}
      <div>
        <h3 className="text-sm font-bold text-cherry-dark mb-3 flex items-center gap-2">
          <Trophy size={16} className="text-cherry" /> Ranking de usuarias
        </h3>
        <Card padding="none" shadow="soft" className="overflow-hidden">
          {/* Sort buttons */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-soft">
            <span className="text-xs text-cherry-dark opacity-60 flex items-center gap-1"><ArrowUpDown size={12} /> Ordenar por:</span>
            {(['activityScore', 'contentCount', 'publishedCount', 'savesCount'] as const).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: sortBy === key ? 'var(--color-cherry)' : 'rgba(122,24,50,0.06)',
                  color: sortBy === key ? 'white' : 'var(--color-cherry-dark)',
                }}
              >
                {key === 'activityScore' ? 'Score' : key === 'contentCount' ? 'Contenidos' : key === 'publishedCount' ? 'Publicados' : 'Guardados'}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-cherry-dark opacity-50">
                  <th className="px-4 py-2 font-semibold">#</th>
                  <th className="px-4 py-2 font-semibold">Usuaria</th>
                  <th className="px-4 py-2 font-semibold text-center">Contenidos</th>
                  <th className="px-4 py-2 font-semibold text-center">Publicados</th>
                  <th className="px-4 py-2 font-semibold text-center">Reto</th>
                  <th className="px-4 py-2 font-semibold text-center">Marca</th>
                  <th className="px-4 py-2 font-semibold text-center">Guardados</th>
                  <th className="px-4 py-2 font-semibold text-center">Últ. actividad</th>
                  <th className="px-4 py-2 font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y border-soft">
                {sortedRanking.slice(0, 30).map((u, i) => {
                  const profile = findProfile(u.userId)
                  const roleBadge = ROLE_BADGE[u.role] || ROLE_BADGE.user
                  return (
                    <tr
                      key={u.userId}
                      onClick={() => profile && setSelectedUser(profile)}
                      className="cursor-pointer hover:bg-[rgba(122,24,50,0.03)] transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-cherry-dark opacity-50">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-cherry-dark truncate">{u.fullName || '—'}</p>
                            <p className="text-xs text-cherry-dark opacity-50 truncate">{u.email}</p>
                          </div>
                          <Badge tone={roleBadge.tone}>{roleBadge.label}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-cherry-dark">{u.contentCount}</td>
                      <td className="px-4 py-3 text-center text-cherry-dark">{u.publishedCount}</td>
                      <td className="px-4 py-3 text-center text-cherry-dark">
                        {u.retoStatus === 'active' ? `${u.retoDay}d` : u.retoStatus === 'completed' ? '✓' : u.retoStatus === 'paused' ? '⏸' : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">{u.brandComplete ? <CheckCircle size={14} className="text-green-600 mx-auto" /> : <span className="text-cherry-dark opacity-30">—</span>}</td>
                      <td className="px-4 py-3 text-center text-cherry-dark">{u.savesCount}</td>
                      <td className="px-4 py-3 text-center text-xs text-cherry-dark opacity-60 whitespace-nowrap">
                        {u.lastActivity ? new Date(u.lastActivity).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[60px] h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(122,24,50,0.1)' }}>
                            <div className="h-full rounded-full" style={{ width: `${(u.activityScore / maxScore) * 100}%`, background: 'linear-gradient(90deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }} />
                          </div>
                          <span className="text-xs font-bold text-cherry-dark whitespace-nowrap">{u.activityScore}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {data.userRanking.length > 30 && (
            <p className="px-4 py-3 text-xs text-center text-cherry-dark opacity-50 border-t border-soft">
              Mostrando top 30 de {data.userRanking.length} usuarias
            </p>
          )}
        </Card>
      </div>

      {/* 4. Uso por apartado */}
      <div>
        <h3 className="text-sm font-bold text-cherry-dark mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-cherry" /> Uso por apartado
        </h3>
        <Card padding="md" shadow="soft">
          <div className="space-y-3">
            {data.sectionUsage.map(s => (
              <div key={s.section}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-cherry-dark flex items-center gap-2">
                    {SECTION_ICONS[s.section]} {s.label}
                  </span>
                  <span className="text-xs text-cherry-dark opacity-60">
                    {s.users} usuarias · {s.totalActions} acciones
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(122,24,50,0.08)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 5. Tendencia de creación (30 días) */}
      <div>
        <h3 className="text-sm font-bold text-cherry-dark mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-cherry" /> Tendencia de creación (30 días)
        </h3>
        <Card padding="md" shadow="soft">
          <TrendChart data={data.contentTrends} />
        </Card>
      </div>

      {/* 6 & 7. Tipos + Estados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-cherry-dark mb-3">Tipos de contenido</h3>
          <Card padding="md" shadow="soft">
            <BreakdownBars
              items={[
                { label: 'Reels', value: data.typeBreakdown.reel, color: 'var(--color-cherry)' },
                { label: 'Carruseles', value: data.typeBreakdown.carrusel, color: 'var(--color-cherry-dark)' },
                { label: 'Stories', value: data.typeBreakdown.story, color: 'var(--color-warm-light)' },
              ]}
            />
          </Card>
        </div>
        <div>
          <h3 className="text-sm font-bold text-cherry-dark mb-3">Estados de contenido</h3>
          <Card padding="md" shadow="soft">
            <BreakdownBars
              items={[
                { label: 'Biblioteca', value: data.statusBreakdown.library, color: 'var(--color-cherry)' },
                { label: 'Programado', value: data.statusBreakdown.scheduled, color: '#c9a227' },
                { label: 'Publicado', value: data.statusBreakdown.done, color: '#2a7a2a' },
                { label: 'Borrador', value: data.statusBreakdown.draft, color: 'rgba(122,24,50,0.3)' },
              ]}
            />
          </Card>
        </div>
      </div>

      {/* 8. Reto 10K */}
      <div>
        <h3 className="text-sm font-bold text-cherry-dark mb-3 flex items-center gap-2">
          <Rocket size={16} className="text-cherry" /> Reto 10K
        </h3>
        <Card padding="md" shadow="soft">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <RetoStat label="Participantes" value={data.retoStats.participants} />
            <RetoStat label="Activas" value={data.retoStats.active} tone="green" />
            <RetoStat label="Completadas" value={data.retoStats.completed} tone="cherry" />
            <RetoStat label="En pausa" value={data.retoStats.paused} tone="buttermilk" />
            <RetoStat label="Día promedio" value={data.retoStats.avgDay} />
            <RetoStat label="Contenidos del reto" value={data.retoStats.totalContent} />
          </div>
          {Object.keys(data.retoStats.byPhase).length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2">Distribución por fase</p>
              <BreakdownBars
                items={Object.entries(data.retoStats.byPhase).map(([phase, count], i) => ({
                  label: phase,
                  value: count,
                  color: i === 0 ? 'var(--color-cherry)' : i === 1 ? 'var(--color-cherry-dark)' : 'var(--color-warm-light)',
                }))}
              />
            </div>
          )}
        </Card>
      </div>

      {/* 9. Top guardadas */}
      {(data.topInspirations.length > 0 || data.topTransitions.length > 0) && (
        <div>
          <h3 className="text-sm font-bold text-cherry-dark mb-3 flex items-center gap-2">
            <Heart size={16} className="text-cherry" /> Lo que más gusta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="md" shadow="soft">
              <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-3">Inspiraciones más guardadas</p>
              {data.topInspirations.length === 0 ? (
                <p className="text-sm text-cherry-dark opacity-40">Aún no hay guardadas</p>
              ) : (
                <div className="space-y-2">
                  {data.topInspirations.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-buttermilk)' }}>
                      <span className="text-xs font-bold text-cherry w-5">{i + 1}.</span>
                      <span className="flex-1 text-sm font-medium text-cherry-dark truncate">{item.title}</span>
                      <Badge tone="cherry"><Heart size={10} className="mr-1" /> {item.saves}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card padding="md" shadow="soft">
              <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-3">Transiciones más guardadas</p>
              {data.topTransitions.length === 0 ? (
                <p className="text-sm text-cherry-dark opacity-40">Aún no hay guardadas</p>
              ) : (
                <div className="space-y-2">
                  {data.topTransitions.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-buttermilk)' }}>
                      <span className="text-xs font-bold text-cherry w-5">{i + 1}.</span>
                      <span className="flex-1 text-sm font-medium text-cherry-dark truncate">{item.title}</span>
                      <Badge tone="cherry"><Heart size={10} className="mr-1" /> {item.saves}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* 10. Eventos recientes */}
      {data.eventCounts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-cherry-dark mb-3 flex items-center gap-2">
            <Activity size={16} className="text-cherry" /> Eventos (últimos 30 días)
          </h3>
          <Card padding="md" shadow="soft">
            <BreakdownBars
              items={data.eventCounts.map((e, i) => ({
                label: e.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                value: e.count,
                color: i === 0 ? 'var(--color-cherry)' : i === 1 ? 'var(--color-cherry-dark)' : 'var(--color-warm-light)',
              }))}
            />
          </Card>
        </div>
      )}

      {/* UserDrawer */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={onUserUpdate}
        />
      )}
    </div>
  )
}

// --- TrendChart: SVG area chart ---
function TrendChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const width = 600
  const height = 160
  const padding = { top: 10, right: 10, bottom: 24, left: 10 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const stepX = innerW / Math.max(data.length - 1, 1)

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.count / maxCount) * innerH,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padding.top + innerH} L ${points[0].x.toFixed(1)} ${padding.top + innerH} Z`

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 400 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cherry)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-cherry)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={padding.left} y1={padding.top + innerH * t} x2={padding.left + innerW} y2={padding.top + innerH * t} stroke="rgba(122,24,50,0.06)" strokeWidth="1" />
        ))}
        {/* Area */}
        <path d={areaD} fill="url(#trendGrad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--color-cherry)" strokeWidth="2" strokeLinejoin="round" />
        {/* Dots on days with content */}
        {points.filter((_, i) => data[i].count > 0).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-cherry)" />
        ))}
        {/* X labels: first, middle, last */}
        {[0, Math.floor(data.length / 2), data.length - 1].map(idx => (
          <text key={idx} x={points[idx].x} y={height - 6} textAnchor="middle" fontSize="9" fill="var(--color-cherry-dark)" opacity="0.5">
            {new Date(data[idx].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </text>
        ))}
      </svg>
    </div>
  )
}

// --- BreakdownBars ---
function BreakdownBars({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...items.map(i => i.value), 1)
  if (items.every(i => i.value === 0)) {
    return <p className="text-sm text-cherry-dark opacity-40">Sin datos</p>
  }
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-cherry-dark">{item.label}</span>
            <span className="text-xs font-semibold text-cherry-dark opacity-70">{item.value}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(122,24,50,0.08)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// --- RetoStat ---
function RetoStat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'green' | 'cherry' | 'buttermilk' }) {
  const colors = {
    neutral: { bg: 'rgba(122,24,50,0.06)', color: 'var(--color-cherry-dark)' },
    green: { bg: 'var(--color-pastel-green)', color: '#2a5a2a' },
    cherry: { bg: 'rgba(122,24,50,0.1)', color: 'var(--color-cherry)' },
    buttermilk: { bg: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' },
  }
  const c = colors[tone]
  return (
    <div className="rounded-[var(--radius-sm)] p-3" style={{ background: c.bg }}>
      <p className="text-xs uppercase tracking-wide opacity-60" style={{ color: c.color }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: c.color }}>{value}</p>
    </div>
  )
}