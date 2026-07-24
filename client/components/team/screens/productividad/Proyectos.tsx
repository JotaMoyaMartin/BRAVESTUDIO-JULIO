'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { TEAM } from '@/lib/team/mock-data'
import type { Project, ProductivityTask } from '@/lib/team/types'
import { FolderKanban, Plus, Users, TrendingUp, CheckCircle2, Circle } from 'lucide-react'

interface Props {
  projects: Project[]
  tasks: ProductivityTask[]
  onCreateProject: (input: { name: string; description: string; color: string }) => void
  onSelectProject: (projectId: string) => void
}

const COLORS = ['#7A1832', '#A04060', '#591427', '#9c36b5', '#2f9e44', '#f08c00', '#1c7ed6']

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  activo: { label: 'Activo', color: '#2f9e44', bg: '#EBFBEE' },
  pausado: { label: 'Pausado', color: '#8a8680', bg: '#f4f3f1' },
  completado: { label: 'Completado', color: '#7A1832', bg: '#FFF1B5' },
}

export default function Proyectos({ projects, tasks, onCreateProject, onSelectProject }: Props) {
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'cm'
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])

  function submit() {
    if (!name.trim()) return
    onCreateProject({ name: name.trim(), description: description.trim(), color })
    setName(''); setDescription(''); setColor(COLORS[0]); setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Proyectos</h3>
        {canManage && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-[12px] px-3 py-1.5 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427] flex items-center gap-1.5">
            <Plus size={14} /> Nuevo proyecto
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del proyecto" className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832]" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" rows={2} className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832] resize-none" />
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-[#8a8680]">Color:</span>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-[#1a1a1a]' : ''}`} style={{ background: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={submit} className="text-[12px] px-3 py-1.5 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427]">Crear</button>
            <button onClick={() => setShowForm(false)} className="text-[12px] px-3 py-1.5 rounded-lg bg-white border border-[#e8e6e3] text-[#3d3d3d] hover:bg-[#FFFDF5]">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id)
          const done = pTasks.filter(t => t.column === 'hecho').length
          const open = pTasks.length - done
          const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0
          const assignees = [...new Set(pTasks.map(t => t.assignedTo).filter(Boolean))] as string[]
          const cfg = STATUS_CFG[p.status] || STATUS_CFG.activo
          return (
            <button key={p.id} onClick={() => onSelectProject(p.id)} className="bg-white rounded-xl border border-[#FFF1B5] p-4 text-left hover:shadow-md hover:border-[#7A1832]/30 transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.color }}>
                  <FolderKanban size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-[#1a1a1a] truncate">{p.name}</div>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md font-medium inline-block" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                </div>
              </div>
              {p.description && <div className="text-[11.5px] text-[#8a8680] mb-3 line-clamp-2">{p.description}</div>}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8a8680] flex items-center gap-1"><TrendingUp size={11} /> Progreso</span>
                  <span className="text-[#3d3d3d] font-medium">{done}/{pTasks.length}</span>
                </div>
                <div className="h-1.5 bg-[#f4f3f1] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8a8680]">
                <span className="flex items-center gap-1"><Circle size={11} /> {open} abiertas</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-[#2f9e44]" /> {done} hechas</span>
                <div className="flex -space-x-1.5">
                  {assignees.slice(0, 3).map(id => {
                    const m = TEAM.find(t => t.id === id)
                    return m ? (
                      <div key={id} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white" style={{ background: m.color }}>{m.avatar}</div>
                    ) : null
                  })}
                </div>
              </div>
              {p.nextAction && (
                <div className="mt-3 pt-3 border-t border-[#f4f3f1] text-[11px] text-[#3d3d3d]">
                  <span className="text-[#8a8680]">Próxima acción: </span>{p.nextAction}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}