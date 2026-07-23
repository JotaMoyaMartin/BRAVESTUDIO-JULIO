'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { USERS, TEAM } from './mock-data'
import type { User, TeamMember } from './types'

interface AuthState {
  user: User | null
  member: TeamMember | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => boolean
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'brave_content_auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, member: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const userId = JSON.parse(raw) as string
        const user = USERS.find(u => u.id === userId) || null
        const member = user ? TEAM.find(t => t.id === user.memberId) || null : null
        setState({ user, member })
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const login = (email: string, password: string): boolean => {
    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (!user) return false
    const member = TEAM.find(t => t.id === user.memberId) || null
    setState({ user, member })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user.id))
    return true
  }

  const logout = () => {
    setState({ user: null, member: null })
    localStorage.removeItem(STORAGE_KEY)
  }

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