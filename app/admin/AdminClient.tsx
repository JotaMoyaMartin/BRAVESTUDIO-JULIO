'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, PromoCode } from '@/types/database'
import { hasActiveAccess } from '@/lib/access'
import { Users, CheckCircle, XCircle, ShieldCheck, Tag, Plus } from 'lucide-react'
import Link from 'next/link'

interface Props {
  currentUserId: string
  users: Profile[]
  promoCodes: PromoCode[]
}

const SOURCE_LABELS: Record<Profile['access_source'], { label: string; bg: string; color: string }> = {
  manual:  { label: 'Manual',  bg: '#EEF2FF', color: '#4338ca' },
  stripe:  { label: 'Stripe',  bg: '#EFF6FF', color: '#1d4ed8' },
  skool:   { label: 'Skool',   bg: '#F0FDF4', color: '#15803d' },
  promo:   { label: 'Promo',   bg: '#FFF7ED', color: '#c2410c' },
  none:    { label: '',        bg: '',        color: '' },
}

export default function AdminClient({ currentUserId, users: initialUsers, promoCodes: initialCodes }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [promoCodes, setPromoCodes] = useState(initialCodes)
  const [loadingUser, setLoadingUser] = useState<string | null>(null)
  const [loadingPromo, setLoadingPromo] = useState<string | null>(null)
  const [showCreatePromo, setShowCreatePromo] = useState(false)
  const [newPromo, setNewPromo] = useState({ code: '', description: '', access_days: 30, max_redemptions: '', expires_at: '' })
  const [creatingPromo, setCreatingPromo] = useState(false)

  const active = users.filter(u => hasActiveAccess(u)).length

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

  async function togglePromo(promo: PromoCode) {
    setLoadingPromo(promo.id)
    const supabase = createClient()
    await supabase.from('promo_codes').update({ is_active: !promo.is_active }).eq('id', promo.id)
    setPromoCodes(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p))
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
    }
    const { data } = await supabase.from('promo_codes').insert(insert).select().single()
    if (data) setPromoCodes(prev => [data as PromoCode, ...prev])
    setNewPromo({ code: '', description: '', access_days: 30, max_redemptions: '', expires_at: '' })
    setShowCreatePromo(false)
    setCreatingPromo(false)
  }

  const inputStyle = { border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', borderRadius: 12, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }

  return (
    <div className="min-h-screen p-6" style={{ background: '#FFFDF5' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#7A1832' }}>
            <ShieldCheck size={20} style={{ color: 'white' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Admin BRÄVE Studio</h1>
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
          </div>

          <div className="divide-y" style={{ borderColor: 'rgba(255,241,181,0.3)' }}>
            {users.map(user => {
              const isActive = hasActiveAccess(user)
              const src = SOURCE_LABELS[user.access_source]
              return (
                <div key={user.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm" style={{ color: '#1a1a1a' }}>{user.full_name || '—'}</p>
                      {user.role === 'admin' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#7A1832', color: 'white' }}>Admin</span>
                      )}
                      {user.id === currentUserId && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF1B5', color: '#591427' }}>Tú</span>
                      )}
                      {src.label && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: src.bg, color: src.color }}>{src.label}</span>
                      )}
                      {user.subscription_status && user.subscription_status !== 'none' && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>{user.subscription_status}</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#591427', opacity: 0.7 }}>{user.email}</p>
                    {user.salon_name && <p className="text-xs" style={{ color: '#591427', opacity: 0.55 }}>{user.salon_name}</p>}
                    {user.promo_code_used && <p className="text-xs" style={{ color: '#c2410c', opacity: 0.8 }}>Promo: {user.promo_code_used}</p>}
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
                      <div className="flex gap-1.5">
                        {/* Source selector (only for active non-stripe users) */}
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
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Promo codes */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
          <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1.5px solid rgba(255,241,181,0.5)' }}>
            <Tag size={18} style={{ color: '#7A1832' }} />
            <h2 className="font-semibold" style={{ color: '#1a1a1a' }}>Códigos Promocionales</h2>
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
                  <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Días de acceso *</label>
                  <input required type="number" min={1} value={newPromo.access_days} onChange={e => setNewPromo(p => ({ ...p, access_days: +e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#591427' }}>Descripción</label>
                <input value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ej: Acceso para comunidad BRÄVE" style={inputStyle} />
              </div>
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
                    </div>
                    {promo.description && <p className="text-xs mt-0.5" style={{ color: '#591427', opacity: 0.6 }}>{promo.description}</p>}
                    <p className="text-xs mt-0.5" style={{ color: '#591427', opacity: 0.5 }}>
                      {promo.redemptions_count}{promo.max_redemptions ? `/${promo.max_redemptions}` : ''} usos · {promo.access_days}d acceso
                      {promo.expires_at && ` · expira ${new Date(promo.expires_at).toLocaleDateString('es-ES')}`}
                    </p>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
