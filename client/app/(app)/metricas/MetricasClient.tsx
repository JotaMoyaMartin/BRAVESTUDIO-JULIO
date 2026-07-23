'use client'
import { useMemo } from 'react'
import { BarChart3, Users, Eye, Heart, FileText, TrendingUp } from 'lucide-react'
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

const NETWORK_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  twitter: 'Twitter',
  youtube: 'YouTube',
}

export default function MetricasClient({ metrics }: { metrics: MetricRow[] }) {
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: 'var(--color-buttermilk)' }}>
          <BarChart3 size={22} className="text-cherry" />
        </div>
        <div>
          <h1 className="text-2xl font-bold title-shine">Métricas</h1>
          <p className="mt-1 text-sm text-cherry-dark opacity-80">
            Evolución de tus redes sociales, sincronizada desde Metricool.
          </p>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] p-8 text-center bg-white shadow-soft"
          style={{ border: '1.5px solid var(--color-buttermilk)' }}
        >
          <div className="text-4xl mb-3 float-soft inline-block">📊</div>
          <h3 className="text-xl font-bold text-cherry-dark mb-2">Tus métricas estarán disponibles pronto</h3>
          <p className="text-sm text-cherry-dark opacity-70 max-w-md mx-auto">
            Tu estilista BRÄVE está configurando la conexión con Metricool. En cuanto esté lista, verás aquí la evolución de seguidores, alcance, impresiones y engagement de tus redes.
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
    <div
      className="rounded-[var(--radius-lg)] p-5 bg-white shadow-soft"
      style={{ border: '1.5px solid var(--color-buttermilk)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-cherry-dark flex items-center gap-2">
          <BarChart3 size={16} className="text-cherry" />
          {NETWORK_LABELS[network] || network}
        </h3>
        <div className="text-xs text-cherry-dark opacity-60">{rows.length} meses</div>
      </div>

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
    <div className="rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-buttermilk)' }}>
      <div className="flex items-center gap-1.5 text-cherry-dark opacity-70 text-xs mb-1">
        {icon} {label}
      </div>
      <div className="text-lg font-bold text-cherry-dark">{value}</div>
      {sub && <div className="text-[10.5px] text-cherry-dark opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-sm)] p-3" style={{ border: '1px solid var(--color-buttermilk)' }}>
      <div className="text-xs font-medium text-cherry-dark opacity-80 mb-2 flex items-center gap-1">
        <TrendingUp size={12} className="text-cherry" /> {title}
      </div>
      {children}
    </div>
  )
}

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}