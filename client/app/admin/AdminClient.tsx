'use client'

import { useState } from 'react'
import { ShieldCheck, Crown } from 'lucide-react'
import Link from 'next/link'
import { Profile, PromoCode } from '@/types/database'
import { UserStats, DashboardMetrics } from './page'
import AdminTabs, { TabKey } from '@/components/admin/AdminTabs'
import DashboardTab from '@/components/admin/DashboardTab'
import AnalyticsTab from '@/components/admin/AnalyticsTab'
import GestionPremiumTab from '@/components/admin/GestionPremiumTab'
import UsersTab from '@/components/admin/UsersTab'
import CodesTab from '@/components/admin/CodesTab'
import PlansTab from '@/components/admin/PlansTab'
import SubscriptionsTab from '@/components/admin/SubscriptionsTab'
import SupportTab from '@/components/admin/SupportTab'
import InspiracionTab from '@/components/admin/InspiracionTab'
import TransicionTab from '@/components/admin/TransicionTab'
import Reto10kTab from '@/components/admin/Reto10kTab'
import AcademiaTab from '@/components/admin/AcademiaTab'
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

  function enterPremiumPreview() {
    document.cookie = 'brave_preview_premium=true; path=/; max-age=3600'
    window.location.href = '/inicio'
  }

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
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={enterPremiumPreview}
              className="text-sm font-medium px-4 py-2 rounded-[var(--radius-sm)] transition-all inline-flex items-center gap-1.5"
              style={{ background: 'rgba(184,134,11,0.12)', color: '#b8860b', border: '1px solid rgba(184,134,11,0.2)' }}
              title="Ver la app como usuaria premium"
            >
              <Crown size={14} /> Vista Premium
            </button>
            <Link
              href="/inicio"
              className="text-sm font-medium px-4 py-2 rounded-[var(--radius-sm)] transition-all"
              style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
            >
              Entrar en App
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <AdminTabs active={activeTab} onChange={setActiveTab} counts={counts} />

        {/* Tab content */}
        <div>
          {activeTab === 'dashboard' && <DashboardTab metrics={metrics} users={users} />}
          {activeTab === 'analitica' && <AnalyticsTab users={users} onUserUpdate={handleUserUpdate} />}
          {activeTab === 'gestion-premium' && <GestionPremiumTab />}
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
          {activeTab === 'transiciones' && <TransicionTab />}
          {activeTab === 'reto10k' && <Reto10kTab />}
          {activeTab === 'academia' && <AcademiaTab />}
          {activeTab === 'suscripciones' && <SubscriptionsTab users={users} />}
          {activeTab === 'soporte' && (
            <SupportTab users={users} userStats={userStats} onUserUpdate={handleUserUpdate} />
          )}
        </div>
      </div>
    </div>
  )
}