'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, PromoCode } from '@/types/database'
import { hasActiveAccess } from '@/lib/access'
import { UserStats } from './page'
import {
  Users, CheckCircle, XCircle, ShieldCheck, Tag, Plus, Trash2, AlertTriangle,
  Pencil, Search, ChevronLeft, ChevronRight, X, CreditCard,
} from 'lucide-react'
import Link from 'next/link'

interface Props {
  currentUserId: string
  currentUserRole: string
  users: Profile[]
  promoCodes: PromoCode[]
  userStats: Record<string, UserStats>
}

const SOURCE_LABELS: Record<Profile['access_source'], { label: string; bg: string; color: string }> = {
  manual:  { label: 'Manual',  bg: '#EEF2FF', color: '#4338ca' },
  stripe:  { label: 'Stripe',  bg: '#EFF6FF', color: '#1d4ed8' },
  skool:   { label: 'Skool',   bg: '#F0FDF4', color: '#15803d' },
  promo:   { label: 'Promo',   bg: '#FFF7ED', color: '#c2410c' },
  none:    { label: '',        bg: '',        color: '' },
}

const PAGE_SIZE = 12

export default function AdminClient({ currentUserId, currentUserRole, users: initialUsers, promoCodes: initialCodes, userStats: initialStats }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [promoCodes, setPromoCodes] = useState(initialCodes)
  const [loadingUser, setLoadingUser] = useState<string | null>(null)
  const [loadingPromo, setLoadingPromo] = useState<string | null>(null)
  const [showCreatePromo, setShowCreatePromo] = useState(false)
  const [newPromo, setNewPromo] = useState({ code: '', description: '', access_days: 30, max_redemptions: '', expires_at: '', code_type: 'promo' as 'promo' | 'skool' })
  const [creatingPromo, setCreatingPromo] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)

  // Busqueda, filtros y paginacion
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin' | 'superadmin'>('all')
  const [filterSource, setFilterSource] = useState<'all' | Profile['access_source']>('all')
  const [page, setPage] = useState(0)

  // Edicion de usuario
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState<{ full_name: string; salon_name: string; city: string; professional_role: string; role: Profile['role'] }>({ full_name: '', salon_name: '', city: '', professional_role: '', role: 'user' })
  const [savingEdit, setSavingEdit] = useState(false)

  // Cancelar suscripcion
  const [cancelSubConfirm, setCancelSubConfirm] = useState<Profile | null>(null)
  const [cancelingSub, setCancelingSub] = useState(false)

  // Edicion / borrado de promos
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null)
  const [editPromoForm, setEditPromoForm] = useState<{ description: string; access_days: number; max_redemptions: string; expires_at: string; code_type: 'promo' | 'skool' }>({ description: '', access_days: 30, max_redemptions: '', expires_at: '', code_type: 'promo' })
  const [savingPromoEdit, setSavingPromoEdit] = useState(false)
  const [deletePromoConfirm, setDeletePromoConfirm] = useState<PromoCode | null>(null)
  const [deletingPromo, setDeletingPromo] = useState(false)

  const isSuperAdmin = currentUserRole === 'superadmin'

  // Filtrado
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      if (filterStatus === 'active' && !hasActiveAccess(u)) return false
      if (filterStatus === 'inactive' && hasActiveAccess(u)) return false
      if (filterRole !== 'all' && u.role !== filterRole) return false
      if (filterSource !== 'all' && u.access_source !== filterSource) return false
      if (q) {
        const hay = `${u.full_name ?? ''} ${u.email ?? ''} ${u.salon_name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [users, search, filterStatus, filterRole, filterSource])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageUsers = filteredUsers.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const active = users.filter(u => hasActiveAccess(u)).length

  function openEdit(user: Profile) {
    setEditUser(user)
    setEditForm({ full_name: user.full_name ?? '', salon_name: user.salon_name ?? '', city: user.city ?? '', professional_role: user.professional_role ?? '', role: user.role })
  }

  async function saveUserEdit() {
    if (!editUser) return
    setSavingEdit(true)
    const supabase = createClient()
    // Guardar nombre, salon, ciudad y rol profesional (RLS permite a admins actualizar profiles)
    await supabase.from('profiles')
      .update({ full_name: editForm.full_name || null, salon_name: editForm.salon_name || null, city: editForm.city || null, professional_role: editForm.professional_role || null })
      .eq('id', editUser.id)
    // Si cambio el rol y no es a si mismo, llamar al API
    if (editForm.role !== editUser.role && editUser.id !== currentUserId) {
      await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editUser.id, role: editForm.role }),
      })
    }
    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, full_name: editForm.full_name || null, salon_name: editForm.salon_name || null, city: editForm.city || null, professional_role: editForm.professional_role || null, role: editForm.role } : u))
    setEditUser(null)
    setSavingEdit(false)
  }

  async function setAccess(user: Profile, activate: boolean, source: Profile['access_source'] = 'manual') {
    setLoadingUser(user.id)
    const supabase = createClient()
    const update = {
      access_status: activate ? 'active' : 'inactive',
      access_source: activate ? source : 'none',
      is_active: activate,
    } as Partial<Profile>
    await supabase.from('profiles').update(update).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...update } : u))
    setLoadingUser(null)
  }

  async function setSource(user: Profile, source: Profile['access_source']) {
    setLoadingUser(user.id)
    const supabase = createClient()
    await supabase.from('profiles').update({ access_source: source }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, access_source: source } : u))
    setLoadingUser(null)
  }

  async function deleteUser() {
    if (!deleteConfirm) return
    setDeletingUser(true)
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: deleteConfirm.id }),
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id))
    }
    setDeleteConfirm(null)
    setDeletingUser(false)
  }

  async function cancelSubscription() {
    if (!cancelSubConfirm) return
    setCancelingSub(true)
    const res = await fetch('/api/admin/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: cancelSubConfirm.id }),
    })
    if (res.ok) {
      // Marcar localmente como pendiente de cancelacion (el webhook confirmara al final del periodo)
      setUsers(prev => prev.map(u => u.id === cancelSubConfirm.id ? { ...u, subscription_status: 'canceled' } : u))
    }
    setCancelSubConfirm(null)
    setCancelingSub(false)
  }

  async function togglePromo(promo: PromoCode) {
    setLoadingPromo(promo.id)
    const supabase = createClient()
    await supabase.from('promo_codes').update({ is_active: !promo.is_active }).eq('id', promo.id)
    setPromoCodes(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !promo.is_active } : p))
    setLoadingPromo(null)
  }

  async function createPromo(e: React.FormEvent) {
    e.preventDefault()
    setCreatingPromo(true)
    const supabase = createClient()
    const insert = {
      code: newPromo.code.trim().toUpperCase(),
      description: newPromo.description || null,
      access_days: newPromo.access_days,
      max_redemptions: newPromo.max_redemptions ? parseInt(newPromo.max_redemptions) : null,
      expires_at: newPromo.expires_at || null,
      code_type: newPromo.code_type,
    }
    const { data } = await supabase.from('promo_codes').insert(insert).select().single()
    if (data) setPromoCodes(prev => [data as PromoCode, ...prev])
    setNewPromo({ code: '', description: '', access_days: 30, max_redemptions: '', expires_at: '', code_type: 'promo' })
    setShowCreatePromo(false)
    setCreatingPromo(false)
  }

  function openEditPromo(promo: PromoCode) {
    setEditPromo(promo)
    setEditPromoForm({
      description: promo.description ?? '',
      access_days: promo.access_days,
      max_redemptions: promo.max_redemptions?.toString() ?? '',
      expires_at: promo.expires_at ? promo.expires_at.slice(0, 10) : '',
      code_type: promo.code_type ?? 'promo',
    })
  }

  async function savePromoEdit() {
    if (!editPromo) return
    setSavingPromoEdit(true)
    const supabase = createClient()
    const update = {
      description: editPromoForm.description || null,
      access_days: editPromoForm.access_days,
      max_redemptions: editPromoForm.max_redemptions ? parseInt(editPromoForm.max_redemptions) : null,
      expires_at: editPromoForm.expires_at || null,
      code_type: editPromoForm.code_type,
    }
    await supabase.from('promo_codes').update(update).eq('id', editPromo.id)
    setPromoCodes(prev => prev.map(p => p.id === editPromo.id ? { ...p, ...update } : p))
    setEditPromo(null)
    setSavingPromoEdit(false)
  }

  async function deletePromo() {
    if (!deletePromoConfirm) return
    setDeletingPromo(true)
    const supabase = createClient()
    await supabase.from('promo_codes').delete().eq('id', deletePromoConfirm.id)
    setPromoCodes(prev => prev.filter(p => p.id !== deletePromoConfirm.id))
    setDeletePromoConfirm(null)
    setDeletingPromo(false)
  }

  const inputStyle = { border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', borderRadius: 12, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }
  const selectStyle = { border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', borderRadius: 12, padding: '8px 12px', fontSize: 13, outline: 'none', cursor: 'pointer' }

  return (
    <div className="min-h-screen p-6" style={{ background: '#FFFDF5' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#7A1832' }}>
            <ShieldCheck size={20} style={{ color: 'white' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Admin BRÄVE Studio</h1>
              {isSuperAdmin && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#7A1832', color: 'white' }}>Super Admin</span>
              )}
            </div>
            <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>{active} activos · {users.length} totales</p>
          </div>
          <Link href="/inicio" className="ml-auto text-sm" style={{ color: '#591427', opacity: 0.6 }}>← App</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {([['Total', users.length, '#7A1832'], ['Activos', active, '#2a5a6a'], ['Inactivos', users.length - active, '#c0394e']] as const).map(([label, val, color]) => (
            <div key={label} className="p-4 rounded-2xl text-center" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
              <p className="text-2xl font-bold" style={{ color }}>{val}</p>
              <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Users */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
          <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.5)' }}>
            <Users size={18} style={{ color: '#7A1832' }} />
            <h2 className="font-semibold" style={{ color: '#1a1a1a' }}>Usuarios</h2>
            <span className="ml-auto text-xs" style={{ color: '#591427', opacity: 0.5 }}>{filteredUsers.length} resultado(s)</span>
          </div>

          {/* Barra de busqueda y filtros */}
          <div className="flex flex-wrap items-center gap-2 px-6 py-3" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.3)', background: '#FFFDF5' }}>
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#591427', opacity: 0.4 }} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Buscar nombre, email, salón…"
                style={{ ...inputStyle, paddingLeft: 30, border: '1.5px solid rgba(122,24,50,0.2)' }}
              />
            </div>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setPage(0) }} style={selectStyle}>
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <select value={filterRole} onChange={e => { setFilterRole(e.target.value as typeof filterRole); setPage(0) }} style={selectStyle}>
              <option value="all">Todos los roles</option>
              <option value="user">Usuarios</option>
              <option value="admin">Admins</option>
              {isSuperAdmin && <option value="superadmin">Super Admins</option>}
            </select>
            <select value={filterSource} onChange={e => { setFilterSource(e.target.value as typeof filterSource); setPage(0) }} style={selectStyle}>
              <option value="all">Todas las fuentes</option>
              <option value="stripe">Stripe</option>
              <option value="skool">School</option>
              <option value="promo">Promo</option>
              <option value="manual">Manual</option>
              <option value="none">Sin acceso</option>
            </select>
            {(search || filterStatus !== 'all' || filterRole !== 'all' || filterSource !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilterStatus('all'); setFilterRole('all'); setFilterSource('all'); setPage(0) }}
                className="px-2 py-1 rounded-lg text-xs"
                style={{ background: '#FFF1B5', color: '#591427', cursor: 'pointer' }}
              >Limpiar</button>
            )}
          </div>

          <div className="divide-y" style={{ borderColor: 'rgba(255,241,181,0.3)' }}>
            {pageUsers.length === 0 && (
              <p className="px-6 py-6 text-sm text-center" style={{ color: '#591427', opacity: 0.5 }}>No hay usuarios que coincidan</p>
            )}
            {pageUsers.map(user => {
              const isActive = hasActiveAccess(user)
              const src = SOURCE_LABELS[user.access_source]
              const canDelete = user.id !== currentUserId && (user.role !== 'superadmin' || isSuperAdmin)
              const stats = initialStats[user.id]
              const hasActiveSub = user.subscription_status === 'active' || user.subscription_status === 'trialing'
              const subStatusStyles: Record<string, { bg: string; color: string }> = {
                active:    { bg: '#F0FDF4', color: '#15803d' },
                trialing:  { bg: '#FFF1B5', color: '#7A1832' },
                canceled:  { bg: '#FEF2F2', color: '#b91c1c' },
                past_due:  { bg: '#FEF2F2', color: '#b91c1c' },
                unpaid:    { bg: '#FEF2F2', color: '#b91c1c' },
              }
              const subStyle = user.subscription_status ? subStatusStyles[user.subscription_status] : null
              return (
                <div key={user.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm" style={{ color: '#1a1a1a' }}>{user.full_name || '—'}</p>
                      {user.role === 'superadmin' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#7A1832', color: 'white' }}>Super Admin</span>
                      )}
                      {user.role === 'admin' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#4338ca', color: 'white' }}>Admin</span>
                      )}
                      {user.id === currentUserId && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF1B5', color: '#591427' }}>Tú</span>
                      )}
                      {src.label && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: src.bg, color: src.color }}>{src.label}</span>
                      )}
                      {user.subscription_status && user.subscription_status !== 'none' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={subStyle || { background: '#F1F5F9', color: '#475569' }}>
                          {user.subscription_status}{user.subscription_plan ? ` · ${user.subscription_plan}` : ''}
                        </span>
                      )}
                      {user.subscription_status === 'canceled' && isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF7ED', color: '#c2410c' }}>
                          Acceso hasta fin de periodo
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#591427', opacity: 0.7 }}>{user.email}</p>
                    {user.salon_name && <p className="text-xs" style={{ color: '#591427', opacity: 0.55 }}>{user.salon_name}</p>}
                    {user.promo_code_used && <p className="text-xs" style={{ color: '#c2410c', opacity: 0.8 }}>Promo: {user.promo_code_used}</p>}
                    {/* Stats de uso */}
                    {stats && (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#475569' }}>
                          {stats.contentCount} cont.
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: stats.brandComplete ? '#F0FDF4' : '#FEF2F2', color: stats.brandComplete ? '#15803d' : '#b91c1c' }}>
                          Marca {stats.brandComplete ? '✓' : '✗'}
                        </span>
                        {stats.lastActivity && (
                          <span className="text-xs" style={{ color: '#591427', opacity: 0.45 }}>
                            Últ. actividad: {new Date(stats.lastActivity).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: '#591427', opacity: 0.4 }}>
                      Alta: {new Date(user.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <CheckCircle size={14} style={{ color: '#2a8a4a' }} />
                      ) : (
                        <XCircle size={14} style={{ color: '#c0394e' }} />
                      )}
                      <span className="text-xs font-medium" style={{ color: isActive ? '#2a8a4a' : '#c0394e' }}>
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    {user.id !== currentUserId && (
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {isActive && user.access_source !== 'stripe' && (
                          <select
                            value={user.access_source}
                            onChange={e => setSource(user, e.target.value as Profile['access_source'])}
                            disabled={loadingUser === user.id}
                            className="text-xs rounded-lg px-2 py-1"
                            style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', color: '#591427', cursor: 'pointer' }}
                          >
                            <option value="manual">Manual</option>
                            <option value="skool">Skool</option>
                            <option value="promo">Promo</option>
                          </select>
                        )}
                        {hasActiveSub && (
                          <button
                            onClick={() => setCancelSubConfirm(user)}
                            disabled={loadingUser === user.id}
                            className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Cancelar suscripción"
                            style={{ background: '#FEF2F2', color: '#b91c1c', border: '1.5px solid rgba(185,28,28,0.15)', cursor: 'pointer' }}
                          >
                            <CreditCard size={12} /> Cancelar sub
                          </button>
                        )}
                        <button
                          onClick={() => setAccess(user, !isActive)}
                          disabled={loadingUser === user.id}
                          className="px-3 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            background: isActive ? '#FFF1B5' : '#7A1832',
                            color: isActive ? '#591427' : 'white',
                            opacity: loadingUser === user.id ? 0.6 : 1,
                            cursor: loadingUser === user.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {loadingUser === user.id ? '...' : isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-lg"
                          title="Editar usuario"
                          style={{ background: '#EEF2FF', color: '#4338ca', cursor: 'pointer', border: '1.5px solid rgba(67,56,202,0.15)' }}
                        >
                          <Pencil size={13} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            disabled={loadingUser === user.id}
                            className="p-1.5 rounded-lg"
                            title="Eliminar usuario"
                            style={{ background: '#FEF2F2', color: '#b91c1c', cursor: 'pointer', border: '1.5px solid rgba(185,28,28,0.15)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginacion */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-3" style={{ borderTop: '1.5px solid rgba(255,241,181,0.3)' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="p-1.5 rounded-lg"
                style={{ background: safePage === 0 ? '#F1F5F9' : '#FFF1B5', color: '#591427', cursor: safePage === 0 ? 'not-allowed' : 'pointer', opacity: safePage === 0 ? 0.4 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs" style={{ color: '#591427' }}>Página {safePage + 1} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="p-1.5 rounded-lg"
                style={{ background: safePage >= totalPages - 1 ? '#F1F5F9' : '#FFF1B5', color: '#591427', cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages - 1 ? 0.4 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Promo codes */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
          <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.5)' }}>
            <Tag size={18} style={{ color: '#7A1832' }} />
            <h2 className="font-semibold" style={{ color: '#1a1a1a' }}>Códigos (Promo & School)</h2>
            <button
              onClick={() => setShowCreatePromo(v => !v)}
              className="ml-auto flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: '#7A1832', color: 'white', cursor: 'pointer' }}
            >
              <Plus size={12} /> Nuevo
            </button>
          </div>

          {showCreatePromo && (
            <form onSubmit={createPromo} className="px-6 py-4 space-y-3" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.4)', background: '#FFFDF5' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Código *</label>
                  <input required value={newPromo.code} onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="BRAVE2024" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Tipo de código</label>
                  <select value={newPromo.code_type} onChange={e => setNewPromo(p => ({ ...p, code_type: e.target.value as 'promo' | 'skool' }))}
                    style={selectStyle}>
                    <option value="promo">Promo (caduca)</option>
                    <option value="skool">School (indefinido)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Descripción</label>
                <input value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ej: Acceso para comunidad BRÄVE" style={inputStyle} />
              </div>
              {newPromo.code_type === 'promo' && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Días de acceso *</label>
                  <input required type="number" min={1} value={newPromo.access_days} onChange={e => setNewPromo(p => ({ ...p, access_days: +e.target.value }))}
                    style={inputStyle} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Usos máx. (vacío = ilimitado)</label>
                  <input type="number" min={1} value={newPromo.max_redemptions} onChange={e => setNewPromo(p => ({ ...p, max_redemptions: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Expira (vacío = sin límite)</label>
                  <input type="date" value={newPromo.expires_at} onChange={e => setNewPromo(p => ({ ...p, expires_at: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={creatingPromo}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: '#7A1832', color: 'white', opacity: creatingPromo ? 0.6 : 1, cursor: creatingPromo ? 'not-allowed' : 'pointer' }}>
                  {creatingPromo ? 'Creando...' : 'Crear código'}
                </button>
                <button type="button" onClick={() => setShowCreatePromo(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: '#FFF1B5', color: '#591427', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {promoCodes.length === 0 && !showCreatePromo ? (
            <p className="px-6 py-6 text-sm text-center" style={{ color: '#591427', opacity: 0.5 }}>No hay códigos aún</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,241,181,0.3)' }}>
              {promoCodes.map(promo => (
                <div key={promo.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold" style={{ color: '#591427' }}>{promo.code}</code>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: promo.is_active ? '#F0FDF4' : '#FEF2F2', color: promo.is_active ? '#15803d' : '#b91c1c' }}>
                        {promo.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: (promo.code_type ?? 'promo') === 'skool' ? '#F0FDF4' : '#FFF7ED', color: (promo.code_type ?? 'promo') === 'skool' ? '#15803d' : '#c2410c' }}>
                        {(promo.code_type ?? 'promo') === 'skool' ? 'School' : 'Promo'}
                      </span>
                    </div>
                    {promo.description && <p className="text-xs mt-0.5" style={{ color: '#591427', opacity: 0.6 }}>{promo.description}</p>}
                    <p className="text-xs mt-0.5" style={{ color: '#591427', opacity: 0.5 }}>
                      {promo.redemptions_count}{promo.max_redemptions ? `/${promo.max_redemptions}` : ''} usos · {promo.access_days}d acceso
                      {promo.expires_at && ` · expira ${new Date(promo.expires_at).toLocaleDateString('es-ES')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditPromo(promo)}
                      className="p-1.5 rounded-lg"
                      title="Editar código"
                      style={{ background: '#EEF2FF', color: '#4338ca', cursor: 'pointer', border: '1.5px solid rgba(67,56,202,0.15)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => togglePromo(promo)}
                      disabled={loadingPromo === promo.id}
                      className="px-3 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        background: promo.is_active ? '#FFF1B5' : '#7A1832',
                        color: promo.is_active ? '#591427' : 'white',
                        opacity: loadingPromo === promo.id ? 0.6 : 1,
                        cursor: loadingPromo === promo.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loadingPromo === promo.id ? '...' : promo.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => setDeletePromoConfirm(promo)}
                      className="p-1.5 rounded-lg"
                      title="Eliminar código"
                      style={{ background: '#FEF2F2', color: '#b91c1c', cursor: 'pointer', border: '1.5px solid rgba(185,28,28,0.15)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal: editar usuario */}
      {editUser && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.15)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm" style={{ color: '#1a1a1a' }}>Editar usuario</h3>
              <button onClick={() => setEditUser(null)} className="p-1 rounded-lg" style={{ color: '#591427', opacity: 0.5, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Nombre</label>
                <input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Nombre completo" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Salón</label>
                <input value={editForm.salon_name} onChange={e => setEditForm(f => ({ ...f, salon_name: e.target.value }))}
                  placeholder="Nombre del salón" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Ciudad</label>
                <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Ciudad" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Especialidad</label>
                <input value={editForm.professional_role} onChange={e => setEditForm(f => ({ ...f, professional_role: e.target.value }))}
                  placeholder="Ej. Estilista, Colorista…" style={inputStyle} />
              </div>
              {editUser.id !== currentUserId && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Rol</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Profile['role'] }))}
                    style={selectStyle}
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                    {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveUserEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: '#7A1832', color: 'white', opacity: savingEdit ? 0.6 : 1, cursor: savingEdit ? 'not-allowed' : 'pointer' }}
              >
                {savingEdit ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditUser(null)}
                disabled={savingEdit}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: '#FFF1B5', color: '#591427', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: cancelar suscripcion */}
      {cancelSubConfirm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: 'white', border: '1.5px solid rgba(185,28,28,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF2F2' }}>
                <CreditCard size={20} style={{ color: '#b91c1c' }} />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: '#1a1a1a' }}>Cancelar suscripción</h3>
                <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>Se cancelará al final del periodo</p>
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#FEF2F2' }}>
              <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>{cancelSubConfirm.full_name || '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: '#b91c1c', opacity: 0.8 }}>{cancelSubConfirm.email}</p>
              <p className="text-xs mt-1" style={{ color: '#591427', opacity: 0.7 }}>
                Plan: {cancelSubConfirm.subscription_plan || '—'} · Estado: {cancelSubConfirm.subscription_status}
              </p>
            </div>
            <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>
              La suscripción se cancelará al final del periodo de facturación. El usuario mantendrá el acceso hasta entonces.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={cancelSubscription}
                disabled={cancelingSub}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: '#b91c1c', color: 'white', opacity: cancelingSub ? 0.6 : 1, cursor: cancelingSub ? 'not-allowed' : 'pointer' }}
              >
                {cancelingSub ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
              <button
                onClick={() => setCancelSubConfirm(null)}
                disabled={cancelingSub}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: '#FFF1B5', color: '#591427', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: editar promo */}
      {editPromo && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.15)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm" style={{ color: '#1a1a1a' }}>Editar código</h3>
                <code className="text-xs" style={{ color: '#591427' }}>{editPromo.code}</code>
              </div>
              <button onClick={() => setEditPromo(null)} className="p-1 rounded-lg" style={{ color: '#591427', opacity: 0.5, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Tipo de código</label>
                <select value={editPromoForm.code_type} onChange={e => setEditPromoForm(f => ({ ...f, code_type: e.target.value as 'promo' | 'skool' }))}
                  style={selectStyle}>
                  <option value="promo">Promo (caduca)</option>
                  <option value="skool">School (indefinido)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Descripción</label>
                <input value={editPromoForm.description} onChange={e => setEditPromoForm(f => ({ ...f, description: e.target.value }))}
                  style={inputStyle} />
              </div>
              {editPromoForm.code_type === 'promo' && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Días de acceso</label>
                  <input type="number" min={1} value={editPromoForm.access_days} onChange={e => setEditPromoForm(f => ({ ...f, access_days: +e.target.value }))}
                    style={inputStyle} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Usos máx.</label>
                  <input type="number" min={1} value={editPromoForm.max_redemptions} onChange={e => setEditPromoForm(f => ({ ...f, max_redemptions: e.target.value }))}
                    placeholder="Vacío = ilimitado" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Expira</label>
                  <input type="date" value={editPromoForm.expires_at} onChange={e => setEditPromoForm(f => ({ ...f, expires_at: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={savePromoEdit}
                disabled={savingPromoEdit}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: '#7A1832', color: 'white', opacity: savingPromoEdit ? 0.6 : 1, cursor: savingPromoEdit ? 'not-allowed' : 'pointer' }}
              >
                {savingPromoEdit ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditPromo(null)}
                disabled={savingPromoEdit}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: '#FFF1B5', color: '#591427', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: eliminar promo */}
      {deletePromoConfirm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: 'white', border: '1.5px solid rgba(185,28,28,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF2F2' }}>
                <AlertTriangle size={20} style={{ color: '#b91c1c' }} />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: '#1a1a1a' }}>Eliminar código</h3>
                <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#FEF2F2' }}>
              <code className="font-bold text-sm" style={{ color: '#591427' }}>{deletePromoConfirm.code}</code>
              {deletePromoConfirm.description && <p className="text-xs mt-1" style={{ color: '#591427', opacity: 0.6 }}>{deletePromoConfirm.description}</p>}
              <p className="text-xs mt-1" style={{ color: '#b91c1c', opacity: 0.8 }}>
                {deletePromoConfirm.redemptions_count} uso(s) registrado(s)
              </p>
            </div>
            {deletePromoConfirm.redemptions_count > 0 && (
              <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>
                <strong>Atención:</strong> este código ya ha sido canjeado. Los usuarios que lo usaron mantendrán su acceso, pero el código dejará de ser válido.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={deletePromo}
                disabled={deletingPromo}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: '#b91c1c', color: 'white', opacity: deletingPromo ? 0.6 : 1, cursor: deletingPromo ? 'not-allowed' : 'pointer' }}
              >
                {deletingPromo ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => setDeletePromoConfirm(null)}
                disabled={deletingPromo}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: '#FFF1B5', color: '#591427', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal (usuario) */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: 'white', border: '1.5px solid rgba(185,28,28,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF2F2' }}>
                <AlertTriangle size={20} style={{ color: '#b91c1c' }} />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: '#1a1a1a' }}>Eliminar usuario</h3>
                <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#FEF2F2' }}>
              <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>{deleteConfirm.full_name || '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: '#b91c1c', opacity: 0.8 }}>{deleteConfirm.email}</p>
              {deleteConfirm.salon_name && <p className="text-xs" style={{ color: '#b91c1c', opacity: 0.6 }}>{deleteConfirm.salon_name}</p>}
            </div>
            <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>
              Se eliminará el usuario y <strong>toda su información</strong>: perfil de marca, contenidos generados y datos de acceso.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={deleteUser}
                disabled={deletingUser}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: '#b91c1c', color: 'white', opacity: deletingUser ? 0.6 : 1, cursor: deletingUser ? 'not-allowed' : 'pointer' }}
              >
                {deletingUser ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingUser}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: '#FFF1B5', color: '#591427', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}