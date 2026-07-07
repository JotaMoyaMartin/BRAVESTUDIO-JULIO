'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Profile, PromoCode } from '@/types/database'
import { UserStats, DashboardMetrics } from './page'
import AdminTabs, { TabKey } from '@/components/admin/AdminTabs'
import DashboardTab from '@/components/admin/DashboardTab'
import UsersTab from '@/components/admin/UsersTab'
import CodesTab from '@/components/admin/CodesTab'
import PlansTab from '@/components/admin/PlansTab'
import SubscriptionsTab from '@/components/admin/SubscriptionsTab'
import SupportTab from '@/components/admin/SupportTab'
import InspiracionTab from '@/components/admin/InspiracionTab'
import { hasActiveAccess } from '@/lib/access'

interface Props {
  currentUserId: string
  currentUserRole: string
  users: Profile[]
  promoCodes: PromoCode[]
  userStats: Record<string, UserStats>
  metrics: DashboardMetrics
}

export default function AdminClient({
  currentUserId,
  currentUserRole,
  users: initialUsers,
  promoCodes,
  userStats,
  metrics,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [users, setUsers] = useState(initialUsers)
  const isSuperAdmin = currentUserRole === 'superadmin'

  function handleUserUpdate(updated: Profile) {
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
  }

  function handleUserCreate(newUser: Profile) {
    setUsers(prev => [newUser, ...prev])
  }

  const activeCount = users.filter(u => hasActiveAccess(u)).length
  const subsCount = users.filter(u => u.stripe_subscription_id || (u.subscription_status && u.subscription_status !== 'none')).length

  const counts: Partial<Record<TabKey, number>> = {
    usuarios: users.length,
    codigos: promoCodes.length,
    suscripciones: subsCount,
  }

  return (
    <div className="min-h-screen bg-cream p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center bg-cherry">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-cherry-dark">Admin BRÄVE Studio</h1>
              {isSuperAdmin && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-cherry text-white">Super Admin</span>
              )}
            </div>
            <p className="text-sm text-cherry-dark opacity-60">{activeCount} activas · {users.length} totales</p>
          </div>
          <Link
            href="/inicio"
            className="ml-auto text-sm font-medium px-4 py-2 rounded-[var(--radius-sm)] transition-all"
            style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
          >
            Entrar en App
          </Link>
        </div>

        {/* Tabs */}
        <AdminTabs active={activeTab} onChange={setActiveTab} counts={counts} />

        {/* Tab content */}
        <div>
          {activeTab === 'dashboard' && <DashboardTab metrics={metrics} users={users} />}
          {activeTab === 'usuarios' && (
            <UsersTab
              users={users}
              userStats={userStats}
              currentUserId={currentUserId}
              currentRole={currentUserRole}
              onUserUpdate={handleUserUpdate}
              onUserCreate={handleUserCreate}
            />
          )}
          {activeTab === 'codigos' && <CodesTab promoCodes={promoCodes} />}
          {activeTab === 'planes' && <PlansTab />}
          {activeTab === 'inspiracion' && <InspiracionTab />}
          {activeTab === 'suscripciones' && <SubscriptionsTab users={users} />}
          {activeTab === 'soporte' && (
            <SupportTab users={users} userStats={userStats} onUserUpdate={handleUserUpdate} />
          )}
        </div>
      </div>
    </div>
  )
}