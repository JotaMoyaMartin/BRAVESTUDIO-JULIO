'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clapperboard, Plus, Pencil, Trash2, Copy, AlertTriangle, X, Upload } from 'lucide-react'
import { ReelInspiration } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'
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

export default function InspiracionTab() {
  const [items, setItems] = useState<ReelInspiration[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<ReelInspiration | null>(null)
  const [deleting, setDeleting] = useState<ReelInspiration | null>(null)
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
      const admin = createAdminClient()
      const { data } = await admin.from('reel_inspirations').select('*').order('created_at', { ascending: false })
      setItems((data as ReelInspiration[]) || [])
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowCreate(true)
  }

  function openEdit(insp: ReelInspiration) {
    setEditing(insp)
    setForm({
      title: insp.title,
      short_description: insp.short_description,
      description: insp.description,
      idea_text: insp.idea_text ?? '',
      why_text: insp.why_text ?? '',
      how_text: insp.how_text ?? '',
      cover_image: insp.cover_image,
      instagram_url: insp.instagram_url ?? '',
      status: insp.status,
    })
    setShowCreate(true)
  }

  async function uploadCover(file: File) {
    setUploading(true)
    setError('')
    try {
      const admin = createAdminClient()
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await admin
        .storage
        .from('reel-inspirations')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
      if (upErr) throw upErr
      const publicUrl = admin.storage.from('reel-inspirations').getPublicUrl(path).data.publicUrl
      setForm(f => ({ ...f, cover_image: publicUrl }))
    } catch (e: unknown) {
      setError('No se pudo subir la imagen: ' + (e instanceof Error ? e.message : 'error desconocido'))
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
      const admin = createAdminClient()
      const payload = {
        title: form.title.trim(),
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        idea_text: form.idea_text.trim() || null,
        why_text: form.why_text.trim() || null,
        how_text: form.how_text.trim() || null,
        cover_image: form.cover_image,
        instagram_url: form.instagram_url.trim() || null,
        status: form.status,
      }
      if (editing) {
        await admin.from('reel_inspirations').update(payload).eq('id', editing.id)
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...payload } as ReelInspiration : i))
      } else {
        const { data } = await admin.from('reel_inspirations').insert(payload).select().single()
        if (data) setItems(prev => [data as ReelInspiration, ...prev])
      }
      setShowCreate(false)
      setEditing(null)
      setForm(EMPTY_FORM)
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(insp: ReelInspiration) {
    const admin = createAdminClient()
    const next = insp.status === 'active' ? 'hidden' : 'active'
    await admin.from('reel_inspirations').update({ status: next }).eq('id', insp.id)
    setItems(prev => prev.map(i => i.id === insp.id ? { ...i, status: next } : i))
  }

  async function duplicate(insp: ReelInspiration) {
    const admin = createAdminClient()
    const { data } = await admin.from('reel_inspirations').insert({
      title: insp.title + ' (copia)',
      short_description: insp.short_description,
      description: insp.description,
      idea_text: insp.idea_text,
      why_text: insp.why_text,
      how_text: insp.how_text,
      cover_image: insp.cover_image,
      instagram_url: insp.instagram_url,
      status: 'hidden',
    }).select().single()
    if (data) setItems(prev => [data as ReelInspiration, ...prev])
  }

  async function confirmDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      const admin = createAdminClient()
      await admin.from('reel_inspirations').delete().eq('id', deleting.id)
      setItems(prev => prev.filter(i => i.id !== deleting.id))
      setDeleting(null)
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = 'w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Inspiración Reels"
        subtitle="Galería de ideas para estilistas"
        icon={<Clapperboard size={18} />}
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            Nueva inspiración
          </Button>
        }
      />

      <Card padding="none" shadow="soft" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-center text-cherry-dark opacity-50">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-cherry-dark opacity-50">No hay inspiraciones aún. Crea la primera.</p>
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
                {items.map((insp, i) => (
                  <motion.tr
                    key={insp.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-[rgba(122,24,50,0.03)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <img
                        src={insp.cover_image}
                        alt={insp.title}
                        className="w-9 rounded-[var(--radius-sm)] object-cover"
                        style={{ height: 70 }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-cherry-dark">{insp.title}</p>
                      <p className="text-xs text-cherry-dark opacity-50 mt-0.5 line-clamp-1">{insp.short_description}</p>
                    </td>
                    <td className="px-4 py-3 text-cherry-dark opacity-60 whitespace-nowrap">
                      {new Date(insp.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(insp)} title="Cambiar estado">
                        <Badge tone={insp.status === 'active' ? 'green' : 'neutral'}>
                          {insp.status === 'active' ? 'Activo' : 'Oculto'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(insp)}
                          className="p-1.5 rounded-[var(--radius-sm)] bg-[rgba(67,56,202,0.08)] text-[#4338ca] hover:bg-[rgba(67,56,202,0.15)]"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => duplicate(insp)}
                          className="p-1.5 rounded-[var(--radius-sm)] bg-[rgba(122,24,50,0.08)] text-cherry hover:opacity-80"
                          title="Duplicar"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => setDeleting(insp)}
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

      {/* Create / Edit modal */}
      {showCreate && (
        <Modal onClose={() => { setShowCreate(false); setEditing(null) }} title={editing ? 'Editar inspiración' : 'Nueva inspiración'}>
          <form onSubmit={save} className="space-y-3">
            {error && (
              <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
            )}

            {/* Cover upload */}
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
                placeholder="Ej: Cuando una clienta vuelve después de meses…" className={fieldStyle} />
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
                  placeholder="Graba la reacción de tu clienta cuando vea el resultado final." rows={2} className={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Por qué funciona</label>
                <textarea value={form.why_text} onChange={e => setForm(f => ({ ...f, why_text: e.target.value }))}
                  placeholder="Los contenidos emocionales generan conexión y confianza." rows={2} className={fieldStyle} />
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
              <Button type="submit" loading={saving}>{editing ? 'Guardar cambios' : 'Crear inspiración'}</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditing(null) }}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete modal */}
      {deleting && (
        <Modal onClose={() => setDeleting(null)} title="Eliminar inspiración" subtitle={deleting.title} danger>
          <div className="space-y-4">
            <div className="rounded-[var(--radius-md)] p-4 bg-[#fde8e8]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-danger" />
                <span className="font-semibold text-cherry-dark">Esta acción no se puede deshacer</span>
              </div>
              <p className="text-xs text-cherry-dark opacity-70">La inspiración y sus guardados asociados se eliminarán.</p>
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