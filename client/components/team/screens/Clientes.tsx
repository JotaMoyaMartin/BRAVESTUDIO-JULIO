'use client'
import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS, TEAM, CONTENT, STATUS_CONFIG, ROLE_LABELS } from '@/lib/team/mock-data'
import type { Client } from '@/lib/team/types'
import { Search, ArrowLeft, MapPin, Camera, Calendar, MessageSquare, FolderOpen, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import EstrategiaDetail from '@/components/team/screens/estrategia/EstrategiaDetail'
import MetricasDetail from '@/components/team/screens/metricas/MetricasDetail'
import FloatingAssistant from '@/components/team/screens/clientes/FloatingAssistant'

type TabKey = 'ficha' | 'estrategia' | 'metricas'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  activo: { label: 'Activo', color: '#2f9e44', bg: '#EBFBEE' },
  onboarding: { label: 'Onboarding', color: '#f08c00', bg: '#FFF8D1' },
  pausado: { label: 'Pausado', color: '#8a8680', bg: '#f4f3f1' },
}

export default function Clientes() {
  const { user, member } = useAuth()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  if (!user || !member) return null

  // Role-scoped clients
  const scoped = useMemo(() => CLIENTS.filter(c => {
    if (user.role === 'admin') return true
    if (user.role === 'cm') return c.cmId === member.id
    if (user.role === 'editor') return c.editorId === member.id
    if (user.role === 'designer') return c.designerId === member.id
    return false
  }), [user, member])

  const filtered = scoped.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.salonName.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
  })

  if (selected) {
    return <ClientDetail client={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Search */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-[400px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8680]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, salón o ciudad…"
            className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832] focus:bg-white"
          />
        </div>
        <div className="ml-auto text-[12px] text-[#8a8680]">{filtered.length} clientes</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(c => {
          const badge = STATUS_BADGE[c.serviceStatus]
          const cm = TEAM.find(t => t.id === c.cmId)
          const pieces = CONTENT.filter(p => p.clientId === c.id)
          const done = pieces.filter(p => ['finalizado','planificado','aprobado'].includes(p.status)).length
          const blocked = pieces.filter(p => ['pendiente_material','cambios_solicitados'].includes(p.status)).length
          const pct = pieces.length ? Math.round((done / pieces.length) * 100) : 0
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="bg-white rounded-xl border border-[#FFF1B5] p-4 text-left hover:shadow-md hover:border-[#7A1832]/30 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[15px] font-bold shrink-0" style={{ background: c.logoColor }}>
                  {c.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px] text-[#1a1a1a] truncate">{c.name}</div>
                  <div className="text-[11.5px] text-[#8a8680] truncate">{c.salonName}</div>
                  <div className="flex items-center gap-1 text-[11px] text-[#8a8680] mt-0.5">
                    <MapPin size={11} /> {c.city}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10.5px] px-2 py-0.5 rounded-md font-medium" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                <span className="text-[10.5px] text-[#8a8680]">@{c.instagram.replace('@','')}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8a8680]">Progreso</span>
                  <span className="text-[#3d3d3d] font-medium">{done}/{pieces.length}</span>
                </div>
                <div className="h-1.5 bg-[#f4f3f1] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7A1832] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f4f3f1]">
                {cm && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: cm.color }}>
                      {cm.avatar}
                    </div>
                    <span className="text-[11px] text-[#8a8680]">{cm.name}</span>
                  </div>
                )}
                {blocked > 0 && (
                  <span className="ml-auto text-[11px] text-[#e03131] flex items-center gap-1">
                    <AlertCircle size={11} /> {blocked}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ClientDetail({ client, onBack }: { client: Client; onBack: () => void }) {
  const { user } = useAuth()
  const [tab, setTab] = useState<TabKey>('ficha')
  const cm = TEAM.find(t => t.id === client.cmId)
  const ed = TEAM.find(t => t.id === client.editorId)
  const ds = TEAM.find(t => t.id === client.designerId)
  const badge = STATUS_BADGE[client.serviceStatus]

  const isPremium = !!client.supabase_user_id
  const canManage = user?.role === 'admin' || user?.role === 'cm'
  const tabs: TabKey[] = isPremium && canManage
    ? ['ficha', 'estrategia', 'metricas']
    : ['ficha']
  const activeTab = (tabs.includes(tab) ? tab : 'ficha') as TabKey

  return (
    <div className="space-y-5 max-w-[1200px]">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#8a8680] hover:text-[#1a1a1a]">
        <ArrowLeft size={15} /> Volver a clientes
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-[22px] font-bold shrink-0" style={{ background: client.logoColor }}>
            {client.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[22px] font-bold text-[#1a1a1a]">{client.name}</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
              {isPremium && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-[#7A1832] text-white">PREMIUM</span>
              )}
            </div>
            <div className="text-[13px] text-[#8a8680]">{client.salonName} · {client.city}</div>
            <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-[#8a8680]">
              <span className="flex items-center gap-1"><Camera size={13} /> {client.instagram}</span>
              <span className="flex items-center gap-1"><Calendar size={13} /> {client.postFrequency}</span>
              <span className="flex items-center gap-1">Días: {client.postDays.join(', ')}</span>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Community Manager', m: cm },
            { label: 'Editor de vídeo', m: ed },
            { label: 'Diseñadora', m: ds },
          ].map(({ label, m }) => (
            <div key={label} className="bg-[#FFFDF5] rounded-lg p-3 flex items-center gap-3">
              {m ? (
                <>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: m.color }}>{m.avatar}</div>
                  <div>
                    <div className="text-[11px] text-[#8a8680]">{label}</div>
                    <div className="text-[13px] font-medium text-[#1a1a1a]">{m.name}</div>
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-[#8a8680]">{label}: sin asignar</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pestañas (solo premium + admin/cm) */}
      {tabs.length > 1 && (
        <div className="flex items-center gap-1 border-b border-[#FFF1B5] bg-white rounded-t-xl px-2 overflow-x-auto">
          {([['ficha', 'Ficha'], ['estrategia', 'Estrategia'], ['metricas', 'Métricas']] as [TabKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-[#7A1832] text-[#7A1832] bg-[#FFF1B5]'
                  : 'border-transparent text-[#8a8680] hover:bg-[#FFFDF5]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Contenido de la pestaña */}
      {activeTab === 'ficha' && <ClientFicha client={client} />}
      {activeTab === 'estrategia' && <EstrategiaDetail client={client} />}
      {activeTab === 'metricas' && <MetricasDetail client={client} />}

      {/* Asistente IA flotante (siempre presente en premium + admin/cm) */}
      {isPremium && canManage && <FloatingAssistant client={client} section={activeTab} />}
    </div>
  )
}

function ClientFicha({ client }: { client: Client }) {
  const pieces = CONTENT.filter(p => p.clientId === client.id)

  const byWeek = [1, 2, 3, 4].map(w => ({
    week: w,
    items: pieces.filter(p => p.week === w),
  }))

  const stats = {
    total: pieces.length,
    done: pieces.filter(p => ['finalizado','planificado','aprobado'].includes(p.status)).length,
    inProgress: pieces.filter(p => ['en_proceso','en_edicion','en_diseno','en_revision'].includes(p.status)).length,
    blocked: pieces.filter(p => ['pendiente_material','cambios_solicitados','sin_empezar'].includes(p.status)).length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total piezas', v: stats.total, c: '#591427', bg: '#C1DBE8' },
          { l: 'Completadas', v: stats.done, c: '#2f9e44', bg: '#EBFBEE' },
          { l: 'En curso', v: stats.inProgress, c: '#f08c00', bg: '#FFF8D1' },
          { l: 'Bloqueadas', v: stats.blocked, c: '#e03131', bg: '#FFF5F5' },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-[#FFF1B5] p-4">
            <div className="text-[22px] font-bold text-[#1a1a1a]">{s.v}</div>
            <div className="text-[11.5px] text-[#8a8680] mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Briefing */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-5">
        <h3 className="font-semibold text-[14px] text-[#1a1a1a] mb-4">Briefing del cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <Field label="Servicios principales" value={client.mainServices.join(', ')} />
          <Field label="Servicio a promocionar" value={client.promoteService} />
          <Field label="Tono de comunicación" value={client.tone} />
          <Field label="Objetivo principal" value={client.objectives} />
          <div className="md:col-span-2">
            <Field label="Observaciones" value={client.observations} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <a href={client.materialFolderUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-[12px] px-3 py-2 rounded-lg bg-[#FFFDF5] border border-[#e8e6e3] text-[#3d3d3d] hover:bg-white flex items-center gap-2">
            <FolderOpen size={14} /> Carpeta de material
          </a>
        </div>
      </div>

      {/* Production by week */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-5">
        <h3 className="font-semibold text-[14px] text-[#1a1a1a] mb-4">Producción · Julio 2026</h3>
        <div className="space-y-4">
          {byWeek.map(({ week, items }) => (
            <div key={week}>
              <div className="text-[12px] font-semibold text-[#3d3d3d] mb-2">Semana {week}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map(p => {
                  const cfg = STATUS_CONFIG[p.status]
                  return (
                    <div key={p.id} className="border border-[#FFF1B5] rounded-lg p-3">
                      <div className="text-[11px] text-[#8a8680] mb-1">{p.slot} · {p.type}</div>
                      <div className="text-[12.5px] font-medium text-[#1a1a1a] mb-2 line-clamp-2">{p.theme}</div>
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1" style={{ color: cfg.color, background: cfg.bg }}>
                        <span className="w-1 h-1 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[#8a8680] mb-1">{label}</div>
      <div className="text-[#1a1a1a]">{value}</div>
    </div>
  )
}