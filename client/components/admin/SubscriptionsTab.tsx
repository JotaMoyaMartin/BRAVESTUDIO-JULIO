'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CreditCard } from 'lucide-react'
import { Profile } from '@/types/database'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionTitle from '@/components/ui/SectionTitle'

interface SubscriptionsTabProps {
  users: Profile[]
}

const SUB_TONE: Record<string, 'green' | 'buttermilk' | 'danger' | 'neutral'> = {
  active: 'green',
  trialing: 'buttermilk',
  canceled: 'danger',
  past_due: 'danger',
  unpaid: 'danger',
  none: 'neutral',
}

export default function SubscriptionsTab({ users }: SubscriptionsTabProps) {
  const [filter, setFilter] = useState<'all' | Profile['subscription_status']>('all')

  const subs = useMemo(
    () => users.filter(u => u.stripe_subscription_id || (u.subscription_status && u.subscription_status !== 'none')),
    [users]
  )

  const filtered = useMemo(
    () => subs.filter(u => filter === 'all' || u.subscription_status === filter),
    [subs, filter]
  )

  const selectStyle = {
    border: '1.5px solid rgba(122,24,50,0.2)',
    background: 'var(--color-cream)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  } as const

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Suscripciones"
        subtitle={`${filtered.length} suscripción(es) · ${subs.length} totales`}
        icon={<CreditCard size={18} />}
        action={
          <select value={filter ?? 'none'} onChange={e => setFilter(e.target.value as typeof filter)} style={selectStyle}>
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="trialing">Trial</option>
            <option value="canceled">Canceladas</option>
            <option value="past_due">Past due</option>
            <option value="unpaid">Unpaid</option>
          </select>
        }
      />

      <Card padding="none" shadow="soft" className="overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-cherry-dark opacity-50">No hay suscripciones que coincidan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-cherry-dark opacity-60" style={{ background: 'var(--color-warm-gray)' }}>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Customer ID</th>
                </tr>
              </thead>
              <tbody className="divide-y border-soft">
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-[rgba(122,24,50,0.03)] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-cherry-dark">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-cherry-dark opacity-70">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.subscription_plan === 'yearly' ? 'cherry' : 'buttermilk'}>
                        {u.subscription_plan || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.subscription_status && (
                        <Badge tone={SUB_TONE[u.subscription_status] || 'neutral'}>
                          {u.subscription_status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cherry-dark opacity-60 font-mono text-xs">
                      {u.stripe_customer_id || '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}