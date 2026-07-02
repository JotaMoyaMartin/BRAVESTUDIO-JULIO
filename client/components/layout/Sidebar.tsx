'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import {
  Home, Sparkles, Star,
  Film, LayoutGrid, BookOpen, Calendar, User, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import BraviMascot from '@/components/bravi/BraviMascot'

const navItems = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/mi-marca', label: 'Mi Marca', icon: Star },
  { href: '/planificar', label: 'Planificación', icon: Sparkles },
  { href: '/crear-contenido', label: 'Crear Contenido', icon: Film },
  { href: '/stories', label: 'Stories BRÄVE', icon: LayoutGrid },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/calendario', label: 'Calendario', icon: Calendar },
  { href: '/account', label: 'Mi Cuenta', icon: User },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(255,241,181,0.4)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#7A1832' }}>
            <span className="text-white text-sm font-bold">B</span>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#591427', letterSpacing: '-0.3px' }}>BRÄVE Studio</p>
            <p className="text-xs" style={{ color: '#7A1832', opacity: 0.7 }}>{profile.salon_name || profile.full_name || 'Mi salón'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? '#7A1832' : 'transparent',
                color: active ? 'white' : '#591427',
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bravi tip */}
      <div className="mx-3 mb-3 p-3 rounded-2xl" style={{ background: '#FFF1B5' }}>
        <div className="flex items-center gap-2">
          <BraviMascot size={36} mood="happy" showMessage={false} />
          <p className="text-xs" style={{ color: '#591427', lineHeight: 1.5 }}>
            "No busques hacerlo perfecto. Busca hacerlo constante."
          </p>
        </div>
      </div>

      {/* User + logout */}
      <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: 'rgba(255,241,181,0.4)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{profile.full_name || profile.email}</p>
            <p className="text-xs" style={{ color: '#7A1832', opacity: 0.7 }}>{profile.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg transition-all hover:bg-red-50"
            title="Cerrar sesión"
          >
            <LogOut size={16} style={{ color: '#7A1832' }} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-xl md:hidden"
        style={{ background: '#7A1832', color: 'white' }}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="fixed inset-y-0 left-0 z-40 w-64 md:hidden transition-transform"
        style={{
          background: 'white',
          borderRight: '1.5px solid rgba(255,241,181,0.6)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: '4px 0 24px rgba(90,20,39,0.08)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 flex-shrink-0 h-screen"
        style={{
          background: 'white',
          borderRight: '1.5px solid rgba(255,241,181,0.6)',
          boxShadow: '4px 0 24px rgba(90,20,39,0.05)',
        }}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
