'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, LifeBuoy, ChevronRight } from 'lucide-react'
import { Profile } from '@/types/database'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionTitle from '@/components/ui/SectionTitle'
import UserDrawer from './UserDrawer'
import { UserStats } from '@/app/admin/page'

interface SupportTabProps {
  users: Profile[]
  userStats: Record<string, UserStats>
  onUserUpdate: (user: Profile) => void
}

export default function SupportTab({ users, userStats, onUserUpdate }: SupportTabProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return users.filter(u => {
      const hay = `${u.full_name ?? ''} ${u.email ?? ''} ${u.salon_name ?? ''}`.toLowerCase()
      return hay.includes(q)
    }).slice(0, 20)
  }, [users, search])

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Soporte"
        subtitle="Busca una usuaria para ver su ficha"
        icon={<LifeBuoy size={18} />}
      />

      <Card padding="md" shadow="soft">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry-dark opacity-40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por email o nombre…"
            className="w-full pl-10 pr-3 py-3 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none"
            autoFocus
          />
        </div>
      </Card>

      {search.trim() === '' ? (
        <Card padding="lg" shadow="soft" className="text-center">
          <div className="py-8">
            <Search size={32} className="mx-auto text-cherry-dark opacity-30 mb-3" />
            <p className="text-sm text-cherry-dark opacity-60">Busca una usuaria para ver su ficha</p>
          </div>
        </Card>
      ) : results.length === 0 ? (
        <Card padding="lg" shadow="soft" className="text-center">
          <p className="text-sm text-cherry-dark opacity-50 py-6">No se encontraron usuarias con "{search}"</p>
        </Card>
      ) : (
        <Card padding="none" shadow="soft" className="overflow-hidden">
          <div className="divide-y border-soft">
            {results.map((u, i) => (
              <motion.button
                key={u.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(u)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[rgba(122,24,50,0.03)] transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-cherry-dark truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-cherry-dark opacity-60 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge tone="neutral">{u.subscription_plan || 'sin plan'}</Badge>
                  <ChevronRight size={16} className="text-cherry-dark opacity-40" />
                </div>
              </motion.button>
            ))}
          </div>
        </Card>
      )}

      <UserDrawer
        user={selected}
        onClose={() => setSelected(null)}
        onUpdate={(updated) => {
          onUserUpdate(updated)
          setSelected(updated)
        }}
        stats={selected ? userStats[selected.id] : undefined}
      />
    </div>
  )
}