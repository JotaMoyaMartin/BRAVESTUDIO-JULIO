'use client'
import { useState, useMemo, Fragment } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CONTENT, CLIENTS, TEAM, STATUS_CONFIG, SLOT_LABELS, TYPE_LABELS } from '@/lib/team/mock-data'
import type { ContentPiece, ContentStatus } from '@/lib/team/types'
import { Filter, ChevronDown, ChevronRight, LayoutGrid, List, Search } from 'lucide-react'

const WEEKS = [1, 2, 3, 4]
const MONTH = 'Julio 2026'

export default function Production() {
  const { user, member } = useAuth()
  const [week, setWeek] = useState<number>(1)
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!user || !member) return null

  // Role-scoped content
  const scoped = useMemo(() => CONTENT.filter(c => {
    if (user.role === 'admin') return true
    if (user.role === 'cm') return c.cmId === member.id
    if (user.role === 'editor') return c.editorId === member.id
    if (user.role === 'designer') return c.designerId === member.id
    return false
  }), [user, member])

  // Apply filters
  const filtered = scoped.filter(c => {
    if (c.week !== week) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (clientFilter !== 'all' && c.clientId !== clientFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const client = CLIENTS.find(cl => cl.id === c.clientId)
      if (!c.title.toLowerCase().includes(q) && !client?.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Group by client
  const byClient = useMemo(() => {
    const map: Record<string, ContentPiece[]> = {}
    filtered.forEach(c => {
      if (!map[c.clientId]) map[c.clientId] = []
      map[c.clientId].push(c)
    })
    return map
  }, [filtered])

  const clientIds = Object.keys(byClient).sort((a, b) => {
    const ca = CLIENTS.find(c => c.id === a)
    const cb = CLIENTS.find(c => c.id === b)
    return (ca?.name || '').localeCompare(cb?.name || '')
  })

  // Available clients for filter dropdown
  const myClientIds = Array.from(new Set(scoped.map(c => c.clientId)))

  const statuses: (ContentStatus | 'all')[] = ['all', ...Object.keys(STATUS_CONFIG) as ContentStatus[]]

  return (
    <div className="space-y-4 max-w-[1600px]">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-3 flex flex-wrap items-center gap-3">
        {/* Week tabs */}
        <div className="flex items-center gap-1 bg-[#FFFDF5] rounded-lg p-1">
          {WEEKS.map(w => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={`px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-colors ${
                week === w ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#8a8680] hover:text-[#1a1a1a]'
              }`}
            >
              Sem {w}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-[#FFF1B5]" />

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[#FFFDF5] rounded-lg p-1">
          <button
            onClick={() => setView('table')}
            className={`px-2.5 py-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-[#8a8680]'}`}
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setView('cards')}
            className={`px-2.5 py-1.5 rounded-md transition-colors ${view === 'cards' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-[#8a8680]'}`}
          >
            <LayoutGrid size={15} />
          </button>
        </div>

        <div className="h-6 w-px bg-[#FFF1B5]" />

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8680]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar contenido o cliente…"
            className="w-full pl-8 pr-3 py-2 text-[12.5px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832] focus:bg-white"
          />
        </div>

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="text-[12.5px] px-3 py-2 rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
        >
          <option value="all">Todos los clientes</option>
          {myClientIds.map(id => {
            const c = CLIENTS.find(cl => cl.id === id)
            return <option key={id} value={id}>{c?.name}</option>
          })}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="text-[12.5px] px-3 py-2 rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
        >
          {statuses.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'Todos los estados' : STATUS_CONFIG[s as ContentStatus].label}</option>
          ))}
        </select>

        <div className="ml-auto text-[12px] text-[#8a8680]">
          {filtered.length} piezas
        </div>
      </div>

      {/* Content */}
      {clientIds.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] py-16 text-center">
          <div className="text-[14px] text-[#8a8680]">No hay piezas que coincidan con los filtros.</div>
        </div>
      ) : view === 'table' ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FFFDF5] border-b border-[#FFF1B5] text-left">
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#8a8680] font-semibold w-[260px]">Cliente</th>
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#8a8680] font-semibold">Pieza</th>
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#8a8680] font-semibold">Tipo</th>
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#8a8680] font-semibold">Estado</th>
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#8a8680] font-semibold">Equipo</th>
                <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#8a8680] font-semibold">Entrega</th>
              </tr>
            </thead>
            <tbody>
              {clientIds.map(cid => {
                const client = CLIENTS.find(c => c.id === cid)!
                const pieces = byClient[cid]
                const isExp = expanded === cid
                return (
                  <Fragment key={cid}>
                    <tr
                      className="border-b border-[#FFF1B5] cursor-pointer hover:bg-[#FFFDF5]"
                      onClick={() => setExpanded(isExp ? null : cid)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {isExp ? <ChevronDown size={14} className="text-[#8a8680]" /> : <ChevronRight size={14} className="text-[#8a8680]" />}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold" style={{ background: client.logoColor }}>
                            {client.name[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-[13px] text-[#1a1a1a] truncate">{client.name}</div>
                            <div className="text-[11px] text-[#8a8680]">{pieces.length} piezas</div>
                          </div>
                        </div>
                      </td>
                      <td colSpan={5} className="px-4 py-3 text-[12px] text-[#8a8680]">
                        {pieces.length} piezas · {pieces.filter(p => ['finalizado','planificado','aprobado'].includes(p.status)).length} completadas
                      </td>
                    </tr>
                    {isExp && pieces.map(p => {
                      const cfg = STATUS_CONFIG[p.status]
                      const ed = TEAM.find(t => t.id === p.editorId)
                      const ds = TEAM.find(t => t.id === p.designerId)
                      const cm = TEAM.find(t => t.id === p.cmId)
                      return (
                        <tr key={p.id} className="border-b border-[#f4f3f1] bg-[#fcfbfa]">
                          <td className="px-4 py-3 pl-12">
                            <div className="text-[11px] text-[#8a8680]">{SLOT_LABELS[p.slot]}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[13px] text-[#1a1a1a] font-medium">{p.title}</div>
                            <div className="text-[11px] text-[#8a8680] mt-0.5">{p.theme}</div>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-[#3d3d3d]">{TYPE_LABELS[p.type]}</td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1.5" style={{ color: cfg.color, background: cfg.bg }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex -space-x-1.5">
                              {cm && <Avatar t={cm} />}
                              {ed && <Avatar t={ed} />}
                              {ds && <Avatar t={ds} />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-[#8a8680]">
                            {new Date(p.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(p => {
            const client = CLIENTS.find(c => c.id === p.clientId)
            const cfg = STATUS_CONFIG[p.status]
            return (
              <div key={p.id} className="bg-white rounded-xl border border-[#FFF1B5] p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: client?.logoColor }}>
                    {client?.name[0]}
                  </div>
                  <span className="text-[12px] font-medium text-[#1a1a1a] flex-1 truncate">{client?.name}</span>
                  <span className="text-[10px] text-[#8a8680]">Sem {p.week}</span>
                </div>
                <div className="text-[11px] text-[#8a8680] mb-1">{SLOT_LABELS[p.slot]} · {TYPE_LABELS[p.type]}</div>
                <div className="text-[13px] text-[#1a1a1a] font-medium mb-3 line-clamp-2">{p.title}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1.5" style={{ color: cfg.color, background: cfg.bg }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                    {cfg.label}
                  </span>
                  <span className="text-[11px] text-[#8a8680]">
                    {new Date(p.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Avatar({ t }: { t: { name: string; avatar: string; color: string } }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white"
      style={{ background: t.color }}
      title={t.name}
    >
      {t.avatar}
    </div>
  )
}
