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
import Productividad from '@/components/team/screens/Productividad'
import Equipo from '@/components/team/screens/Equipo'
import Notificaciones from '@/components/team/screens/Notificaciones'
import Config from '@/components/team/screens/Config'
import Finanzas from '@/components/team/screens/Finanzas'
import SyncBar from '@/components/team/SyncBar'

const TITLES: Record<NavKey, string> = {
  dashboard: 'Dashboard',
  production: 'Tabla de producción',
  clientes: 'Clientes',
  planificacion: 'Planificación semanal',
  tareas: 'Tareas del equipo',
  productividad: 'Tareas y Productividad',
  equipo: 'Equipo',
  notificaciones: 'Notificaciones',
  config: 'Configuración',
  finanzas: 'Finanzas BRAVECONTENT',
}

export default function TeamShell() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [active, setActive] = useState<NavKey>('dashboard')
  // Al llegar cambios del equipo se vuelve a montar la pantalla con los datos nuevos.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!loading && !user) router.replace('/team/login')
  }, [user, loading, router])

  if (!user) return loading ? <div className="min-h-screen flex items-center justify-center text-[14px] text-[#8a8680]">Cargando el panel del equipo…</div> : null

  return (
    <div className="flex min-h-screen bg-[#FFFDF5]">
      <Sidebar active={active} onNavigate={setActive} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={TITLES[active]} />
        <main key={version} className="flex-1 p-6 overflow-x-auto">
          <SyncBar onRefresh={() => setVersion(v => v + 1)} />
          {active === 'dashboard' && <Dashboard onNavigate={setActive} />}
          {active === 'production' && <Production />}
          {active === 'clientes' && <Clientes />}
          {active === 'planificacion' && <Planificacion />}
          {active === 'tareas' && <Tareas />}
          {active === 'productividad' && <Productividad />}
          {active === 'equipo' && <Equipo />}
          {active === 'notificaciones' && <Notificaciones />}
          {active === 'config' && <Config />}
          {active === 'finanzas' && <Finanzas />}
        </main>
      </div>
    </div>
  )
}