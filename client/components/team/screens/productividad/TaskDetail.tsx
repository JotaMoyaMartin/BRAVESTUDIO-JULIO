'use client'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Clock, Calendar, Plus, Play, Check, CheckSquare, Square, AlertCircle, Target, Trash2 } from 'lucide-react'
import type { ProductivityTask, Goal, Subtask, ProductivityPriority } from '@/lib/team/types'
import { TEAM } from '@/lib/team/mock-data'

interface TaskDetailProps {
  task: ProductivityTask | null
  goals: Goal[]
  onClose: () => void
  onUpdate: (patch: Partial<ProductivityTask>) => void
  onAddSubtask: (title: string) => void
  onToggleSubtask: (subtaskId: string) => void
  onDelete: () => void
  onLinkGoal: (goalId: string | null) => void
  onStartFocus: () => void
  canManage: boolean
}

const inputCls = 'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]'
const labelCls = 'block text-[11.5px] text-[#8a8680] mb-1'

export default function TaskDetail({ task, goals, onClose, onUpdate, onAddSubtask, onToggleSubtask, onDelete, onLinkGoal, onStartFocus, canManage }: TaskDetailProps) {
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [descDraft, setDescDraft] = useState('')

  useEffect(() => {
    if (task) setDescDraft(task.description)
  }, [task?.id])

  const subtaskDone = task?.subtasks.filter(s => s.done).length ?? 0
  const subtaskTotal = task?.subtasks.length ?? 0
  const subtaskPct = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0

  function handleAddSubtask() {
    const title = subtaskTitle.trim()
    if (!title) return
    onAddSubtask(title)
    setSubtaskTitle('')
  }

  function handleMoveToHecho() {
    onUpdate({ column: 'hecho' })
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
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#FFFDF5] border border-[#FFF1B5] rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-start gap-3 p-5 border-b border-[#FFF1B5] sticky top-0 bg-[#FFFDF5] z-10">
              <input
                value={task.title}
                onChange={e => onUpdate({ title: e.target.value })}
                disabled={!canManage}
                className="flex-1 text-[18px] font-bold text-[#1a1a1a] bg-transparent border-none outline-none focus:bg-white focus:border focus:border-[#FFF1B5] focus:rounded-md focus:px-2 focus:py-1 -mx-2 -my-1 transition-all"
                placeholder="Título"
              />
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#FFF1B5] text-[#8a8680] shrink-0 mt-0.5">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Description */}
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  onBlur={() => { if (descDraft !== task.description) onUpdate({ description: descDraft }) }}
                  rows={2}
                  disabled={!canManage}
                  placeholder="Añade una descripción…"
                  className="w-full px-3 py-2 text-[13px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] resize-none disabled:opacity-60"
                />
              </div>

              {/* Meta row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Prioridad</label>
                  <select
                    value={task.priority}
                    onChange={e => onUpdate({ priority: e.target.value as ProductivityPriority })}
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
                    onChange={e => onUpdate({ assignedTo: e.target.value || null })}
                    disabled={!canManage}
                    className={`${inputCls} disabled:opacity-60`}
                  >
                    <option value="">Sin asignar</option>
                    {TEAM.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}><Clock size={11} className="inline mr-1" />Estimado (min)</label>
                  <input
                    type="number"
                    value={task.estimatedMinutes ?? ''}
                    onChange={e => onUpdate({ estimatedMinutes: e.target.value ? Number(e.target.value) : null })}
                    disabled={!canManage}
                    placeholder="0"
                    className={`${inputCls} disabled:opacity-60`}
                  />
                </div>
                <div>
                  <label className={labelCls}><Calendar size={11} className="inline mr-1" />Fecha límite</label>
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                    onChange={e => onUpdate({ dueDate: e.target.value || null })}
                    disabled={!canManage}
                    className={`${inputCls} disabled:opacity-60`}
                  />
                </div>
              </div>

              {/* Goal selector */}
              <div>
                <label className={labelCls}><Target size={11} className="inline mr-1" />Vincular a objetivo</label>
                <select
                  value={task.goalId ?? ''}
                  onChange={e => onLinkGoal(e.target.value || null)}
                  disabled={!canManage}
                  className={`${inputCls} disabled:opacity-60`}
                >
                  <option value="">Sin objetivo</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.period === 'monthly' ? '📅' : '🗓️'} {g.title} ({g.current}/{g.target})</option>
                  ))}
                </select>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-semibold text-[#1a1a1a]">Subtareas</h4>
                  {subtaskTotal > 0 && (
                    <span className="text-[11px] text-[#8a8680]">{subtaskDone}/{subtaskTotal}</span>
                  )}
                </div>
                {subtaskTotal > 0 && (
                  <div className="h-1.5 rounded-full bg-[#FFF1B5] overflow-hidden mb-3">
                    <div className="h-full rounded-full bg-[#2f9e44] transition-all" style={{ width: `${subtaskPct}%` }} />
                  </div>
                )}
                <div className="space-y-1.5 mb-2">
                  {task.subtasks.map((st: Subtask) => (
                    <button key={st.id} onClick={() => onToggleSubtask(st.id)} className="flex items-center gap-2 w-full text-left">
                      {st.done ? <CheckSquare size={16} className="text-[#2f9e44] shrink-0" /> : <Square size={16} className="text-[#8a8680] shrink-0" />}
                      <span className={`text-[12.5px] ${st.done ? 'text-[#8a8680] line-through' : 'text-[#1a1a1a]'}`}>{st.title}</span>
                    </button>
                  ))}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <input
                      value={subtaskTitle}
                      onChange={e => setSubtaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask() }}
                      placeholder="Nueva subtarea…"
                      className={inputCls}
                    />
                    <button onClick={handleAddSubtask} disabled={!subtaskTitle.trim()} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#7A1832] text-white text-[12px] font-medium disabled:opacity-50 hover:bg-[#591427] shrink-0">
                      <Plus size={12} /> Añadir
                    </button>
                  </div>
                )}
              </div>

              {/* Postpone indicator */}
              {task.postponeCount > 0 && (
                <div className="flex items-center gap-2 bg-[#FFF9DB] border border-[#f08c00] rounded-md px-3 py-2">
                  <AlertCircle size={14} className="text-[#f08c00] shrink-0" />
                  <span className="text-[11.5px] text-[#8a8680]">Esta tarea ha sido aplazada {task.postponeCount} {task.postponeCount === 1 ? 'vez' : 'veces'}.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 p-5 border-t border-[#FFF1B5] sticky bottom-0 bg-[#FFFDF5]">
              {canManage ? (
                <button onClick={onDelete} className="text-[12px] text-[#8a8680] hover:text-[#e03131] flex items-center gap-1 px-2 py-1.5">
                  <Trash2 size={13} /> Eliminar
                </button>
              ) : <div />}
              <div className="flex items-center gap-2">
                <button onClick={onStartFocus} className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#7A1832] text-white text-[12.5px] font-medium hover:bg-[#591427]">
                  <Play size={13} /> Enfoque
                </button>
                {task.column !== 'hecho' && (
                  <button onClick={handleMoveToHecho} className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-white border border-[#2f9e44] text-[#2f9e44] text-[12.5px] font-medium hover:bg-[#EBFBEE]">
                    <Check size={13} /> Hecho
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}