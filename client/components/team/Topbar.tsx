'use client'
import { useAuth } from '@/lib/team/auth-context'
import { NOTIFICATIONS } from '@/lib/team/mock-data'
import { getAllNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/team/planning-store'
import { Search, Bell, ChevronDown, CheckCheck } from 'lucide-react'
import { useState, useMemo } from 'react'

const TYPE_ICON: Record<string, string> = {
  upload: '📤',
  change: '✏️',
  review: '👀',
  approval: '✅',
  material: '📦',
  deadline: '⏰',
}

export default function Topbar({ title, onOpenNotifications }: { title: string; onOpenNotifications?: () => void }) {
  const { member } = useAuth()
  const [openNotif, setOpenNotif] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Merge seed notifications with user-created ones (from localStorage)
  const allNotifs = useMemo(() => {
    const userNotifs = getAllNotifications()
    // Deduplicate by id (seed ids are static like 'n1'; user ones start with 'n-')
    const map = new Map<string, typeof NOTIFICATIONS[number]>()
    ;[...userNotifs, ...NOTIFICATIONS].forEach(n => map.set(n.id, n as any))
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const unread = allNotifs.filter(n => !n.read).length

  const toggle = () => {
    const next = !openNotif
    setOpenNotif(next)
    if (next) {
      onOpenNotifications?.()
      setRefreshKey(k => k + 1)
    }
  }

  const handleOpen = () => {
    markAllNotificationsRead()
    setRefreshKey(k => k + 1)
  }

  return (
    <header className="h-16 bg-white border-b border-[#FFF1B5] flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-[18px] font-bold text-[#1a1a1a]">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8680]" />
          <input
            placeholder="Buscar cliente, contenido…"
            className="w-[280px] pl-9 pr-3 py-2 text-[13px] rounded-lg bg-[#FFFDF5] border border-[#FFF1B5] focus:outline-none focus:border-[#7A1832] focus:bg-white transition-colors"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={toggle}
            className="relative w-9 h-9 rounded-lg hover:bg-[#FFFDF5] flex items-center justify-center text-[#3d3d3d] transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#7A1832] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {unread}
              </span>
            )}
          </button>

          {openNotif && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpenNotif(false)} />
              <div className="absolute right-0 mt-2 w-[380px] bg-white rounded-xl shadow-xl border border-[#FFF1B5] z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#f4f3f1] flex items-center justify-between">
                  <span className="font-semibold text-[13px] text-[#1a1a1a]">Notificaciones</span>
                  {allNotifs.length > 0 && (
                    <button
                      onClick={handleOpen}
                      className="text-[11px] text-[#7A1832] hover:underline flex items-center gap-1 font-medium"
                    >
                      <CheckCheck size={12} /> Marcar todas leídas
                    </button>
                  )}
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {allNotifs.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[12px] text-[#8a8680]">
                      <Bell size={24} className="mx-auto mb-2 text-[#d0cecb]" />
                      Sin notificaciones
                    </div>
                  ) : allNotifs.map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-[#f4f3f1] hover:bg-[#FFFDF5]/60 cursor-pointer ${!n.read ? 'bg-[#FFF1B5]/30' : ''}`}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[14px] mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] text-[#1a1a1a] leading-snug">{n.message}</div>
                          <div className="text-[10.5px] text-[#8a8680] mt-1">
                            {new Date(n.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#7A1832] mt-1.5 shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        {member && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
              style={{ background: member.color }}
            >
              {member.avatar}
            </div>
            <ChevronDown size={14} className="text-[#8a8680]" />
          </div>
        )}
      </div>
    </header>
  )
}