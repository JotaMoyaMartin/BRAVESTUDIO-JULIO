'use client'
/**
 * Acceso al panel del equipo.
 * - Con Supabase (bravestudio.app): cuenta real de cada persona; su rol sale
 *   de la tabla team_members. Al entrar se cargan los datos compartidos.
 * - Modo demo (local, sin Supabase): usuarias de prueba como antes.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { IS_DEMO } from '@/lib/demo'
import { createClient } from '@/lib/supabase/client'
import { USERS, TEAM } from './mock-data'
import { startSync, stopSync } from './sync/engine'
import { LS_KEYS } from './sync/records'
import type { User, TeamMember, Role } from './types'

interface AuthState {
  user: User | null
  member: TeamMember | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const DEMO_KEY = 'brave_content_auth'

type MemberRow = { member_id: string; name: string; role: Role }

/** Perfil del equipo de la usuaria con sesión (o error si no es del equipo). */
async function loadTeamUser(): Promise<AuthState | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, member: null }
  const { data: row } = await supabase.from('team_members').select('member_id, name, role').eq('profile_id', user.id).maybeSingle()
  let m = row as MemberRow | null
  if (!m) {
    // Admins de la app sin ficha en el equipo: entran como Dirección.
    const { data: prof } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
    const role = (prof as { role?: string } | null)?.role
    if (role !== 'admin' && role !== 'superadmin') return { error: 'Tu cuenta no está en el equipo BRÄVE. Pide a Jota que te dé acceso.' }
    const adminMember = TEAM.find(t => t.role === 'admin')
    m = { member_id: adminMember?.id ?? 'tm-admin', name: (prof as { full_name?: string } | null)?.full_name || adminMember?.name || 'Dirección', role: 'admin' }
  }
  // Carga los datos compartidos ANTES de mostrar las pantallas.
  await startSync()
  const member: TeamMember = TEAM.find(t => t.id === m!.member_id) ?? {
    id: m.member_id, name: m.name, role: m.role, avatar: m.name.slice(0, 2).toUpperCase(), color: '#7A1832', clients: [], status: 'disponible',
  }
  return {
    user: { id: user.id, email: user.email ?? '', password: '', name: m.name, role: m.role, memberId: member.id },
    member,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, member: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    if (IS_DEMO) {
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        if (raw) {
          const userId = JSON.parse(raw) as string
          const user = USERS.find(u => u.id === userId) || null
          const member = user ? TEAM.find(t => t.id === user.memberId) || null : null
          setState({ user, member })
        }
      } catch { /* ignore */ }
      setLoading(false)
      return
    }
    loadTeamUser()
      .then(r => { if (alive && !('error' in r)) setState(r) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (IS_DEMO) {
      const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
      if (!user) return { ok: false, error: 'Email o contraseña incorrectos.' }
      const member = TEAM.find(t => t.id === user.memberId) || null
      setState({ user, member })
      localStorage.setItem(DEMO_KEY, JSON.stringify(user.id))
      return { ok: true }
    }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return { ok: false, error: 'Email o contraseña incorrectos.' }
    const r = await loadTeamUser()
    if ('error' in r) { await supabase.auth.signOut(); return { ok: false, error: r.error } }
    setState(r)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    setState({ user: null, member: null })
    if (IS_DEMO) { localStorage.removeItem(DEMO_KEY); return }
    stopSync()
    // En un ordenador compartido, no dejar copia de los datos del equipo.
    try { Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k)); localStorage.removeItem('brave_team_sync_snapshot') } catch { /* sin storage */ }
    void createClient().auth.signOut().finally(() => { window.location.href = '/team/login' })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
