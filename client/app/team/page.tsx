'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/team/auth-context'
import Sidebar, { NavKey } from '@/components/team/Sidebar'
import Topbar from '@/components/team/Topbar'
import Dashboard from '@/components/team/screens/Dashboard'
import Production from '@/components/team/screens/Production'
import Clientes from '@/components/team/screens/Clientes'
import Planificacion from '@/components/team/screens/Planificacion'
import Tareas from '@/components/team/screens/Tareas'
import Equipo from '@/components/team/screens/Equipo'
import Notificaciones from '@/components/team/screens/Notificaciones'
import Config from '@/components/team/screens/Config'
import Finanzas from '@/components/team/screens/Finanzas'

const TITLES: Record<NavKey, string> = {
  dashboard: 'Dashboard',
  production: 'Tabla de producción',
  clientes: 'Clientes',
  planificacion: 'Planificación semanal',
  tareas: 'Tareas del equipo',
  equipo: 'Equipo',
  notificaciones: 'Notificaciones',
  config: 'Configuración',
  finanzas: 'Finanzas BRAVECONTENT',
}

export default function TeamShell() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [active, setActive] = useState<NavKey>('dashboard')

  useEffect(() => {
    if (!loading && !user) router.replace('/team/login')
  }, [user, loading, router])

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#FFFDF5]">
      <Sidebar active={active} onNavigate={setActive} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={TITLES[active]} />
        <main className="flex-1 p-6 overflow-x-auto">
          {active === 'dashboard' && <Dashboard onNavigate={setActive} />}
          {active === 'production' && <Production />}
          {active === 'clientes' && <Clientes />}
          {active === 'planificacion' && <Planificacion />}
          {active === 'tareas' && <Tareas />}
          {active === 'equipo' && <Equipo />}
          {active === 'notificaciones' && <Notificaciones />}
          {active === 'config' && <Config />}
          {active === 'finanzas' && <Finanzas />}
        </main>
      </div>
    </div>
  )
}