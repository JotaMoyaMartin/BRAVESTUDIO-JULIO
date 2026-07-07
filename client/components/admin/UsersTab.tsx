'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, Users as UsersIcon, UserPlus } from 'lucide-react'
import { Profile } from '@/types/database'
import { hasActiveAccess } from '@/lib/access'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionTitle from '@/components/ui/SectionTitle'
import UserDrawer from './UserDrawer'
import CreateUserModal from './CreateUserModal'
import { UserStats } from '@/app/admin/page'

interface UsersTabProps {
  users: Profile[]
  userStats: Record<string, UserStats>
  currentUserId: string
  currentRole: string
  onUserUpdate: (user: Profile) => void
  onUserCreate: (user: Profile) => void
}

const PAGE_SIZE = 25

const SOURCE_TONE: Record<Profile['access_source'], 'blue' | 'green' | 'buttermilk' | 'neutral' | 'cherry'> = {
  manual: 'blue',
  stripe: 'cherry',
  skool: 'green',
  promo: 'buttermilk',
  none: 'neutral',
}

const SUB_TONE: Record<string, 'green' | 'buttermilk' | 'danger' | 'neutral'> = {
  active: 'green',
  trialing: 'buttermilk',
  canceled: 'danger',
  past_due: 'danger',
  unpaid: 'danger',
  none: 'neutral',
}

export default function UsersTab({ users, userStats, currentUserId, currentRole, onUserUpdate, onUserCreate }: UsersTabProps) {
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState<'all' | Profile['access_source']>('all')
  const [filterSub, setFilterSub] = useState<'all' | Profile['subscription_status']>('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      if (filterSource !== 'all' && u.access_source !== filterSource) return false
      if (filterSub !== 'all' && u.subscription_status !== filterSub) return false
      if (q) {
        const hay = `${u.full_name ?? ''} ${u.email ?? ''} ${u.salon_name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [users, search, filterSource, filterSub])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageUsers = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  function selectStyle() {
    return {
      border: '1.5px solid rgba(122,24,50,0.2)',
      background: 'var(--color-cream)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      fontSize: 13,
      outline: 'none',
      cursor: 'pointer',
    } as const
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle
          title="Usuarios"
          subtitle={`${filtered.length} resultado(s) · ${users.length} totales`}
          icon={<UsersIcon size={18} />}
        />
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-cherry text-white hover:opacity-90 shadow-soft"
        >
          <UserPlus size={16} /> Crear usuario
        </button>
      </div>

      {/* Filtros */}
      <Card padding="md" shadow="soft">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry-dark opacity-40" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Buscar nombre, email, salón…"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none"
            />
          </div>
          <select value={filterSource} onChange={e => { setFilterSource(e.target.value as typeof filterSource); setPage(0) }} style={selectStyle()}>
            <option value="all">Todas las fuentes</option>
            <option value="stripe">Stripe</option>
            <option value="skool">Skool</option>
            <option value="promo">Promo</option>
            <option value="manual">Manual</option>
            <option value="none">Sin acceso</option>
          </select>
          <select value={filterSub ?? 'none'} onChange={e => { setFilterSub(e.target.value as typeof filterSub); setPage(0) }} style={selectStyle()}>
            <option value="all">Todas las suscripciones</option>
            <option value="active">Activas</option>
            <option value="trialing">Trial</option>
            <option value="canceled">Canceladas</option>
            <option value="past_due">Past due</option>
            <option value="unpaid">Unpaid</option>
            <option value="none">Sin suscripción</option>
          </select>
          {(search || filterSource !== 'all' || filterSub !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterSource('all'); setFilterSub('all'); setPage(0) }}
              className="px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold bg-buttermilk text-cherry-dark hover:bg-[#ffe98a]"
            >
              Limpiar
            </button>
          )}
        </div>
      </Card>

      {/* Tabla */}
      <Card padding="none" shadow="soft" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-cherry-dark opacity-60" style={{ background: 'var(--color-warm-gray)' }}>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Ciudad</th>
                <th className="px-4 py-3 font-semibold">Acceso</th>
                <th className="px-4 py-3 font-semibold">Suscripción</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y border-soft">
              {pageUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-cherry-dark opacity-50">
                    No hay usuarias que coincidan
                  </td>
                </tr>
              )}
              {pageUsers.map((u, i) => {
                const isActive = hasActiveAccess(u)
                const stats = userStats[u.id]
                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelected(u)}
                    className="cursor-pointer hover:bg-[rgba(122,24,50,0.03)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-cherry-dark">
                        {u.full_name || '—'}
                        {u.id === currentUserId && <Badge tone="buttermilk" className="ml-2">Tú</Badge>}
                      </div>
                      {u.salon_name && <div className="text-xs text-cherry-dark opacity-50">{u.salon_name}</div>}
                      {stats && <div className="text-xs text-cherry-dark opacity-40 mt-0.5">{stats.contentCount} cont.</div>}
                    </td>
                    <td className="px-4 py-3 text-cherry-dark opacity-70">{u.email}</td>
                    <td className="px-4 py-3 text-cherry-dark opacity-70">{u.city || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={isActive ? 'green' : 'danger'}>
                        {isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge tone={SOURCE_TONE[u.access_source]} className="ml-1">
                        {u.access_source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.subscription_status && u.subscription_status !== 'none' ? (
                        <Badge tone={SUB_TONE[u.subscription_status] || 'neutral'}>{u.subscription_status}</Badge>
                      ) : (
                        <span className="text-cherry-dark opacity-40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cherry-dark opacity-70">{u.subscription_plan || '—'}</td>
                    <td className="px-4 py-3 text-cherry-dark opacity-60 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-soft">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-2 rounded-[var(--radius-sm)] bg-buttermilk text-cherry-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ffe98a]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-cherry-dark">Página {safePage + 1} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-2 rounded-[var(--radius-sm)] bg-buttermilk text-cherry-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ffe98a]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </Card>

      <UserDrawer
        user={selected}
        onClose={() => setSelected(null)}
        onUpdate={(updated) => {
          onUserUpdate(updated)
          setSelected(updated)
        }}
        stats={selected ? userStats[selected.id] : undefined}
      />

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(u) => {
          onUserCreate(u)
          setSelected(u)
        }}
        isSuperAdmin={currentRole === 'superadmin'}
      />
    </div>
  )
}