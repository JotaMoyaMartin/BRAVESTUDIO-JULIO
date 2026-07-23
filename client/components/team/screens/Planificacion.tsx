'use client'
import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS, TEAM } from '@/lib/team/mock-data'
import { getAllPlannings, generateShareLink } from '@/lib/team/planning-store'
import type { WeeklyPlanning } from '@/lib/team/types'
import PlanningWorkspace from '@/components/team/planning/PlanningWorkspace'
import { Calendar, Clock, LayoutGrid, Check, AlertTriangle, ChevronRight, Eye } from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  borrador: { label: 'Borrador', color: '#8a8680', bg: '#f4f3f1', dot: '#8a8680' },
  lista_revision: { label: 'Lista revisión', color: '#591427', bg: '#C1DBE8', dot: '#591427' },
  enviada: { label: 'Enviada', color: '#f08c00', bg: '#FFF8D1', dot: '#f08c00' },
  aprobada: { label: 'Aprobada', color: '#2f9e44', bg: '#EBFBEE', dot: '#2f9e44' },
  cambios: { label: 'Cambios', color: '#e03131', bg: '#FFF5F5', dot: '#e03131' },
}

function pubReady(x: any) {
  return (x.type === 'reel' ? !!x.coverUrl : x.carouselImages.length > 0) &&
    x.copy.trim() &&
    (x.type !== 'reel' || x.driveLink)
}

// Open the public client preview for a planning — works at any moment,
// even when the planning is incomplete or still in draft.
function openClientPreview(planningId: string) {
  const url = generateShareLink(planningId)
  if (url) window.open(url, '_blank')
}

export default function Planificacion() {
  const { user, member } = useAuth()
  const [selected, setSelected] = useState<WeeklyPlanning | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const allPlannings = useMemo(() => getAllPlannings(), [refreshKey])

  if (!user || !member) return null

  // Role-scoped plannings
  const scoped = allPlannings.filter(p => {
    if (user.role === 'admin') return true
    const client = CLIENTS.find(c => c.id === p.clientId)
    if (user.role === 'cm') return client?.cmId === member.id
    if (user.role === 'editor') return client?.editorId === member.id
    if (user.role === 'designer') return client?.designerId === member.id
    return false
  })

  if (selected) {
    return (
      <PlanningWorkspace
        initialPlanning={selected}
        onBack={() => { setSelected(null); setRefreshKey(k => k + 1) }}
      />
    )
  }

  // Group by client for advance table
  const weeks = Array.from(new Set(scoped.map(p => p.week))).sort((a, b) => a - b)
  const byClient = new Map<string, WeeklyPlanning[]>()
  scoped.forEach(p => {
    if (!byClient.has(p.clientId)) byClient.set(p.clientId, [])
    byClient.get(p.clientId)!.push(p)
  })

  // Global counts
  const totalPubs = scoped.reduce((s, p) => s + p.publications.length, 0)
  const totalReady = scoped.reduce((s, p) => s + p.publications.filter(pubReady).length, 0)
  const totalMarked = scoped.reduce((s, p) => s + p.publications.filter(x => !!x.markedReadyById).length, 0)
  const byStatus = scoped.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={16} className="text-[#7A1832]" />
          <h2 className="font-semibold text-[14px] text-[#1a1a1a]">Planificaciones · Julio 2026</h2>
        </div>
        <p className="text-[12px] text-[#8a8680]">Cada rol aporta su parte: editores suben reels, diseñadoras carruseles, CM escriben copies y envían al cliente.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Planificaciones" value={scoped.length} icon={Calendar} color="#7A1832" bg="#FFF1B5" />
        <KpiCard label="Publicaciones" value={totalPubs} icon={LayoutGrid} color="#7A1832" bg="#FFF1B5" />
        <KpiCard label="Marcadas listas" value={totalMarked} icon={Check} color="#2f9e44" bg="#EBFBEE" />
        <KpiCard label="Aprobadas" value={byStatus.aprobada || 0} icon={Check} color="#591427" bg="#C1DBE8" />
      </div>

      {/* Advance table */}
      {scoped.length > 0 && (
        <div className="bg-white rounded-xl border border-[#FFF1B5] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f4f3f1] flex items-center gap-2">
            <LayoutGrid size={15} className="text-[#7A1832]" />
            <h3 className="font-semibold text-[13px] text-[#1a1a1a]">Tabla de avance</h3>
            <span className="ml-auto text-[11px] text-[#8a8680]">{totalReady}/{totalPubs} publicaciones completas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#FFFDF5] text-[#8a8680] text-[11px] uppercase tracking-wide">
                  <th className="text-left font-medium px-4 py-2">Cliente</th>
                  {weeks.map(w => (
                    <th key={w} className="text-center font-medium px-3 py-2 min-w-[140px]">Semana {w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(byClient.entries()).map(([clientId, plans]) => {
                  const client = CLIENTS.find(c => c.id === clientId)
                  if (!client) return null
                  return (
                    <tr key={clientId} className="border-t border-[#f4f3f1] hover:bg-[#FFFDF5]/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold" style={{ background: client.logoColor }}>
                            {client.name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-[#1a1a1a]">{client.name}</div>
                            <div className="text-[10.5px] text-[#8a8680]">{client.city}</div>
                          </div>
                        </div>
                      </td>
                      {weeks.map(w => {
                        const p = plans.find(x => x.week === w)
                        if (!p) return <td key={w} className="px-3 py-3 text-center text-[#d0cecb]">—</td>
                        const cfg = STATUS_CFG[p.status] || STATUS_CFG.borrador
                        const pubs = p.publications
                        const ready = pubs.filter(pubReady).length
                        const marked = pubs.filter(x => !!x.markedReadyById).length
                        const pct = pubs.length ? (ready / pubs.length) * 100 : 0
                        return (
                          <td key={w} className="px-3 py-3">
                            <div className="rounded-lg p-2 hover:bg-white border border-transparent hover:border-[#7A1832]/30 transition-all group relative">
                              <button
                                onClick={() => setSelected(p)}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                    style={{ color: cfg.color, background: cfg.bg }}
                                  >
                                    {cfg.label}
                                  </span>
                                  <ChevronRight size={12} className="text-[#d0cecb] group-hover:text-[#7A1832] transition-colors" />
                                </div>
                                <div className="h-1 bg-[#f4f3f1] rounded-full overflow-hidden mb-1.5">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.dot }} />
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-[#8a8680]">{ready}/{pubs.length} completas</span>
                                  {marked > 0 && (
                                    <span className="text-[#2f9e44] flex items-center gap-0.5 font-medium">
                                      <Check size={9} /> {marked}
                                    </span>
                                  )}
                                </div>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openClientPreview(p.id) }}
                                title="Vista previa del cliente (lo que verá cuando se le envíe)"
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-[#d0cecb] hover:text-[#7A1832] hover:bg-[#FFF1B5]/40 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Eye size={12} />
                              </button>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card grid */}
      {scoped.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] py-16 text-center">
          <Calendar size={32} className="mx-auto text-[#d0cecb] mb-3" />
          <div className="text-[14px] text-[#8a8680]">No hay planificaciones asignadas a ti todavía.</div>
        </div>
      ) : (
        <>
          <div className="text-[11px] uppercase tracking-wider text-[#8a8680] mt-6 mb-2 px-1">Vista por planificación</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoped.map(p => {
              const client = CLIENTS.find(c => c.id === p.clientId)
              const cfg = STATUS_CFG[p.status] || STATUS_CFG.borrador
              const pubs = p.publications || []
              const ready = pubs.filter(pubReady).length
              const marked = pubs.filter(x => !!x.markedReadyById).length
              return (
                <div key={p.id} className="relative group">
                  <button
                    onClick={() => setSelected(p)}
                    className="w-full bg-white rounded-xl border border-[#FFF1B5] p-5 text-left hover:shadow-md hover:border-[#7A1832]/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-bold" style={{ background: client?.logoColor }}>
                          {client?.name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-[14px] text-[#1a1a1a]">{client?.name}</div>
                          <div className="text-[11.5px] text-[#8a8680]">Semana {p.week}</div>
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="text-[12px] text-[#8a8680] mb-2 flex items-center gap-3">
                      <span>{pubs.length} pubs · {ready}/{pubs.length} completas</span>
                      {marked > 0 && (
                        <span className="text-[#2f9e44] flex items-center gap-0.5">
                          <Check size={11} /> {marked} listas
                        </span>
                      )}
                    </div>

                    <div className="h-1.5 bg-[#f4f3f1] rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pubs.length ? (ready / pubs.length) * 100 : 0}%`, background: cfg.dot }}
                      />
                    </div>

                    <div className="flex items-center gap-3 text-[11.5px] text-[#8a8680]">
                      <span className="flex items-center gap-1"><Clock size={12} /> {new Date(p.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      {p.shareToken && (
                        <span className="text-[#7A1832] font-medium">Link activo</span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => openClientPreview(p.id)}
                    title="Vista previa del cliente (lo que verá cuando se le envíe)"
                    className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center text-[#d0cecb] hover:text-[#7A1832] hover:bg-[#FFF1B5]/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: any; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#FFF1B5] p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-[#8a8680]">{label}</div>
          <div className="text-[20px] font-bold text-[#1a1a1a] leading-none mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  )
}