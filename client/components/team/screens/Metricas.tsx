'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS, TEAM } from '@/lib/team/mock-data'
import type { Client } from '@/lib/team/types'
import {
  Search, ArrowLeft, BarChart3, Loader2, AlertCircle, RefreshCw,
  Settings as SettingsIcon, Save, TrendingUp, Users, Eye, Heart, FileText,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'

interface MetricRow {
  id: string
  month: string
  network: string
  followers: number | null
  reach: number | null
  impressions: number | null
  engagement_rate: number | null
  posts_count: number | null
}

interface ConfigRow {
  user_id: string
  blog_id: string
  metricool_user_id: string
  networks: string[]
  last_sync_at: string | null
  updated_at: string
}

const NETWORK_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  twitter: 'Twitter',
  youtube: 'YouTube',
}

export default function Metricas() {
  const { user, member } = useAuth()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  if (!user || !member) return null

  if (user.role !== 'admin' && user.role !== 'cm') {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-xl border border-[#FFF1B5] text-center">
        <AlertCircle className="mx-auto mb-2 text-[#8a8680]" />
        <p className="text-[13px] text-[#8a8680]">No tienes acceso a Métricas.</p>
      </div>
    )
  }

  const scoped = useMemo(() => CLIENTS.filter(c => {
    if (!c.supabase_user_id) return false
    if (user.role === 'admin') return true
    if (user.role === 'cm') return c.cmId === member.id
    return false
  }), [user, member])

  const filtered = scoped.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.salonName.toLowerCase().includes(q)
  })

  if (selected) {
    return <MetricasDetail client={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-[400px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8680]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar clienta premium…"
            className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832] focus:bg-white"
          />
        </div>
        <div className="ml-auto text-[12px] text-[#8a8680]">{filtered.length} clientas</div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-8 text-center">
          <AlertCircle className="mx-auto mb-2 text-[#8a8680]" />
          <p className="text-[13px] text-[#8a8680]">No hay clientas premium mapeadas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => {
            const cm = TEAM.find(t => t.id === c.cmId)
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
                    {cm && <div className="text-[11px] text-[#8a8680] mt-0.5">CM: {cm.name}</div>}
                  </div>
                </div>
                <div className="text-[12px] text-[#7A1832] flex items-center gap-1">
                  <BarChart3 size={12} /> Ver métricas
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// DETAIL
// ═══════════════════════════════════════════════

function MetricasDetail({ client, onBack }: { client: Client; onBack: () => void }) {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<MetricRow[]>([])
  const [config, setConfig] = useState<ConfigRow | null>(null)
  const [hasToken, setHasToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const actorId = user!.id

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cfgRes, mRes] = await Promise.all([
        fetch(`/team/api/metricool/config?clientId=${encodeURIComponent(client.id)}&actorId=${encodeURIComponent(actorId)}`).then(r => r.json()),
        fetch(`/team/api/metricool/metrics?clientId=${encodeURIComponent(client.id)}&actorId=${encodeURIComponent(actorId)}`).then(r => r.json()),
      ])
      if (cfgRes.error) throw new Error(cfgRes.error)
      if (mRes.error) throw new Error(mRes.error)
      setConfig(cfgRes.config || null)
      setHasToken(cfgRes.has_token || false)
      setMetrics(mRes.metrics || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [client.id, actorId])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/team/api/metricool/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, clientId: client.id }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al sincronizar')
      const oks = (j.results || []).filter((r: { ok: boolean }) => r.ok).length
      const fails = (j.results || []).filter((r: { ok: boolean }) => !r.ok).length
      setInfo(`Sincronizado: ${oks} ok, ${fails} fallidas.`)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSyncing(false)
    }
  }

  // Group by network
  const byNetwork = useMemo(() => {
    const map: Record<string, MetricRow[]> = {}
    for (const m of metrics) {
      if (!map[m.network]) map[m.network] = []
      map[m.network].push(m)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.month.localeCompare(b.month))
    }
    return map
  }, [metrics])

  return (
    <div className="space-y-4 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#FFF1B5] text-[#7A1832]">
          <ArrowLeft size={18} />
        </button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: client.logoColor }}>
          {client.name[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-[#1a1a1a]">{client.name} — Métricas</h1>
          <div className="text-[12px] text-[#8a8680]">{client.salonName} · {client.city}</div>
        </div>
        <button
          onClick={() => setShowConfig(s => !s)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e8e6e3] text-[#3d3d3d] text-[12.5px] hover:bg-[#FFFDF5]"
        >
          <SettingsIcon size={14} /> Config
        </button>
        <button
          onClick={handleSync}
          disabled={syncing || !hasToken}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7A1832] text-white text-[13px] font-medium hover:bg-[#591427] disabled:opacity-50"
          title={!hasToken ? 'Configura Metricool primero' : 'Sincronizar mes actual'}
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sincronizar
        </button>
      </div>

      {error && (
        <div className="bg-[#FFF5F5] border border-[#e03131] text-[#e03131] text-[12.5px] px-4 py-2.5 rounded-lg flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {info && (
        <div className="bg-[#EBFBEE] border border-[#2f9e44] text-[#2f9e44] text-[12.5px] px-4 py-2.5 rounded-lg">
          {info}
        </div>
      )}

      {showConfig && (
        <ConfigForm
          client={client}
          actorId={actorId}
          existing={config}
          hasToken={hasToken}
          onSaved={() => { setShowConfig(false); load() }}
        />
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-8 text-center text-[#8a8680] text-[13px]">
          <Loader2 size={18} className="animate-spin inline-block mb-2" /> Cargando métricas…
        </div>
      ) : metrics.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-8 text-center">
          <BarChart3 className="mx-auto mb-3 text-[#7A1832]" />
          <p className="text-[14px] font-medium text-[#1a1a1a] mb-1">Aún no hay métricas sincronizadas</p>
          <p className="text-[12.5px] text-[#8a8680] mb-3">
            {hasToken ? 'Pulsa «Sincronizar» para traer los datos de Metricool.' : 'Configura las credenciales de Metricool y luego sincroniza.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byNetwork).map(([net, rows]) => (
            <NetworkBlock key={net} network={net} rows={rows} />
          ))}
        </div>
      )}
    </div>
  )
}

function NetworkBlock({ network, rows }: { network: string; rows: MetricRow[] }) {
  const data = rows.map(r => ({
    month: r.month.slice(5, 7) + '/' + r.month.slice(2, 4),
    followers: r.followers ?? 0,
    reach: r.reach ?? 0,
    impressions: r.impressions ?? 0,
    engagement: Number((r.engagement_rate ?? 0).toFixed(2)),
    posts: r.posts_count ?? 0,
  }))
  const latest = rows[rows.length - 1]
  const first = rows[0]
  const followerGrowth = (latest?.followers ?? 0) - (first?.followers ?? 0)

  return (
    <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold text-[#1a1a1a] flex items-center gap-2">
          <BarChart3 size={15} className="text-[#7A1832]" />
          {NETWORK_LABELS[network] || network}
        </h3>
        <div className="text-[11px] text-[#8a8680]">{rows.length} meses</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KPI icon={<Users size={14} />} label="Seguidores" value={fmt(latest?.followers)} sub={`${followerGrowth >= 0 ? '+' : ''}${fmt(followerGrowth)} vs primer mes`} />
        <KPI icon={<Eye size={14} />} label="Alcance (mes)" value={fmt(latest?.reach)} />
        <KPI icon={<Heart size={14} />} label="Engagement" value={latest?.engagement_rate != null ? `${Number(latest.engagement_rate).toFixed(2)}%` : '—'} />
        <KPI icon={<FileText size={14} />} label="Posts (mes)" value={fmt(latest?.posts_count)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Seguidores">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="followers" stroke="#7A1832" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alcance e impresiones">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="reach" name="Alcance" fill="#A04060" />
              <Bar dataKey="impressions" name="Impresiones" fill="#FFF1B5" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Engagement rate (%)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="engagement" stroke="#2f9e44" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Posts publicados">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="posts" name="Posts" fill="#9c36b5" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function KPI({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#FFFDF5] rounded-lg p-3 border border-[#FFF1B5]">
      <div className="flex items-center gap-1.5 text-[#8a8680] text-[11px] mb-1">
        {icon} {label}
      </div>
      <div className="text-[18px] font-bold text-[#1a1a1a]">{value}</div>
      {sub && <div className="text-[10.5px] text-[#8a8680] mt-0.5">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#FFF1B5] rounded-lg p-3">
      <div className="text-[12px] font-medium text-[#3d3d3d] mb-2 flex items-center gap-1">
        <TrendingUp size={12} className="text-[#7A1832]" /> {title}
      </div>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════
// CONFIG FORM
// ═══════════════════════════════════════════════

function ConfigForm({
  client, actorId, existing, hasToken, onSaved,
}: {
  client: Client
  actorId: string
  existing: ConfigRow | null
  hasToken: boolean
  onSaved: () => void
}) {
  const [blogId, setBlogId] = useState(existing?.blog_id || '')
  const [userId, setUserId] = useState(existing?.metricool_user_id || '')
  const [token, setToken] = useState('')
  const [networks, setNetworks] = useState<string[]>(existing?.networks || ['instagram'])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggleNet(n: string) {
    setNetworks(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/team/api/metricool/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, clientId: client.id, blog_id: blogId, user_token: token, metricool_user_id: userId, networks }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error al guardar')
      onSaved()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">Configuración Metricool de {client.name}</div>
      <p className="text-[12px] text-[#8a8680]">
        Encuentra estas credenciales en Metricool: avatar → Ajustes → API. El token se valida antes de guardarse.
        {hasToken && existing && <span className="text-[#2f9e44]"> · Ya hay token guardado (no se muestra aquí).</span>}
      </p>

      {err && <div className="bg-[#FFF5F5] border border-[#e03131] text-[#e03131] text-[12px] px-3 py-2 rounded-md">{err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="blog_id">
          <input value={blogId} onChange={e => setBlogId(e.target.value)} placeholder="ej. 1234567" className={inputCls} />
        </Field>
        <Field label="metricool_user_id (numérico)">
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="ej. 7654321" className={inputCls} />
        </Field>
      </div>
      <Field label={hasToken ? 'user_token (dejar vacío para mantener el actual)' : 'user_token'}>
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="ETTKLZHP…"
          className={inputCls}
          type="password"
        />
      </Field>

      <div>
        <div className="text-[11.5px] text-[#8a8680] mb-1">Redes a sincronizar</div>
        <div className="flex gap-2 flex-wrap">
          {['instagram', 'tiktok', 'facebook'].map(n => (
            <button
              key={n}
              onClick={() => toggleNet(n)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] border ${
                networks.includes(n) ? 'bg-[#7A1832] text-white border-[#7A1832]' : 'border-[#e8e6e3] text-[#3d3d3d]'
              }`}
            >
              {NETWORK_LABELS[n] || n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving || !blogId || !userId || (!token && !hasToken)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7A1832] text-white text-[12px] font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
        </button>
      </div>
    </div>
  )
}

const inputCls = "w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] text-[#8a8680] mb-1">{label}</span>
      {children}
    </label>
  )
}

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}