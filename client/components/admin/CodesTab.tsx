'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tag, Plus, Pencil, Trash2, AlertTriangle, X } from 'lucide-react'
import { PromoCode } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SectionTitle from '@/components/ui/SectionTitle'

interface CodesTabProps {
  promoCodes: PromoCode[]
}

export default function CodesTab({ promoCodes: initial }: CodesTabProps) {
  const [promoCodes, setPromoCodes] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null)
  const [deletePromo, setDeletePromo] = useState<PromoCode | null>(null)
  const [newPromo, setNewPromo] = useState({
    code: '',
    description: '',
    access_days: 30,
    max_redemptions: '',
    expires_at: '',
    code_type: 'promo' as 'promo' | 'skool',
  })
  const [editForm, setEditForm] = useState({
    description: '',
    access_days: 30,
    max_redemptions: '',
    expires_at: '',
    code_type: 'promo' as 'promo' | 'skool',
  })
  const [saving, setSaving] = useState(false)

  async function toggleActive(promo: PromoCode) {
    setLoading(promo.id)
    try {
      const admin = createAdminClient()
      await admin.from('promo_codes').update({ is_active: !promo.is_active }).eq('id', promo.id)
      setPromoCodes(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !promo.is_active } : p))
    } finally {
      setLoading(null)
    }
  }

  async function createPromo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const admin = createAdminClient()
      const insert = {
        code: newPromo.code.trim().toUpperCase(),
        description: newPromo.description || null,
        access_days: newPromo.access_days,
        max_redemptions: newPromo.max_redemptions ? parseInt(newPromo.max_redemptions) : null,
        expires_at: newPromo.expires_at || null,
        code_type: newPromo.code_type,
      }
      const { data } = await admin.from('promo_codes').insert(insert).select().single()
      if (data) setPromoCodes(prev => [data as PromoCode, ...prev])
      setNewPromo({ code: '', description: '', access_days: 30, max_redemptions: '', expires_at: '', code_type: 'promo' })
      setShowCreate(false)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(promo: PromoCode) {
    setEditPromo(promo)
    setEditForm({
      description: promo.description ?? '',
      access_days: promo.access_days,
      max_redemptions: promo.max_redemptions?.toString() ?? '',
      expires_at: promo.expires_at ? promo.expires_at.slice(0, 10) : '',
      code_type: promo.code_type ?? 'promo',
    })
  }

  async function saveEdit() {
    if (!editPromo) return
    setSaving(true)
    try {
      const admin = createAdminClient()
      const update = {
        description: editForm.description || null,
        access_days: editForm.access_days,
        max_redemptions: editForm.max_redemptions ? parseInt(editForm.max_redemptions) : null,
        expires_at: editForm.expires_at || null,
        code_type: editForm.code_type,
      }
      await admin.from('promo_codes').update(update).eq('id', editPromo.id)
      setPromoCodes(prev => prev.map(p => p.id === editPromo.id ? { ...p, ...update } : p))
      setEditPromo(null)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deletePromo) return
    setSaving(true)
    try {
      const admin = createAdminClient()
      await admin.from('promo_codes').delete().eq('id', deletePromo.id)
      setPromoCodes(prev => prev.filter(p => p.id !== deletePromo.id))
      setDeletePromo(null)
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = 'w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'
  const selectStyle = 'px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none cursor-pointer'

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Códigos"
        subtitle="Promo & School — acceso temporal"
        icon={<Tag size={18} />}
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(v => !v)}>
            Nuevo código
          </Button>
        }
      />

      {showCreate && (
        <Card padding="md" shadow="medium">
          <form onSubmit={createPromo} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Código *</label>
                <input required value={newPromo.code} onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="BRAVE2024" className={fieldStyle} style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Tipo</label>
                <select value={newPromo.code_type} onChange={e => setNewPromo(p => ({ ...p, code_type: e.target.value as 'promo' | 'skool' }))} className={selectStyle}>
                  <option value="promo">Promo (caduca)</option>
                  <option value="skool">School (indefinido)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Descripción</label>
              <input value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Acceso para comunidad BRÄVE" className={fieldStyle} />
            </div>
            {newPromo.code_type === 'promo' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Días de acceso *</label>
                <input required type="number" min={1} value={newPromo.access_days} onChange={e => setNewPromo(p => ({ ...p, access_days: +e.target.value }))}
                  className={fieldStyle} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Usos máx. (vacío = ilimitado)</label>
                <input type="number" min={1} value={newPromo.max_redemptions} onChange={e => setNewPromo(p => ({ ...p, max_redemptions: e.target.value }))}
                  className={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Expira (vacío = sin límite)</label>
                <input type="date" value={newPromo.expires_at} onChange={e => setNewPromo(p => ({ ...p, expires_at: e.target.value }))}
                  className={fieldStyle} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={saving}>Crear código</Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding="none" shadow="soft" className="overflow-hidden">
        {promoCodes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-cherry-dark opacity-50">No hay códigos aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-cherry-dark opacity-60" style={{ background: 'var(--color-warm-gray)' }}>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Días</th>
                  <th className="px-4 py-3 font-semibold">Usados/Máx</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Creado</th>
                  <th className="px-4 py-3 font-semibold">Expira</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y border-soft">
                {promoCodes.map((promo, i) => (
                  <motion.tr
                    key={promo.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-[rgba(122,24,50,0.03)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <code className="font-bold text-cherry-dark">{promo.code}</code>
                      {promo.description && <div className="text-xs text-cherry-dark opacity-50 mt-0.5">{promo.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={(promo.code_type ?? 'promo') === 'skool' ? 'green' : 'buttermilk'}>
                        {promo.code_type ?? 'promo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-cherry-dark opacity-70">{promo.access_days}d</td>
                    <td className="px-4 py-3 text-cherry-dark opacity-70">
                      {promo.redemptions_count}{promo.max_redemptions ? `/${promo.max_redemptions}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={promo.is_active ? 'green' : 'danger'}>
                        {promo.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-cherry-dark opacity-60 whitespace-nowrap">
                      {new Date(promo.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-cherry-dark opacity-60 whitespace-nowrap">
                      {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(promo)}
                          className="p-1.5 rounded-[var(--radius-sm)] bg-[rgba(67,56,202,0.08)] text-[#4338ca] hover:bg-[rgba(67,56,202,0.15)]"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <Button
                          size="sm"
                          variant={promo.is_active ? 'secondary' : 'primary'}
                          loading={loading === promo.id}
                          onClick={() => toggleActive(promo)}
                        >
                          {promo.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <button
                          onClick={() => setDeletePromo(promo)}
                          className="p-1.5 rounded-[var(--radius-sm)] bg-[#fde8e8] text-danger hover:opacity-80"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit modal */}
      {editPromo && (
        <Modal onClose={() => setEditPromo(null)} title="Editar código" subtitle={editPromo.code}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Tipo</label>
              <select value={editForm.code_type} onChange={e => setEditForm(f => ({ ...f, code_type: e.target.value as 'promo' | 'skool' }))} className={selectStyle}>
                <option value="promo">Promo (caduca)</option>
                <option value="skool">School (indefinido)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Descripción</label>
              <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className={fieldStyle} />
            </div>
            {editForm.code_type === 'promo' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Días de acceso</label>
                <input type="number" min={1} value={editForm.access_days} onChange={e => setEditForm(f => ({ ...f, access_days: +e.target.value }))} className={fieldStyle} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Usos máx.</label>
                <input type="number" min={1} value={editForm.max_redemptions} onChange={e => setEditForm(f => ({ ...f, max_redemptions: e.target.value }))} placeholder="Vacío = ilimitado" className={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Expira</label>
                <input type="date" value={editForm.expires_at} onChange={e => setEditForm(f => ({ ...f, expires_at: e.target.value }))} className={fieldStyle} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button fullWidth loading={saving} onClick={saveEdit}>Guardar</Button>
              <Button fullWidth variant="secondary" onClick={() => setEditPromo(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete modal */}
      {deletePromo && (
        <Modal onClose={() => setDeletePromo(null)} title="Eliminar código" subtitle={deletePromo.code} danger>
          <div className="space-y-4">
            <div className="rounded-[var(--radius-md)] p-4 bg-[#fde8e8]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-danger" />
                <span className="font-semibold text-cherry-dark">Esta acción no se puede deshacer</span>
              </div>
              <p className="text-xs text-cherry-dark opacity-70">
                {deletePromo.redemptions_count} uso(s) registrado(s). Los usuarios que lo usaron mantendrán su acceso.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" fullWidth loading={saving} onClick={confirmDelete}>Sí, eliminar</Button>
              <Button variant="secondary" fullWidth onClick={() => setDeletePromo(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose, title, subtitle, danger }: { children: React.ReactNode; onClose: () => void; title: string; subtitle?: string; danger?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] p-6 space-y-4 bg-cream"
        style={{ border: danger ? '1.5px solid rgba(192,57,78,0.2)' : '1.5px solid rgba(122,24,50,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-cherry-dark">{title}</h3>
            {subtitle && <code className="text-xs text-cherry-dark opacity-60">{subtitle}</code>}
          </div>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] text-cherry-dark hover:bg-[rgba(122,24,50,0.06)]">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}