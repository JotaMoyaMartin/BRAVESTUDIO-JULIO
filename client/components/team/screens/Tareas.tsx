'use client'
import { useState, useMemo, useRef } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS, TEAM, ROLE_LABELS } from '@/lib/team/mock-data'
import {
  getAllTasks, createTask, updateTask, deleteTask,
  setTaskStatus, setTaskPriority, getTasksByAssignee,
} from '@/lib/team/task-store'
import type { Task, TaskPriority, TaskStatus, TaskType } from '@/lib/team/types'
import {
  Plus, X, Paperclip, Link2, Trash2, Check,
  AlertTriangle, StickyNote, MessageSquare, User, LayoutGrid,
  ImagePlus,
} from 'lucide-react'
import BraviMascot from '@/components/team/BraviMascot'

const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string; bg: string; border: string }> = {
  alta: { label: 'Alta', color: '#e03131', bg: '#FFF5F5', border: '#ffd0d0' },
  media: { label: 'Media', color: '#f08c00', bg: '#FFF8D1', border: '#FFF8D1' },
  baja: { label: 'Baja', color: '#591427', bg: '#C1DBE8', border: '#C1DBE8' },
}

const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
  pendiente: { label: 'Pendiente', color: '#8a8680', bg: '#f4f3f1', dot: '#8a8680' },
  en_proceso: { label: 'En proceso', color: '#591427', bg: '#C1DBE8', dot: '#591427' },
  hecha: { label: 'Hecha', color: '#2f9e44', bg: '#EBFBEE', dot: '#2f9e44' },
  descartada: { label: 'Descartada', color: '#adb5bd', bg: '#f8f9fa', dot: '#adb5bd' },
}

const TYPE_CFG: Record<TaskType, { label: string; icon: any; color: string }> = {
  correction: { label: 'Corrección', icon: AlertTriangle, color: '#e03131' },
  priority_note: { label: 'Prioridad', icon: StickyNote, color: '#A04060' },
  cm_request: { label: 'Petición CM', icon: MessageSquare, color: '#7A1832' },
  other: { label: 'Otro', icon: User, color: '#591427' },
}

export default function Tareas() {
  const { user, member } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)
  const [view, setView] = useState<'all' | 'mine'>('all')
  const [filterClient, setFilterClient] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverPriority, setDragOverPriority] = useState<TaskPriority | null>(null)

  const allTasks = useMemo(() => getAllTasks(), [refreshKey])
  if (!user || !member) return null

  const canCreate = user.role === 'admin' || user.role === 'cm'

  let tasks = allTasks
  if (view === 'mine') tasks = tasks.filter(t => t.assignedTo === member.id)
  if (filterClient) tasks = tasks.filter(t => t.clientId === filterClient)
  // Hide discarded in default view
  const visibleTasks = tasks.filter(t => t.status !== 'descartada')

  // Group by priority columns
  const columns: TaskPriority[] = ['alta', 'media', 'baja']
  const byPriority: Record<TaskPriority, Task[]> = {
    alta: visibleTasks.filter(t => t.priority === 'alta' && t.status !== 'hecha'),
    media: visibleTasks.filter(t => t.priority === 'media' && t.status !== 'hecha'),
    baja: visibleTasks.filter(t => t.priority === 'baja' && t.status !== 'hecha'),
  }
  const doneTasks = visibleTasks.filter(t => t.status === 'hecha')

  const reload = () => setRefreshKey(k => k + 1)

  const onDropPriority = (prio: TaskPriority) => {
    if (!draggedId) return
    setTaskPriority(draggedId, prio)
    setDraggedId(null)
    setDragOverPriority(null)
    reload()
  }

  // BRAVI contextual messages
  const braviMessages: { text: string; mood?: 'motivate' | 'tip' | 'info' | 'warn' | 'celebrate' }[] = (() => {
    const firstName = user.name.split(' ')[0]
    const high = byPriority.alta.length
    const corrections = visibleTasks.filter(t => t.type === 'correction' && t.status !== 'hecha').length
    const myPending = view === 'mine' ? visibleTasks.filter(t => t.assignedTo === member.id && t.status !== 'hecha').length : 0
    if (corrections > 0) {
      return [
        { text: `${firstName}, hay ${corrections} corrección${corrections > 1 ? 'es' : ''} de cliente sin resolver. Suelen ser lo más urgente.`, mood: 'warn' },
        { text: 'Las correcciones llegan desde la vista pública del cliente: revísalas y responde antes del lunes.', mood: 'tip' },
      ]
    }
    if (high > 0) {
      return [
        { text: `Tienes ${high} tarea${high > 1 ? 's' : ''} de prioridad alta. Arrastra entre columnas para reorganizar.`, mood: 'motivate' },
        { text: 'Las prioridades altas deberían cerrarse primero — el cliente las está esperando.', mood: 'tip' },
      ]
    }
    if (view === 'mine' && myPending === 0) {
      return [{ text: `¡Sin tareas pendientes, ${firstName}! 🎉 Puedes adelantar copys o revisar la planificación.`, mood: 'celebrate' }]
    }
    if (visibleTasks.length === 0) {
      return [{ text: 'No hay tareas activas. Cuando un cliente pida cambios desde la vista pública, aparecerán aquí solas.', mood: 'info' }]
    }
    return [
      { text: `${visibleTasks.length} tareas activas. Las CM pueden crear tareas para editor o diseñadora desde aquí.`, mood: 'info' },
      { text: 'Consejo: arrastrar a «Alta» sube la prioridad. Marcar con ✓ la pasa a Hechas.', mood: 'tip' },
    ]
  })()

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-[#7A1832]" />
            <h2 className="font-semibold text-[14px] text-[#1a1a1a]">Tareas del equipo</h2>
            <span className="text-[11px] text-[#8a8680]">{visibleTasks.length} activas · {doneTasks.length} hechas</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex gap-1 bg-[#FFFDF5] rounded-lg p-1 border border-[#FFF1B5]">
              {(['all', 'mine'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                    view === v ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-[#8a8680]'
                  }`}
                >
                  {v === 'all' ? 'Todas' : 'Mis tareas'}
                </button>
              ))}
            </div>
            {/* Client filter */}
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="text-[12px] px-2.5 py-1.5 rounded-md border border-[#FFF1B5] bg-white text-[#3d3d3d] focus:outline-none focus:border-[#7A1832]"
            >
              <option value="">Todos los clientes</option>
              {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {canCreate && (
              <button
                onClick={() => { setEditing(null); setShowForm(true) }}
                className="text-[12.5px] font-medium bg-[#7A1832] hover:bg-[#591427] text-white px-3 py-1.5 rounded-md flex items-center gap-1.5"
              >
                <Plus size={14} /> Nueva tarea
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BRAVI mascot */}
      <BraviMascot messages={braviMessages} />

      {/* New/edit form */}
      {showForm && (
        <TaskForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload() }}
        />
      )}

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {columns.map(prio => {
          const cfg = PRIORITY_CFG[prio]
          const col = byPriority[prio]
          return (
            <div
              key={prio}
              onDragOver={e => { e.preventDefault(); setDragOverPriority(prio) }}
              onDragLeave={() => setDragOverPriority(null)}
              onDrop={() => onDropPriority(prio)}
              className={`rounded-xl p-3 min-h-[300px] border-2 transition-colors ${dragOverPriority === prio ? 'border-dashed' : 'border-solid'}`}
              style={{ background: cfg.bg, borderColor: dragOverPriority === prio ? cfg.color : cfg.border }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                  <span className="text-[12.5px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
                <span className="text-[11px] text-[#8a8680] bg-white px-1.5 py-0.5 rounded-full">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.length === 0 ? (
                  <div className="text-center text-[11.5px] text-[#8a8680] py-6 italic">Sin tareas</div>
                ) : col.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => { setEditing(task); setShowForm(true) }}
                    onComplete={() => { setTaskStatus(task.id, 'hecha'); reload() }}
                    onDragStart={() => setDraggedId(task.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverPriority(null) }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Done column */}
      {doneTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check size={14} className="text-[#2f9e44]" />
            <h3 className="text-[13px] font-semibold text-[#1a1a1a]">Hechas</h3>
            <span className="text-[11px] text-[#8a8680]">{doneTasks.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {doneTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => { setEditing(task); setShowForm(true) }}
                onComplete={() => { setTaskStatus(task.id, 'pendiente'); reload() }}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({
  task, onEdit, onComplete, onDragStart, onDragEnd, compact,
}: {
  task: Task
  onEdit?: () => void
  onComplete?: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
  compact?: boolean
}) {
  const client = CLIENTS.find(c => c.id === task.clientId)
  const assignee = task.assignedTo ? TEAM.find(t => t.id === task.assignedTo) : null
  const typeCfg = TYPE_CFG[task.type]
  const TypeIcon = typeCfg.icon
  const isClientReq = task.requestedByRole === 'client'

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className={`bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all ${compact ? 'opacity-70' : ''}`}
      style={{ borderColor: typeCfg.color + '40', borderLeftWidth: 3, borderLeftColor: typeCfg.color }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[10.5px] font-medium" style={{ color: typeCfg.color }}>
          <TypeIcon size={11} />
          {typeCfg.label}
          {isClientReq && <span className="ml-1 bg-[#FFF1B5] text-[#7A1832] px-1.5 py-0.5 rounded-full">Cliente</span>}
        </div>
        {onComplete && (
          <button
            onClick={(e) => { e.stopPropagation(); onComplete() }}
            title={task.status === 'hecha' ? 'Reabrir' : 'Marcar hecha'}
            className="text-[#8a8680] hover:text-[#2f9e44] p-1 -m-1"
          >
            <Check size={14} />
          </button>
        )}
      </div>

      {/* Title */}
      <div className="text-[12.5px] font-semibold text-[#1a1a1a] leading-snug mb-1">{task.title}</div>

      {/* Description */}
      {task.description && (
        <div className="text-[11.5px] text-[#3d3d3d] leading-snug mb-2 line-clamp-3 whitespace-pre-wrap">{task.description}</div>
      )}

      {/* Attachments / links indicators */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {task.attachments.length > 0 && (
          <span className="text-[10px] text-[#8a8680] bg-[#FFFDF5] border border-[#FFF1B5] px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <Paperclip size={9} /> {task.attachments.length}
          </span>
        )}
        {task.referenceLinks.length > 0 && (
          <span className="text-[10px] text-[#591427] bg-[#C1DBE8] border border-[#C1DBE8] px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <Link2 size={9} /> {task.referenceLinks.length}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#f4f3f1]">
        <div className="flex items-center gap-1.5 min-w-0">
          {client && (
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: client.logoColor }}>
              {client.name[0]}
            </div>
          )}
          <span className="text-[10.5px] text-[#8a8680] truncate">{client?.name}</span>
        </div>
        {assignee && (
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: assignee.color }} title={`Asignada a ${assignee.name}`}>
              {assignee.avatar}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface FormProps {
  editing: Task | null
  onClose: () => void
  onSaved: () => void
}

function TaskForm({ editing, onClose, onSaved }: FormProps) {
  const { member } = useAuth()
  const [clientId, setClientId] = useState(editing?.clientId || '')
  const [title, setTitle] = useState(editing?.title || '')
  const [description, setDescription] = useState(editing?.description || '')
  const [type, setType] = useState<TaskType>(editing?.type || 'cm_request')
  const [priority, setPriority] = useState<TaskPriority>(editing?.priority || 'media')
  const [assignedTo, setAssignedTo] = useState(editing?.assignedTo || '')
  const [referenceLinks, setReferenceLinks] = useState<string[]>(editing?.referenceLinks || [])
  const [newLink, setNewLink] = useState('')
  const [attachments, setAttachments] = useState<string[]>(editing?.attachments || [])
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!member) return null

  // Default assignee based on client + type
  const effectiveAssignee = assignedTo || (() => {
    const c = CLIENTS.find(x => x.id === clientId)
    if (!c) return ''
    if (type === 'correction' || type === 'cm_request') return c.cmId || ''
    return ''
  })()

  const addLink = () => {
    if (!newLink.trim()) return
    setReferenceLinks([...referenceLinks, newLink.trim()])
    setNewLink('')
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).slice(0, 4).forEach(file => {
      if (file.size > 3 * 1024 * 1024) { setError('Cada imagen debe ser < 3MB'); return }
      const reader = new FileReader()
      reader.onload = () => setAttachments(prev => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
  }

  const save = () => {
    if (!clientId) { setError('Elige un cliente'); return }
    if (!title.trim()) { setError('El título es obligatorio'); return }
    const finalAssignee = effectiveAssignee || null
    if (editing) {
      updateTask(editing.id, {
        clientId, title, description, type, priority,
        assignedTo: finalAssignee,
        attachments, referenceLinks,
      })
    } else {
      createTask({
        clientId, title, description, type, priority,
        assignedTo: finalAssignee,
        attachments, referenceLinks,
        requestedByRole: member.role as any,
        requestedById: member.id,
      })
    }
    onSaved()
  }

  const remove = () => {
    if (!editing) return
    if (confirm('¿Eliminar esta tarea?')) { deleteTask(editing.id); onSaved() }
  }

  return (
    <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-3 max-w-[680px]">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[14px] text-[#1a1a1a]">{editing ? 'Editar tarea' : 'Nueva tarea'}</h3>
        <div className="flex items-center gap-2">
          {editing && (
            <button onClick={remove} className="text-[11.5px] text-[#e03131] hover:bg-[#FFF5F5] px-2 py-1 rounded-md flex items-center gap-1">
              <Trash2 size={12} /> Eliminar
            </button>
          )}
          <button onClick={onClose} className="text-[#8a8680] hover:text-[#1a1a1a]"><X size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Client */}
        <div>
          <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1">Cliente</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full px-2.5 py-2 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
          >
            <option value="">— elegir —</option>
            {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {/* Type */}
        <div>
          <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1">Tipo</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as TaskType)}
            className="w-full px-2.5 py-2 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
          >
            {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1">Título</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ej: Cambiar copy del reel del jueves"
          className="w-full px-3 py-2 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Detalla qué se necesita…"
          className="w-full px-3 py-2 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] resize-y"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Priority */}
        <div>
          <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1">Prioridad</label>
          <div className="flex gap-1">
            {(['alta', 'media', 'baja'] as const).map(p => {
              const cfg = PRIORITY_CFG[p]
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-2 py-1.5 text-[11.5px] font-medium rounded-md border transition-colors ${
                    priority === p ? 'text-white' : 'text-[#3d3d3d] bg-white border-[#e8e6e3] hover:bg-[#FFFDF5]'
                  }`}
                  style={priority === p ? { background: cfg.color, borderColor: cfg.color } : undefined}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
        {/* Assignee */}
        <div>
          <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1">Asignada a</label>
          <select
            value={effectiveAssignee}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full px-2.5 py-2 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
          >
            <option value="">— sin asignar —</option>
            {TEAM.map(t => <option key={t.id} value={t.id}>{t.name} · {ROLE_LABELS[t.role]}</option>)}
          </select>
        </div>
      </div>

      {/* Reference links */}
      <div>
        <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1 flex items-center gap-1">
          <Link2 size={11} /> Links de referencia
        </label>
        <div className="flex gap-1.5 mb-1.5">
          <input
            value={newLink}
            onChange={e => setNewLink(e.target.value)}
            placeholder="https://…"
            className="flex-1 px-2.5 py-1.5 text-[12px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
          />
          <button
            onClick={addLink}
            className="text-[12px] text-[#591427] hover:bg-[#C1DBE8] border border-[#C1DBE8] px-2.5 py-1.5 rounded-md"
          >
            Añadir
          </button>
        </div>
        {referenceLinks.length > 0 && (
          <div className="space-y-1">
            {referenceLinks.map((l, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11.5px] text-[#591427] bg-[#C1DBE8] border border-[#C1DBE8] px-2 py-1 rounded-md">
                <Link2 size={11} />
                <a href={l} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">{l}</a>
                <button onClick={() => setReferenceLinks(referenceLinks.filter((_, j) => j !== i))} className="text-[#8a8680] hover:text-[#e03131]">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-[11px] font-medium text-[#3d3d3d] mb-1 flex items-center gap-1">
          <Paperclip size={11} /> Adjuntos (foto/captura)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full text-[11.5px] text-[#8a8680] hover:text-[#7A1832] border border-dashed border-[#A04060] hover:bg-[#FFF1B5]/30 rounded-md py-2 flex items-center justify-center gap-1.5"
        >
          <ImagePlus size={13} /> Añadir imágenes (max 3MB)
        </button>
        {attachments.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {attachments.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-[#e8e6e3]">
                <img src={img} alt={`Adjunto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white p-0.5 rounded-full"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="text-[11.5px] text-[#e03131] bg-[#FFF5F5] border border-[#ffd0d0] px-3 py-1.5 rounded-md">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-[#f4f3f1]">
        <button onClick={onClose} className="text-[12.5px] text-[#8a8680] hover:text-[#1a1a1a] px-3 py-2">Cancelar</button>
        <button
          onClick={save}
          className="text-[12.5px] font-medium bg-[#7A1832] hover:bg-[#591427] text-white px-4 py-2 rounded-md flex items-center gap-1.5"
        >
          <Check size={14} /> {editing ? 'Guardar' : 'Crear tarea'}
        </button>
      </div>
    </div>
  )
}