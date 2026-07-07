'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import {
  Home, Sparkles, Star,
  Film, LayoutGrid, BookOpen, Calendar, LogOut, Menu, X,
  Clapperboard, Settings, Shield
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BraviMascot from '@/components/bravi/BraviMascot'

const navItems = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/mi-marca', label: 'Mi Marca', icon: Star },
  { href: '/planificar', label: 'Planificación', icon: Sparkles },
  { href: '/crear-contenido', label: 'Crear Contenido', icon: Film },
  { href: '/stories', label: 'Stories BRÄVE', icon: LayoutGrid },
  { href: '/inspiracion-reels', label: 'Inspiración Reels', icon: Clapperboard },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/calendario', label: 'Calendario', icon: Calendar },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'
  const adminItems = isAdmin
    ? [{ href: '/admin', label: 'Panel Admin', icon: Settings }]
    : []

  // Auto-close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-soft">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center bg-cherry">
            <span className="text-white text-sm font-bold">B</span>
          </div>
          <div>
            <p className="font-bold text-sm text-cherry-dark" style={{ letterSpacing: '-0.3px' }}>BRÄVE Studio</p>
            <p className="text-xs text-cherry opacity-70">{profile.salon_name || profile.full_name || 'Mi salón'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {isAdmin && (
          <div className="mb-2 mx-1 px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2" style={{ background: 'rgba(122,24,50,0.08)' }}>
            <Shield size={14} className="text-cherry" />
            <span className="text-xs font-semibold text-cherry-dark">Modo Admin activo</span>
          </div>
        )}
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--color-cherry)' : 'transparent',
                color: active ? 'white' : 'var(--color-cherry-dark)',
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
        {adminItems.length > 0 && (
          <>
            <div className="my-2 border-t border-soft" />
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] text-sm font-medium transition-all"
                  style={{
                    background: active ? 'var(--color-cherry)' : 'transparent',
                    color: active ? 'white' : 'var(--color-ink)',
                  }}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Bravi tip */}
      <div className="mx-3 mb-3 p-3 rounded-[var(--radius-md)] bg-buttermilk">
        <div className="flex items-center gap-2">
          <BraviMascot size={36} showMessage={false} />
          <p className="text-xs text-cherry-dark" style={{ lineHeight: 1.5 }}>
            "No busques hacerlo perfecto. Busca hacerlo constante."
          </p>
        </div>
      </div>

      {/* User + logout */}
      <div className="px-3 pb-4 border-t border-soft pt-4">
        <div className="flex items-center justify-between px-4 py-2">
          <Link
            href="/account"
            className="flex-1 min-w-0 transition-all hover:opacity-70"
            title="Mi cuenta"
          >
            <p className="text-sm font-medium truncate text-ink">{profile.full_name || profile.email}</p>
            <p className="text-xs truncate text-cherry opacity-70">{profile.email}</p>
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 rounded-[var(--radius-sm)] transition-all hover:bg-[rgba(192,57,78,0.08)] flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut size={16} className="text-cherry" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-[var(--radius-sm)] md:hidden bg-cherry text-white shadow-medium"
        onClick={() => setOpen(!open)}
        aria-label="Abrir menú"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence>
        {/* Mobile backdrop */}
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-40 w-64 md:hidden bg-white"
            style={{ borderRight: '1.5px solid var(--color-buttermilk)' }}
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 flex-shrink-0 h-screen bg-white"
        style={{ borderRight: '1.5px solid var(--color-buttermilk)' }}
      >
        <SidebarContent />
      </aside>
    </>
  )
}