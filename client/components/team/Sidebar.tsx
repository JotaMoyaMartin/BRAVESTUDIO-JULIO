'use client'
import { useAuth } from '@/lib/team/auth-context'
import { ROLE_LABELS } from '@/lib/team/mock-data'
import {
  LayoutDashboard, Video, Users, Calendar, UserSquare,
  Bell, Settings, LogOut, FolderKanban, CheckSquare, BarChart3,
} from 'lucide-react'
import { useState } from 'react'

export type NavKey = 'dashboard' | 'production' | 'clientes' | 'planificacion' | 'tareas' | 'equipo' | 'notificaciones' | 'config' | 'finanzas'

const NAV: { key: NavKey; label: string; icon: any; roles?: string[] }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'production', label: 'Producción', icon: Video },
  { key: 'clientes', label: 'Clientes', icon: UserSquare },
  { key: 'planificacion', label: 'Planificación', icon: Calendar },
  { key: 'tareas', label: 'Tareas', icon: CheckSquare },
  { key: 'equipo', label: 'Equipo', icon: Users, roles: ['admin'] },
  { key: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { key: 'config', label: 'Configuración', icon: Settings, roles: ['admin'] },
  { key: 'finanzas', label: 'Finanzas', icon: BarChart3, roles: ['admin'] },
]

export default function Sidebar({ active, onNavigate }: { active: NavKey; onNavigate: (k: NavKey) => void }) {
  const { user, member, logout } = useAuth()
  if (!user || !member) return null

  const items = NAV.filter(n => !n.roles || n.roles.includes(user.role))

  return (
    <aside className="w-[240px] shrink-0 bg-white border-r border-[#FFF1B5] flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-[#FFF1B5]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#7A1832] flex items-center justify-center text-white font-bold text-sm">B</div>
          <div>
            <div className="font-bold text-[15px] text-[#1a1a1a] leading-tight">BRÄVE</div>
            <div className="text-[10px] uppercase tracking-wider text-[#8a8680]">Content Studio</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {items.map(item => {
          const Icon = item.icon
          const active2 = active === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13.5px] font-medium transition-colors ${
                active2
                  ? 'bg-[#FFF1B5] text-[#7A1832] border-r-2 border-[#7A1832]'
                  : 'text-[#3d3d3d] hover:bg-[#FFFDF5]'
              }`}
            >
              <Icon size={18} className={active2 ? 'text-[#7A1832]' : 'text-[#8a8680]'} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-[#FFF1B5] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: member.color }}
          >
            {member.avatar}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13px] text-[#1a1a1a] truncate">{user.name}</div>
            <div className="text-[11px] text-[#8a8680]">{ROLE_LABELS[user.role]}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-[12px] text-[#8a8680] hover:text-[#e03131] py-2 rounded-md hover:bg-[#FFF5F5] transition-colors"
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}