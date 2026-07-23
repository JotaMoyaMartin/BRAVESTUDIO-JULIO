'use client'
import { useState, useMemo } from 'react'
import { NOTIFICATIONS, CLIENTS } from '@/lib/team/mock-data'
import { getAllNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/team/planning-store'
import { Bell, Upload, RefreshCw, Eye, CheckCircle2, AlertTriangle, Clock, CheckCheck } from 'lucide-react'

const TYPE_ICONS: Record<string, any> = {
  upload: Upload,
  change: RefreshCw,
  review: Eye,
  approval: CheckCircle2,
  material: AlertTriangle,
  deadline: Clock,
}

const TYPE_COLORS: Record<string, string> = {
  upload: '#591427',
  change: '#e03131',
  review: '#7A1832',
  approval: '#2f9e44',
  material: '#f08c00',
  deadline: '#e03131',
}

export default function Notificaciones() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  const allNotifs = useMemo(() => {
    const userNotifs = getAllNotifications()
    const map = new Map<string, typeof NOTIFICATIONS[number]>()
    ;[...userNotifs, ...NOTIFICATIONS].forEach(n => map.set(n.id, n as any))
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const items = filter === 'all' ? allNotifs : allNotifs.filter(n => !n.read)
  const unread = allNotifs.filter(n => !n.read).length

  return (
    <div className="space-y-4 max-w-[800px]">
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[#7A1832]" />
          <h2 className="font-semibold text-[14px] text-[#1a1a1a]">Notificaciones</h2>
          {unread > 0 && <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFF1B5] text-[#7A1832] font-medium">{unread} sin leer</span>}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={() => { markAllNotificationsRead(); setRefreshKey(k => k + 1) }}
              className="text-[11.5px] text-[#7A1832] hover:underline flex items-center gap-1 font-medium"
            >
              <CheckCheck size={12} /> Marcar todas
            </button>
          )}
          <div className="flex gap-1 bg-[#FFFDF5] rounded-lg p-1 border border-[#FFF1B5]">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  filter === f ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-[#8a8680]'
                }`}
              >
                {f === 'all' ? 'Todas' : 'Sin leer'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#FFF1B5] overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-[#8a8680]">
            <Bell size={28} className="mx-auto mb-2 text-[#d0cecb]" />
            No hay notificaciones.
          </div>
        ) : (
          items.map((n, i) => {
            const Icon = TYPE_ICONS[n.type] || Bell
            const color = TYPE_COLORS[n.type] || '#8a8680'
            const client = CLIENTS.find(c => c.id === n.clientId)
            return (
              <div
                key={n.id}
                onClick={() => { markNotificationRead(n.id); setRefreshKey(k => k + 1) }}
                className={`flex items-start gap-3 px-4 py-3.5 border-b border-[#f4f3f1] last:border-0 ${!n.read ? 'bg-[#FFF1B5]/30' : ''} hover:bg-[#FFFDF5] transition-colors cursor-pointer`}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#1a1a1a]">{n.message}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#8a8680]">
                      {new Date(n.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {client && (
                      <span className="text-[11px] text-[#8a8680]">· {client.name}</span>
                    )}
                  </div>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-[#7A1832] mt-2 shrink-0" />}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}