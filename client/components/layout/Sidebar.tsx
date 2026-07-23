'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import {
  Home, Sparkles, Star,
  Film, LayoutGrid, BookOpen, Calendar, LogOut, Menu, X,
  Clapperboard, Wand2, Settings, Shield, Rocket, Crown, GraduationCap, Users, BarChart3,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BraviMascot from '@/components/bravi/BraviMascot'

interface NavItem {
  href: string
  label: string
  icon: typeof Home
  highlight?: boolean
  badge?: string
  pulse?: boolean
}

const navItems: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/reto-10k', label: 'Reto 10K', icon: Rocket, badge: 'NUEVO', highlight: true },
  { href: '/mi-marca', label: 'Mi Marca', icon: Star },
  { href: '/planificar', label: 'Planificación', icon: Sparkles },
  { href: '/crear-contenido', label: 'Crear Contenido', icon: Film },
  { href: '/stories', label: 'Stories BRÄVE', icon: LayoutGrid },
  { href: '/inspiracion-reels', label: 'Inspiración Reels', icon: Clapperboard },
  { href: '/transiciones-reels', label: 'Transiciones Reels', icon: Wand2 },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/calendario', label: 'Calendario', icon: Calendar },
]

const premiumNavItems: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/mi-estrategia', label: 'Mi Estrategia', icon: Star },
  { href: '/plan-contenidos', label: 'Plan de Contenidos', icon: Sparkles },
  { href: '/metricas', label: 'Métricas', icon: BarChart3 },
  { href: '/crear-contenido', label: 'Crear Contenido', icon: Film },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/stories', label: 'Stories BRÄVE', icon: LayoutGrid },
  { href: '/inspiracion-reels', label: 'Inspiración Reels', icon: Clapperboard },
  { href: '/transiciones-reels', label: 'Transiciones Reels', icon: Wand2 },
  { href: '/academia', label: 'Academia', icon: GraduationCap, badge: 'NUEVO', highlight: true },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'
  const isPremium = profile.role === 'premium'
  const activeNavItems = isPremium ? premiumNavItems : navItems
  const adminItems = isAdmin
    ? [
        { href: '/admin', label: 'Panel Admin', icon: Settings },
        { href: '/team', label: 'Modo Equipo', icon: Users },
      ]
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
        {isPremium && (
          <div className="mb-2 mx-1 px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2" style={{ background: 'rgba(212,168,48,0.12)' }}>
            <Crown size={14} style={{ color: '#b8860b' }} />
            <span className="text-xs font-semibold text-cherry-dark">Modo Premium</span>
          </div>
        )}
        {activeNavItems.map(({ href, label, icon: Icon, badge, highlight }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isReto = href === '/reto-10k'
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] text-sm font-medium transition-all ${highlight ? 'glow-ready' : ''}`}
              style={{
                background: active ? 'var(--color-cherry)' : 'transparent',
                color: active ? 'white' : 'var(--color-cherry-dark)',
              }}
            >
              <span className={isReto && !active ? 'reto-glow rounded-full' : ''} style={{ display: 'inline-flex' }}>
                <Icon size={18} />
              </span>
              {label}
              {badge && (
                <span
                  className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'var(--color-cherry)', color: 'white' }}
                >
                  {badge}
                </span>
              )}
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
          <BraviMascot size={56} showMessage={false} />
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
      {/* Mobile top band */}
      <div
        className="fixed top-0 left-0 right-0 z-40 md:hidden flex items-center justify-between px-4 bg-white"
        style={{ height: 56, borderBottom: '1.5px solid var(--color-buttermilk)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center bg-cherry flex-shrink-0">
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <p className="font-bold text-sm text-cherry-dark truncate" style={{ letterSpacing: '-0.3px' }}>
            {profile.salon_name || profile.full_name || 'BRÄVE Studio'}
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 rounded-[var(--radius-sm)] bg-cherry text-white font-semibold text-sm transition-all hover:opacity-90 flex-shrink-0"
          style={{ minHeight: 40 }}
          aria-label="Abrir menú"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
          <span>{open ? 'Cerrar' : 'Menú'}</span>
        </button>
      </div>

      {/* Mobile dropdown backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed left-0 right-0 z-40 md:hidden bg-cream overflow-y-auto"
            style={{ top: 56, maxHeight: 'calc(100vh - 56px)', borderBottom: '1.5px solid var(--color-buttermilk)' }}
          >
            <MobileMenuContent />
          </motion.div>
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

  function MobileMenuContent() {
    return (
      <div className="flex flex-col">
        {/* Admin badge */}
        {isAdmin && (
          <div className="mx-4 mt-4 px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2" style={{ background: 'rgba(122,24,50,0.08)' }}>
            <Shield size={14} className="text-cherry" />
            <span className="text-xs font-semibold text-cherry-dark">Modo Admin activo</span>
          </div>
        )}
        {isPremium && (
          <div className="mx-4 mt-4 px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2" style={{ background: 'rgba(212,168,48,0.12)' }}>
            <Crown size={14} style={{ color: '#b8860b' }} />
            <span className="text-xs font-semibold text-cherry-dark">Modo Premium</span>
          </div>
        )}

        {/* Nav */}
        <nav className="px-4 py-3 space-y-1">
          {activeNavItems.map(({ href, label, icon: Icon, badge, highlight }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const isReto = href === '/reto-10k'
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] text-sm font-medium transition-all ${highlight ? 'glow-ready' : ''}`}
                style={{
                  background: active ? 'var(--color-cherry)' : 'transparent',
                  color: active ? 'white' : 'var(--color-cherry-dark)',
                }}
              >
                <span className={isReto && !active ? 'reto-glow rounded-full' : ''} style={{ display: 'inline-flex' }}>
                  <Icon size={18} />
                </span>
                {label}
                {badge && (
                  <span
                    className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'var(--color-cherry)', color: 'white' }}
                  >
                    {badge}
                  </span>
                )}
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

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-soft">
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
  }
}