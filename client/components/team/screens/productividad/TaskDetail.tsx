'use client'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Clock,
  Calendar,
  User,
  Plus,
  Trash2,
  Link2,
  MessageSquare,
  Play,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react'
import type { ProductivityTask, Project, Subtask, TaskComment, TaskHistoryEntry } from '@/lib/team/types'
import { TEAM } from '@/lib/team/mock-data'

interface TaskDetailProps {
  task: ProductivityTask | null
  projects: Project[]
  onClose: () => void
  onUpdate: (patch: Partial<ProductivityTask>) => void
  onAddSubtask: (title: string) => void
  onToggleSubtask: (subtaskId: string) => void
  onAddComment: (text: string) => void
  onStartFocus: () => void
  canManage: boolean
}

function resolveMemberName(memberId: string): string {
  const member = TEAM.find(m => m.id === memberId)
  return member?.name ?? memberId
}

function resolveMemberAvatar(memberId: string): { avatar: string; color: string; name: string } | null {
  const member = TEAM.find(m => m.id === memberId)
  if (!member) return null
  return { avatar: member.avatar, color: member.color, name: member.name }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'ahora mismo'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffH < 24) return `hace ${diffH}h`
  if (diffD < 30) return `hace ${diffD}d`
  return formatDate(iso)
}

const inputCls =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]'

const labelCls = 'block text-[11.5px] text-[#8a8680] mb-1'

export default function TaskDetail({
  task,
  projects,
  onClose,
  onUpdate,
  onAddSubtask,
  onToggleSubtask,
  onAddComment,
  onStartFocus,
  canManage,
}: TaskDetailProps) {
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [commentText, setCommentText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [descDraft, setDescDraft] = useState(task?.description ?? '')

  // Sync descDraft when task changes
  useEffect(() => {
    if (task) setDescDraft(task.description)
  }, [task?.id])

  const project = task ? projects.find(p => p.id === task.projectId) : undefined
  const subtaskDone = task?.subtasks.filter(s => s.done).length ?? 0
  const subtaskTotal = task?.subtasks.length ?? 0
  const subtaskPct = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0

  function handleAddSubtask() {
    const title = subtaskTitle.trim()
    if (!title) return
    onAddSubtask(title)
    setSubtaskTitle('')
  }

  function handleAddComment() {
    const text = commentText.trim()
    if (!text) return
    onAddComment(text)
    setCommentText('')
  }

  function handleAddLink() {
    const url = linkUrl.trim()
    if (!url || !task) return
    onUpdate({ referenceLinks: [...task.referenceLinks, url] })
    setLinkUrl('')
  }

  function handleRemoveLink(index: number) {
    if (!task) return
    const newLinks = task.referenceLinks.filter((_, i) => i !== index)
    onUpdate({ referenceLinks: newLinks })
  }

  function handleMoveToHecho() {
    onUpdate({ column: 'hecho' })
    onClose()
  }

  function handleStartFocus() {
    onStartFocus()
    onClose()
  }

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FFFDF5] border border-[#FFF1B5] rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-start gap-3 p-5 border-b border-[#FFF1B5] sticky top-0 bg-[#FFFDF5] z-10">
              <input
                value={task.title}
                onChange={e => onUpdate({ title: e.target.value })}
                disabled={!canManage}
                className="flex-1 text-[18px] font-bold text-[#1a1a1a] bg-transparent border-none outline-none focus:bg-white focus:border focus:border-[#FFF1B5] focus:rounded-md focus:px-2 focus:py-1 -mx-2 -my-1 transition-all"
                placeholder="Título de la tarea"
              />
              {project && (
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[10px] text-white font-medium shrink-0 mt-1"
                  style={{ background: project.color }}
                >
                  {project.name}
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-[#FFF1B5] text-[#8a8680] shrink-0 mt-0.5"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Description */}
              <div>
                <label className={labelCls}>Descripcion</label>
                <textarea
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  onBlur={() => {
                    if (descDraft !== task.description) onUpdate({ description: descDraft })
                  }}
                  rows={3}
                  disabled={!canManage}
                  placeholder="Anade una descripcion..."
                  className="w-full px-3 py-2 text-[13px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] resize-none disabled:opacity-60"
                />
              </div>

              {/* Meta row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Prioridad</label>
                  <select
                    value={task.priority}
                    onChange={e =>
                      onUpdate({ priority: e.target.value as ProductivityTask['priority'] })
                    }
                    disabled={!canManage}
                    className={`${inputCls} disabled:opacity-60`}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Responsable</label>
                  <select
                    value={task.assignedTo ?? ''}
                    onChange={e =>
                      onUpdate({ assignedTo: e.target.value || null })
                    }
                    disabled={!canManage}
                    className={`${inputCls} disabled:opacity-60`}
                  >
                    <option value="">Sin asignar</option>
                    {TEAM.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    <Clock size={11} className="inline mr-1" />
                    Tiempo estimado (min)
                  </label>
                  <input
                    type="number"
                    value={task.estimatedMinutes ?? ''}
                    onChange={e =>
                      onUpdate({ estimatedMinutes: e.target.value ? Number(e.target.value) : null })
                    }
                    disabled={!canManage}
                    placeholder="0"
                    className={`${inputCls} disabled:opacity-60`}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <Calendar size={11} className="inline mr-1" />
                    Fecha limite
                  </label>
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                    onChange={e =>
                      onUpdate({ dueDate: e.target.value ? e.target.value : null })
                    }
                    disabled={!canManage}
                    className={`${inputCls} disabled:opacity-60`}
                  />
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-semibold text-[#1a1a1a]">Subtareas</h4>
                  {subtaskTotal > 0 && (
                    <span className="text-[11px] text-[#8a8680]">
                      {subtaskDone}/{subtaskTotal} completadas
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {subtaskTotal > 0 && (
                  <div className="h-1.5 rounded-full bg-[#FFF1B5] overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-[#2f9e44] transition-all"
                      style={{ width: `${subtaskPct}%` }}
                    />
                  </div>
                )}

                <div className="space-y-1.5 mb-2">
                  {task.subtasks.map((st: Subtask) => (
                    <button
                      key={st.id}
                      onClick={() => onToggleSubtask(st.id)}
                      className="flex items-center gap-2 w-full text-left group"
                    >
                      {st.done ? (
                        <CheckSquare size={16} className="text-[#2f9e44] shrink-0" />
                      ) : (
                        <Square size={16} className="text-[#8a8680] shrink-0" />
                      )}
                      <span
                        className={`text-[12.5px] ${
                          st.done ? 'text-[#8a8680] line-through' : 'text-[#1a1a1a]'
                        }`}
                      >
                        {st.title}
                      </span>
                    </button>
                  ))}
                </div>

                {canManage && (
                  <div className="flex items-center gap-2">
                    <input
                      value={subtaskTitle}
                      onChange={e => setSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddSubtask()
                      }}
                      placeholder="Nueva subtarea..."
                      className={inputCls}
                    />
                    <button
                      onClick={handleAddSubtask}
                      disabled={!subtaskTitle.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#7A1832] text-white text-[12px] font-medium disabled:opacity-50 hover:bg-[#591427] shrink-0"
                    >
                      <Plus size={12} /> Anadir
                    </button>
                  </div>
                )}
              </div>

              {/* Enlaces */}
              <div>
                <h4 className="text-[13px] font-semibold text-[#1a1a1a] mb-2">Enlaces</h4>
                <div className="space-y-1.5 mb-2">
                  {task.referenceLinks.length === 0 && (
                    <p className="text-[11.5px] text-[#8a8680]">Sin enlaces de referencia</p>
                  )}
                  {task.referenceLinks.map((url, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-white rounded-md border border-[#e8e6e3] px-2.5 py-1.5"
                    >
                      <Link2 size={13} className="text-[#7A1832] shrink-0" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-[#1a1a1a] hover:text-[#7A1832] truncate flex-1"
                      >
                        {url}
                      </a>
                      {canManage && (
                        <button
                          onClick={() => handleRemoveLink(i)}
                          className="p-1 rounded hover:bg-[#FFF5F5] text-[#8a8680] hover:text-[#e03131] shrink-0"
                          title="Eliminar enlace"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <input
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddLink()
                      }}
                      placeholder="https://..."
                      className={inputCls}
                    />
                    <button
                      onClick={handleAddLink}
                      disabled={!linkUrl.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#e8e6e3] text-[#3d3d3d] text-[12px] font-medium disabled:opacity-50 hover:bg-[#FFF1B5] shrink-0"
                    >
                      <Plus size={12} /> Anadir enlace
                    </button>
                  </div>
                )}
              </div>

              {/* Comentarios */}
              <div>
                <h4 className="text-[13px] font-semibold text-[#1a1a1a] mb-2">Comentarios</h4>
                <div className="space-y-2 mb-2">
                  {task.comments.length === 0 && (
                    <p className="text-[11.5px] text-[#8a8680]">Sin comentarios</p>
                  )}
                  {task.comments.map((c: TaskComment) => {
                    const author = resolveMemberAvatar(c.authorId)
                    return (
                      <div
                        key={c.id}
                        className="flex items-start gap-2 bg-white rounded-md border border-[#e8e6e3] p-2.5"
                      >
                        {author && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0"
                            style={{ background: author.color }}
                          >
                            {author.avatar}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11.5px] font-semibold text-[#1a1a1a]">
                              {author?.name ?? c.authorId}
                            </span>
                            <span className="text-[10px] text-[#8a8680]">
                              {relativeTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-[12.5px] text-[#3d3d3d] leading-snug whitespace-pre-wrap">
                            {c.text}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {canManage && (
                  <div className="space-y-2">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      rows={2}
                      placeholder="Escribe un comentario..."
                      className="w-full px-3 py-2 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] resize-none"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7A1832] text-white text-[12px] font-medium disabled:opacity-50 hover:bg-[#591427]"
                    >
                      <MessageSquare size={12} /> Enviar
                    </button>
                  </div>
                )}
              </div>

              {/* Historial */}
              {task.history.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[#1a1a1a] mb-2">Historial</h4>
                  <div className="space-y-2">
                    {task.history.map((h: TaskHistoryEntry, i) => (
                      <div key={h.id} className="flex items-start gap-2.5 relative">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-2 h-2 rounded-full bg-[#7A1832] mt-1" />
                          {i < task.history.length - 1 && (
                            <div className="w-px h-5 bg-[#FFF1B5] mt-0.5" />
                          )}
                        </div>
                        <div className="pb-2">
                          <p className="text-[12px] text-[#3d3d3d] leading-snug">{h.action}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10.5px] text-[#8a8680]">
                              {resolveMemberName(h.by)}
                            </span>
                            <span className="text-[10.5px] text-[#8a8680]">
                              {relativeTime(h.at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Postpone indicator */}
              {task.postponeCount > 0 && (
                <div className="flex items-center gap-2 bg-[#FFF9DB] border border-[#f08c00] rounded-md px-3 py-2">
                  <AlertCircle size={14} className="text-[#f08c00] shrink-0" />
                  <span className="text-[11.5px] text-[#8a8680]">
                    Esta tarea ha sido adelantada {task.postponeCount}{' '}
                    {task.postponeCount === 1 ? 'vez' : 'veces'}.
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-[#FFF1B5] sticky bottom-0 bg-[#FFFDF5]">
              <button
                onClick={handleStartFocus}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#7A1832] text-white text-[12.5px] font-medium hover:bg-[#591427] transition-colors"
              >
                <Play size={13} /> Iniciar enfoque
              </button>
              {task.column !== 'hecho' && (
                <button
                  onClick={handleMoveToHecho}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-white border border-[#2f9e44] text-[#2f9e44] text-[12.5px] font-medium hover:bg-[#EBFBEE] transition-colors"
                >
                  <Check size={13} /> Mover a Hecho
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}