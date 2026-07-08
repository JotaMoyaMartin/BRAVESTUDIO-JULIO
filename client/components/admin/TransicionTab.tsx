'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wand2, Plus, Pencil, Trash2, Copy, AlertTriangle, X, Upload } from 'lucide-react'
import { ReelTransition } from '@/types/database'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SectionTitle from '@/components/ui/SectionTitle'

type FormState = {
  title: string
  short_description: string
  description: string
  idea_text: string
  why_text: string
  how_text: string
  cover_image: string
  instagram_url: string
  status: 'active' | 'hidden'
}

const EMPTY_FORM: FormState = {
  title: '',
  short_description: '',
  description: '',
  idea_text: '',
  why_text: '',
  how_text: '',
  cover_image: '',
  instagram_url: '',
  status: 'active',
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

export default function TransicionTab() {
  const [items, setItems] = useState<ReelTransition[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<ReelTransition | null>(null)
  const [deleting, setDeleting] = useState<ReelTransition | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api('/api/admin/transiciones')
      setItems((data.items as ReelTransition[]) || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowCreate(true)
    setError('')
  }

  function openEdit(item: ReelTransition) {
    setEditing(item)
    setForm({
      title: item.title,
      short_description: item.short_description,
      description: item.description,
      idea_text: item.idea_text ?? '',
      why_text: item.why_text ?? '',
      how_text: item.how_text ?? '',
      cover_image: item.cover_image,
      instagram_url: item.instagram_url ?? '',
      status: item.status,
    })
    setShowCreate(true)
    setError('')
  }

  async function uploadCover(file: File) {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await api('/api/admin/transiciones/upload', { method: 'POST', body: formData })
      setForm(f => ({ ...f, cover_image: data.url }))
    } catch (e) {
      setError('No se pudo subir la imagen: ' + (e instanceof Error ? e.message : 'error'))
    } finally {
      setUploading(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.short_description || !form.description || !form.cover_image) {
      setError('Faltan campos obligatorios (título, descripción corta, descripción, portada).')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (editing) {
        const data = await api(`/api/admin/transiciones/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        setItems(prev => prev.map(i => i.id === editing.id ? data.item as ReelTransition : i))
      } else {
        const data = await api('/api/admin/transiciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        setItems(prev => [data.item as ReelTransition, ...prev])
      }
      setShowCreate(false)
      setEditing(null)
      setForm(EMPTY_FORM)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(item: ReelTransition) {
    const next = item.status === 'active' ? 'hidden' : 'active'
    try {
      await api(`/api/admin/transiciones/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: next } : i))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  async function duplicate(item: ReelTransition) {
    try {
      const data = await api(`/api/admin/transiciones/${item.id}`, { method: 'POST' })
      setItems(prev => [data.item as ReelTransition, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      await api(`/api/admin/transiciones/${deleting.id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== deleting.id))
      setDeleting(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = 'w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'

  return (
    <div className="space-y-4">
      {error && !showCreate && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
      )}

      <SectionTitle
        title="Transiciones Reels"
        subtitle="Galería de ideas de transiciones para estilistas"
        icon={<Wand2 size={18} />}
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            Nueva transición
          </Button>
        }
      />

      <Card padding="none" shadow="soft" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-center text-cherry-dark opacity-50">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-cherry-dark opacity-50">No hay transiciones aún. Crea la primera.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-cherry-dark opacity-60" style={{ background: 'var(--color-warm-gray)' }}>
                  <th className="px-4 py-3 font-semibold">Portada</th>
                  <th className="px-4 py-3 font-semibold">Título</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y border-soft">
                {items.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-[rgba(122,24,50,0.03)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <img
                        src={item.cover_image}
                        alt={item.title}
                        className="w-9 rounded-[var(--radius-sm)] object-cover"
                        style={{ height: 70 }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-cherry-dark">{item.title}</p>
                      <p className="text-xs text-cherry-dark opacity-50 mt-0.5 line-clamp-1">{item.short_description}</p>
                    </td>
                    <td className="px-4 py-3 text-cherry-dark opacity-60 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(item)} title="Cambiar estado">
                        <Badge tone={item.status === 'active' ? 'green' : 'neutral'}>
                          {item.status === 'active' ? 'Activo' : 'Oculto'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-[var(--radius-sm)] bg-[rgba(67,56,202,0.08)] text-[#4338ca] hover:bg-[rgba(67,56,202,0.15)]"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => duplicate(item)}
                          className="p-1.5 rounded-[var(--radius-sm)] bg-[rgba(122,24,50,0.08)] text-cherry hover:opacity-80"
                          title="Duplicar"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => setDeleting(item)}
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

      {showCreate && (
        <Modal onClose={() => { setShowCreate(false); setEditing(null) }} title={editing ? 'Editar transición' : 'Nueva transición'}>
          <form onSubmit={save} className="space-y-3">
            {error && (
              <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Imagen portada (vertical 9:16) *</label>
              <div className="flex items-center gap-3">
                {form.cover_image && (
                  <img src={form.cover_image} alt="preview" className="w-12 rounded-[var(--radius-sm)] object-cover" style={{ height: 90 }} />
                )}
                <label className="flex-1 cursor-pointer">
                  <span className="flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm font-semibold transition-all" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
                    <Upload size={14} /> {uploading ? 'Subiendo…' : form.cover_image ? 'Cambiar imagen' : 'Subir imagen'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f) }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Título *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Transición de antes y después en un corte…" className={fieldStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Descripción corta *</label>
              <input required value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
                placeholder="Texto visible en la tarjeta" className={fieldStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Descripción completa *</label>
              <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Texto del panel abierto" rows={3} className={fieldStyle} />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Idea</label>
                <textarea value={form.idea_text} onChange={e => setForm(f => ({ ...f, idea_text: e.target.value }))}
                  placeholder="Graba la transición cubriendo la lente con la mano." rows={2} className={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Por qué funciona</label>
                <textarea value={form.why_text} onChange={e => setForm(f => ({ ...f, why_text: e.target.value }))}
                  placeholder="Las transiciones mantienen la atención y generan replay." rows={2} className={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Cómo adaptarlo</label>
                <textarea value={form.how_text} onChange={e => setForm(f => ({ ...f, how_text: e.target.value }))}
                  placeholder="Puedes hacerlo con cualquier transformación." rows={2} className={fieldStyle} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Link Instagram</label>
              <input value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                placeholder="https://instagram.com/reel/…" className={fieldStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Estado</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'hidden' }))}
                className={fieldStyle + ' cursor-pointer'}>
                <option value="active">Activo</option>
                <option value="hidden">Oculto</option>
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={saving}>{editing ? 'Guardar cambios' : 'Crear transición'}</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditing(null) }}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal onClose={() => setDeleting(null)} title="Eliminar transición" subtitle={deleting.title} danger>
          <div className="space-y-4">
            <div className="rounded-[var(--radius-md)] p-4 bg-[#fde8e8]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-danger" />
                <span className="font-semibold text-cherry-dark">Esta acción no se puede deshacer</span>
              </div>
              <p className="text-xs text-cherry-dark opacity-70">La transición se eliminará permanentemente.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" fullWidth loading={saving} onClick={confirmDelete}>Sí, eliminar</Button>
              <Button variant="secondary" fullWidth onClick={() => setDeleting(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose, title, subtitle, danger }: { children: React.ReactNode; onClose: () => void; title: string; subtitle?: string; danger?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg my-8 rounded-[var(--radius-lg)] p-6 space-y-4 bg-cream max-h-[90vh] overflow-y-auto"
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