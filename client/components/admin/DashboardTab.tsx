'use client'

import { motion } from 'framer-motion'
import { Users, CheckCircle, UserPlus, UserX, Clock, CreditCard } from 'lucide-react'
import { ReactNode } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { DashboardMetrics } from '@/app/admin/page'
import { Profile } from '@/types/database'

interface DashboardTabProps {
  metrics: DashboardMetrics
  users: Profile[]
}

interface Kpi {
  label: string
  value: ReactNode
  icon: ReactNode
  tone: 'cherry' | 'green' | 'blue' | 'danger' | 'buttermilk' | 'neutral'
}

export default function DashboardTab({ metrics, users }: DashboardTabProps) {
  const kpis: Kpi[] = [
    { label: 'Usuarios totales', value: metrics.totalUsers, icon: <Users size={18} />, tone: 'cherry' },
    { label: 'Activos', value: metrics.activeUsers, icon: <CheckCircle size={18} />, tone: 'green' },
    { label: 'Nuevos esta semana', value: metrics.newThisWeek, icon: <UserPlus size={18} />, tone: 'blue' },
    { label: 'Cancelados este mes', value: metrics.canceledThisMonth, icon: <UserX size={18} />, tone: 'danger' },
    { label: 'En trial', value: metrics.trialUsers, icon: <Clock size={18} />, tone: 'buttermilk' },
    {
      label: 'MRR (€/mes)',
      value: metrics.mrr === null ? '—' : `${metrics.mrr.toLocaleString('es-ES')} €`,
      icon: <CreditCard size={18} />,
      tone: 'neutral',
    },
  ]

  const recentUsers = users.slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <Card padding="md" shadow="soft" className="h-full">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-cherry-dark opacity-60">{kpi.label}</p>
                  <p className="text-2xl font-bold text-cherry-dark mt-1">{kpi.value}</p>
                </div>
                <span className="text-cherry">{kpi.icon}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-cherry-dark mb-3">Actividad reciente</h3>
        <Card padding="none" shadow="soft" className="overflow-hidden">
          <div className="divide-y border-soft">
            {recentUsers.length === 0 && (
              <p className="px-6 py-6 text-sm text-center text-cherry-dark opacity-50">Sin actividad reciente</p>
            )}
            {recentUsers.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-center justify-between gap-3 px-6 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-cherry-dark truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-cherry-dark opacity-60 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge tone="neutral">
                    {new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}