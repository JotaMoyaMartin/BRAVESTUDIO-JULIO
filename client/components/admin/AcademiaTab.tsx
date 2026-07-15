'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Plus, Pencil, Trash2, AlertTriangle, X, Film, FolderOpen } from 'lucide-react'
import { AcademiaModule, AcademiaLesson } from '@/types/database'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SectionTitle from '@/components/ui/SectionTitle'

type ModuleForm = {
  title: string
  description: string
  sort_order: number
  status: 'active' | 'hidden'
}

type LessonForm = {
  module_id: string
  title: string
  description: string
  loom_url: string
  sort_order: number
  status: 'active' | 'hidden'
}

const EMPTY_MODULE: ModuleForm = { title: '', description: '', sort_order: 0, status: 'active' }
const EMPTY_LESSON: LessonForm = { module_id: '', title: '', description: '', loom_url: '', sort_order: 0, status: 'active' }

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

export default function AcademiaTab() {
  const [modules, setModules] = useState<AcademiaModule[]>([])
  const [lessons, setLessons] = useState<AcademiaLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingModule, setEditingModule] = useState<AcademiaModule | null>(null)
  const [editingLesson, setEditingLesson] = useState<AcademiaLesson | null>(null)
  const [deletingItem, setDeletingItem] = useState<{ type: 'module' | 'lesson'; id: string; title: string } | null>(null)
  const [moduleForm, setModuleForm] = useState<ModuleForm>(EMPTY_MODULE)
  const [lessonForm, setLessonForm] = useState<LessonForm>(EMPTY_LESSON)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api('/api/admin/academia')
      setModules((data.modules as AcademiaModule[]) || [])
      setLessons((data.lessons as AcademiaLesson[]) || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModule() {
    setEditingModule(null)
    setModuleForm(EMPTY_MODULE)
    setShowModuleModal(true)
    setError('')
  }

  function openEditModule(mod: AcademiaModule) {
    setEditingModule(mod)
    setModuleForm({
      title: mod.title,
      description: mod.description ?? '',
      sort_order: mod.sort_order,
      status: mod.status as 'active' | 'hidden',
    })
    setShowModuleModal(true)
    setError('')
  }

  function openCreateLesson() {
    setEditingLesson(null)
    setLessonForm({ ...EMPTY_LESSON, module_id: modules[0]?.id ?? '' })
    setShowLessonModal(true)
    setError('')
  }

  function openEditLesson(lesson: AcademiaLesson) {
    setEditingLesson(lesson)
    setLessonForm({
      module_id: lesson.module_id ?? '',
      title: lesson.title,
      description: lesson.description ?? '',
      loom_url: lesson.loom_url,
      sort_order: lesson.sort_order,
      status: lesson.status as 'active' | 'hidden',
    })
    setShowLessonModal(true)
    setError('')
  }

  async function saveModule(e: React.FormEvent) {
    e.preventDefault()
    if (!moduleForm.title.trim()) { setError('El título es obligatorio'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { type: 'module' as const, ...moduleForm }
      if (editingModule) {
        const data = await api(`/api/admin/academia/${editingModule.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        setModules(prev => prev.map(m => m.id === editingModule.id ? data.item as AcademiaModule : m))
      } else {
        const data = await api('/api/admin/academia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        setModules(prev => [...prev, data.item as AcademiaModule])
      }
      setShowModuleModal(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  async function saveLesson(e: React.FormEvent) {
    e.preventDefault()
    if (!lessonForm.title.trim()) { setError('El título es obligatorio'); return }
    if (!lessonForm.loom_url.trim()) { setError('La URL de Loom es obligatoria'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { type: 'lesson' as const, ...lessonForm }
      if (editingLesson) {
        const data = await api(`/api/admin/academia/${editingLesson.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        setLessons(prev => prev.map(l => l.id === editingLesson.id ? data.item as AcademiaLesson : l))
      } else {
        const data = await api('/api/admin/academia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        setLessons(prev => [...prev, data.item as AcademiaLesson])
      }
      setShowLessonModal(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  async function toggleModuleStatus(mod: AcademiaModule) {
    const next = mod.status === 'active' ? 'hidden' : 'active'
    try {
      await api(`/api/admin/academia/${mod.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'module', status: next }),
      })
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, status: next } : m))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  async function toggleLessonStatus(lesson: AcademiaLesson) {
    const next = lesson.status === 'active' ? 'hidden' : 'active'
    try {
      await api(`/api/admin/academia/${lesson.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lesson', status: next }),
      })
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, status: next } : l))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  async function confirmDelete() {
    if (!deletingItem) return
    setSaving(true)
    try {
      await api(`/api/admin/academia/${deletingItem.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: deletingItem.type }),
      })
      if (deletingItem.type === 'module') {
        setModules(prev => prev.filter(m => m.id !== deletingItem.id))
        setLessons(prev => prev.filter(l => l.module_id !== deletingItem.id))
      } else {
        setLessons(prev => prev.filter(l => l.id !== deletingItem.id))
      }
      setDeletingItem(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = 'w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'

  function getModuleTitle(id: string | null): string {
    if (!id) return 'Sin módulo'
    return modules.find(m => m.id === id)?.title ?? 'Sin módulo'
  }

  return (
    <div className="space-y-6">
      {error && !showModuleModal && !showLessonModal && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
      )}

      <SectionTitle
        title="Academia BRÄVE"
        subtitle="Clases en video para usuarias premium"
        icon={<GraduationCap size={18} />}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<FolderOpen size={14} />} onClick={openCreateModule}>Nuevo módulo</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={openCreateLesson}>Nueva clase</Button>
          </div>
        }
      />

      {/* Modules section */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-cherry-dark opacity-70 mb-3">Módulos ({modules.length})</h3>
        {loading ? (
          <Card padding="md" shadow="soft"><p className="text-sm text-center text-cherry-dark opacity-50">Cargando…</p></Card>
        ) : modules.length === 0 ? (
          <Card padding="md" shadow="soft"><p className="text-sm text-center text-cherry-dark opacity-50">No hay módulos. Crea el primero.</p></Card>
        ) : (
          <div className="space-y-2">
            {modules.map(mod => {
              const modLessons = lessons.filter(l => l.module_id === mod.id)
              return (
                <Card key={mod.id} padding="md" shadow="soft">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(122,24,50,0.08)' }}>
                      <FolderOpen size={16} className="text-cherry" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-cherry-dark">{mod.title}</p>
                      <p className="text-xs text-cherry-dark opacity-50 mt-0.5">
                        {modLessons.length} clases{mod.description ? ` · ${mod.description}` : ''}
                      </p>
                    </div>
                    <button onClick={() => toggleModuleStatus(mod)} title="Cambiar estado">
                      <Badge tone={mod.status === 'active' ? 'green' : 'neutral'}>{mod.status === 'active' ? 'Activo' : 'Oculto'}</Badge>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEditModule(mod)} className="p-1.5 rounded-[var(--radius-sm)] bg-[rgba(67,56,202,0.08)] text-[#4338ca] hover:bg-[rgba(67,56,202,0.15)]" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletingItem({ type: 'module', id: mod.id, title: mod.title })} className="p-1.5 rounded-[var(--radius-sm)] bg-[#fde8e8] text-danger hover:opacity-80" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Lessons section */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-cherry-dark opacity-70 mb-3">Clases ({lessons.length})</h3>
        {loading ? (
          <Card padding="md" shadow="soft"><p className="text-sm text-center text-cherry-dark opacity-50">Cargando…</p></Card>
        ) : lessons.length === 0 ? (
          <Card padding="md" shadow="soft"><p className="text-sm text-center text-cherry-dark opacity-50">No hay clases. Crea la primera.</p></Card>
        ) : (
          <Card padding="none" shadow="soft" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-cherry-dark opacity-60" style={{ background: 'var(--color-warm-gray)' }}>
                    <th className="px-4 py-3 font-semibold">Clase</th>
                    <th className="px-4 py-3 font-semibold">Módulo</th>
                    <th className="px-4 py-3 font-semibold">Orden</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-soft">
                  {lessons.map((lesson, i) => (
                    <motion.tr
                      key={lesson.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-[rgba(122,24,50,0.03)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Film size={14} className="text-cherry opacity-50 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-cherry-dark truncate">{lesson.title}</p>
                            {lesson.description && <p className="text-xs text-cherry-dark opacity-50 mt-0.5 line-clamp-1">{lesson.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-cherry-dark opacity-60 whitespace-nowrap">{getModuleTitle(lesson.module_id)}</td>
                      <td className="px-4 py-3 text-cherry-dark opacity-60">{lesson.sort_order}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleLessonStatus(lesson)} title="Cambiar estado">
                          <Badge tone={lesson.status === 'active' ? 'green' : 'neutral'}>{lesson.status === 'active' ? 'Activo' : 'Oculto'}</Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEditLesson(lesson)} className="p-1.5 rounded-[var(--radius-sm)] bg-[rgba(67,56,202,0.08)] text-[#4338ca] hover:bg-[rgba(67,56,202,0.15)]" title="Editar">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeletingItem({ type: 'lesson', id: lesson.id, title: lesson.title })} className="p-1.5 rounded-[var(--radius-sm)] bg-[#fde8e8] text-danger hover:opacity-80" title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Module modal */}
      {showModuleModal && (
        <Modal onClose={() => setShowModuleModal(false)} title={editingModule ? 'Editar módulo' : 'Nuevo módulo'}>
          <form onSubmit={saveModule} className="space-y-3">
            {error && <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Título *</label>
              <input required value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Grabar mejor con el móvil" className={fieldStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Descripción</label>
              <textarea value={moduleForm.description} onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Qué se enseña en este módulo" rows={2} className={fieldStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Orden</label>
                <input type="number" value={moduleForm.sort_order} onChange={e => setModuleForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Estado</label>
                <select value={moduleForm.status} onChange={e => setModuleForm(f => ({ ...f, status: e.target.value as 'active' | 'hidden' }))} className={fieldStyle + ' cursor-pointer'}>
                  <option value="active">Activo</option>
                  <option value="hidden">Oculto</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={saving}>{editingModule ? 'Guardar cambios' : 'Crear módulo'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowModuleModal(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Lesson modal */}
      {showLessonModal && (
        <Modal onClose={() => setShowLessonModal(false)} title={editingLesson ? 'Editar clase' : 'Nueva clase'}>
          <form onSubmit={saveLesson} className="space-y-3">
            {error && <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Módulo</label>
              <select value={lessonForm.module_id} onChange={e => setLessonForm(f => ({ ...f, module_id: e.target.value }))} className={fieldStyle + ' cursor-pointer'}>
                <option value="">— Sin módulo —</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Título *</label>
              <input required value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Cómo iluminar tu salón para grabar" className={fieldStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">URL de Loom *</label>
              <input required value={lessonForm.loom_url} onChange={e => setLessonForm(f => ({ ...f, loom_url: e.target.value }))}
                placeholder="https://www.loom.com/share/…" className={fieldStyle} />
              <p className="text-xs text-cherry-dark opacity-40 mt-1">Pega el enlace de compartir de Loom</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Descripción (opcional)</label>
              <textarea value={lessonForm.description} onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Texto adicional que verá la usuaria antes del video" rows={3} className={fieldStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Orden</label>
                <input type="number" value={lessonForm.sort_order} onChange={e => setLessonForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Estado</label>
                <select value={lessonForm.status} onChange={e => setLessonForm(f => ({ ...f, status: e.target.value as 'active' | 'hidden' }))} className={fieldStyle + ' cursor-pointer'}>
                  <option value="active">Activo</option>
                  <option value="hidden">Oculto</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={saving}>{editingLesson ? 'Guardar cambios' : 'Crear clase'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowLessonModal(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deletingItem && (
        <Modal onClose={() => setDeletingItem(null)} title="Eliminar" subtitle={deletingItem.title} danger>
          <div className="space-y-4">
            <div className="rounded-[var(--radius-md)] p-4 bg-[#fde8e8]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-danger" />
                <span className="font-semibold text-cherry-dark">Esta acción no se puede deshacer</span>
              </div>
              <p className="text-xs text-cherry-dark opacity-70">
                {deletingItem.type === 'module'
                  ? 'El módulo y todas sus clases se eliminarán permanentemente.'
                  : 'La clase se eliminará permanentemente.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" fullWidth loading={saving} onClick={confirmDelete}>Sí, eliminar</Button>
              <Button variant="secondary" fullWidth onClick={() => setDeletingItem(null)}>Cancelar</Button>
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