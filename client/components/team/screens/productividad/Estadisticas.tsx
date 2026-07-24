'use client'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useState } from 'react'
import type { DailyStats, ProductivityTask, Project, FocusSession } from '@/lib/team/types'
import { BarChart3, CheckCheck, Target, Timer, AlertCircle, TrendingUp, CalendarDays, Sparkles, Loader2 } from 'lucide-react'

interface EstadisticasProps {
  dailyStats: DailyStats[]
  tasks: ProductivityTask[]
  projects: Project[]
  focusSessions: FocusSession[]
  onGenerateAISummary: () => Promise<string>
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
      <div className="text-[13px] font-semibold mb-3 text-[#1a1a1a]">{title}</div>
      {children}
    </div>
  )
}

function KPI({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: color + '20' }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-[11.5px] text-[#8a8680]">{label}</span>
      </div>
      <div className="text-[22px] font-bold text-[#1a1a1a]">{value}</div>
    </div>
  )
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Estadisticas({ dailyStats, tasks, projects, focusSessions, onGenerateAISummary }: EstadisticasProps) {
  const [tab, setTab] = useState<'diario' | 'semanal'>('diario')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSummary() {
    setLoading(true)
    setSummary('')
    try {
      const reply = await onGenerateAISummary()
      setSummary(reply)
    } catch {
      setSummary('No se pudo generar el resumen. Intentalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Daily data for charts
  const dailyChartData = dailyStats.map(d => ({
    fecha: fmtDate(d.date),
    completadas: d.completedCount,
    foco: d.focusMinutes,
    interrupciones: d.interruptions,
  }))

  // Today stats (last element)
  const today: DailyStats = dailyStats.length > 0
    ? dailyStats[dailyStats.length - 1]
    : { date: new Date().toISOString().slice(0, 10), completedCount: 0, prioritiesMet: 0, focusMinutes: 0, interruptions: 0, postponedCount: 0 }

  // Weekly aggregates
  const totalCompleted = dailyStats.reduce((sum, d) => sum + d.completedCount, 0)
  const totalFocusMin = dailyStats.reduce((sum, d) => sum + d.focusMinutes, 0)
  const totalPostponed = dailyStats.reduce((sum, d) => sum + d.postponedCount, 0)
  const totalPrioritiesMet = dailyStats.reduce((sum, d) => sum + d.prioritiesMet, 0)
  const mostProductiveDay = dailyStats.length > 0
    ? dailyStats.reduce((best, d) => (d.completedCount > best.completedCount ? d : best), dailyStats[0])
    : null

  // Projects with at least 1 done task
  const doneTaskProjectIds = new Set(
    tasks.filter(t => t.column === 'hecho').map(t => t.projectId)
  )
  const projectsAdvanced = projects.filter(p => doneTaskProjectIds.has(p.id)).length

  // Priority percentage: done alta-priority / total alta-priority
  const altaPriorityTasks = tasks.filter(t => t.priority === 'alta')
  const altaPriorityDone = altaPriorityTasks.filter(t => t.column === 'hecho').length
  const prioritiesPct = altaPriorityTasks.length > 0
    ? Math.round((altaPriorityDone / altaPriorityTasks.length) * 100)
    : 0

  // Estimado vs Real por proyecto
  const projectEstRealData = projects.map(p => {
    const projectTasks = tasks.filter(t => t.projectId === p.id)
    const estimado = projectTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0)
    const real = projectTasks.reduce((sum, t) => sum + t.actualMinutes, 0)
    return { name: p.name, estimado, real }
  }).filter(d => d.estimado > 0 || d.real > 0)

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#FFF1B5]">
        <button
          onClick={() => setTab('diario')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            tab === 'diario'
              ? 'bg-[#FFF1B5] text-[#7A1832] border-b-2 border-[#7A1832]'
              : 'text-[#8a8680] border-b-2 border-transparent hover:text-[#1a1a1a]'
          }`}
        >
          Diario
        </button>
        <button
          onClick={() => setTab('semanal')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            tab === 'semanal'
              ? 'bg-[#FFF1B5] text-[#7A1832] border-b-2 border-[#7A1832]'
              : 'text-[#8a8680] border-b-2 border-transparent hover:text-[#1a1a1a]'
          }`}
        >
          Semanal
        </button>
      </div>

      {/* Diario tab */}
      {tab === 'diario' && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI icon={<CheckCheck size={14} />} label="Completadas hoy" value={today.completedCount} color="#2f9e44" />
            <KPI icon={<Target size={14} />} label="Prioridades cumplidas" value={today.prioritiesMet} color="#7A1832" />
            <KPI icon={<Timer size={14} />} label="Tiempo foco min" value={today.focusMinutes} color="#f08c00" />
            <KPI icon={<AlertCircle size={14} />} label="Interrupciones" value={today.interruptions} color="#e03131" />
          </div>

          {/* Charts */}
          <div className="space-y-4">
            <ChartCard title="Tareas completadas por dia">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completadas" name="Completadas" fill="#7A1832" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Minutos de foco por dia">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="foco" name="Foco (min)" stroke="#7A1832" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Interrupciones por dia">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="interrupciones" name="Interrupciones" fill="#e03131" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* Semanal tab */}
      {tab === 'semanal' && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KPI icon={<CheckCheck size={14} />} label="Total completadas" value={totalCompleted} color="#2f9e44" />
            <KPI icon={<Timer size={14} />} label="Horas foco" value={`${Math.round(totalFocusMin / 60)}h`} color="#f08c00" />
            <KPI
              icon={<TrendingUp size={14} />}
              label="Dia mas productivo"
              value={mostProductiveDay ? fmtDate(mostProductiveDay.date) : '—'}
              color="#7A1832"
            />
            <KPI icon={<BarChart3 size={14} />} label="Proyectos avanzados" value={projectsAdvanced} color="#7A1832" />
            <KPI icon={<AlertCircle size={14} />} label="Aplazadas" value={totalPostponed} color="#e03131" />
            <KPI icon={<Target size={14} />} label="% Prioridades" value={`${prioritiesPct}%`} color="#7A1832" />
          </div>

          {/* Charts */}
          <div className="space-y-4">
            <ChartCard title="Completadas por dia">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completadas" name="Completadas" fill="#7A1832" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {projectEstRealData.length > 0 && (
              <ChartCard title="Estimado vs Real por proyecto">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projectEstRealData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="estimado" name="Estimado" fill="#C1DBE8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="real" name="Real" fill="#7A1832" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* AI summary card */}
            <div className="bg-gradient-to-br from-[#FFF1B5] to-[#A04060] rounded-xl border border-[#C1DBE8] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-white" />
                <h3 className="text-[14px] font-semibold text-white">Resumen IA</h3>
              </div>

              {!summary && !loading && (
                <button
                  onClick={handleSummary}
                  className="bg-white text-[#7A1832] text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-[#FFFDF5] transition-colors"
                >
                  Generar resumen
                </button>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-white text-[13px]">
                  <Loader2 size={14} className="animate-spin" /> Generando resumen...
                </div>
              )}

              {summary && !loading && (
                <div className="space-y-2">
                  <p className="text-[13px] text-[#1a1a1a] whitespace-pre-wrap bg-white/90 rounded-lg p-3">
                    {summary}
                  </p>
                  <button
                    onClick={handleSummary}
                    className="bg-white/20 text-white text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    Regenerar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}