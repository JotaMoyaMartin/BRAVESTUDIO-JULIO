'use client'
import { useState } from 'react'
import type { Goal, ProductivityTask, GoalPeriod } from '@/lib/team/types'
import { Target, Plus, X, Check, Link2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'

interface Props {
  goals: Goal[]
  tasks: ProductivityTask[]
  canManage: boolean
  onCreateGoal: (input: { title: string; target: number; period: GoalPeriod; periodLabel: string; manualOffset?: number }) => void
  onUpdateGoal: (id: string, patch: Partial<Goal>) => void
  onDeleteGoal: (id: string) => void
  onLinkTask: (taskId: string, goalId: string | null) => void
  onSelectTask: (taskId: string) => void
}

function monthLabel(): string {
  const d = new Date()
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
}

function weekLabel(): string {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const weekNum = Math.ceil(((monday.getDate() + new Date(monday.getFullYear(), monday.getMonth(), 1).getDay()) / 7))
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `Semana ${weekNum} (${fmt(monday)}-${fmt(sunday)})`
}

export default function Objetivos({ goals, tasks, canManage, onCreateGoal, onUpdateGoal, onDeleteGoal, onLinkTask, onSelectTask }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [formPeriod, setFormPeriod] = useState<GoalPeriod>('monthly')
  const [formTitle, setFormTitle] = useState('')
  const [formTarget, setFormTarget] = useState('')
  const [formOffset, setFormOffset] = useState('0')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const monthly = goals.filter(g => g.period === 'monthly')
  const weekly = goals.filter(g => g.period === 'weekly')

  function submitGoal() {
    const target = parseInt(formTarget, 10)
    if (!formTitle.trim() || !target || target < 1) return
    onCreateGoal({
      title: formTitle.trim(),
      target,
      period: formPeriod,
      periodLabel: formPeriod === 'monthly' ? monthLabel() : weekLabel(),
      manualOffset: parseInt(formOffset, 10) || 0,
    })
    setFormTitle(''); setFormTarget(''); setFormOffset('0'); setShowForm(false)
  }

  function renderGoal(g: Goal): React.ReactElement {
    const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0
    const isEditing = editingId === g.id
    const isExpanded = expandedId === g.id
    const linkedTasks = g.taskIds.map(id => tasks.find(t => t.id === id)).filter(Boolean) as ProductivityTask[]
    const unlinkedTasks = tasks.filter(t => !t.goalId || (t.goalId !== g.id && !linkedTasks.find(lt => lt.id === t.id)))

    return (
      <div key={g.id} className="bg-white rounded-xl border border-[#FFF1B5] p-4">
        <div className="flex items-start gap-3">
          {/* Expand toggle */}
          <button
            onClick={() => setExpandedId(isExpanded ? null : g.id)}
            className="mt-1 text-[#8a8680] hover:text-[#7A1832] shrink-0"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  value={g.title}
                  onChange={e => onUpdateGoal(g.id, { title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
                />
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-[#8a8680]">Meta:</label>
                  <input
                    type="number"
                    value={g.target}
                    onChange={e => onUpdateGoal(g.id, { target: parseInt(e.target.value, 10) || 1 })}
                    className="w-16 px-2 py-1 text-[12px] rounded-md border border-[#e8e6e3] bg-white"
                  />
                  <label className="text-[11px] text-[#8a8680] ml-2">Hechas fuera del sistema:</label>
                  <input
                    type="number"
                    value={g.manualOffset}
                    onChange={e => onUpdateGoal(g.id, { manualOffset: parseInt(e.target.value, 10) || 0 })}
                    className="w-16 px-2 py-1 text-[12px] rounded-md border border-[#e8e6e3] bg-white"
                  />
                </div>
                <button onClick={() => setEditingId(null)} className="text-[12px] px-3 py-1 rounded-md bg-[#7A1832] text-white flex items-center gap-1">
                  <Check size={12} /> Hecho
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[14px] font-semibold text-[#1a1a1a] truncate">{g.title}</div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditingId(g.id)} className="text-[11px] text-[#8a8680] hover:text-[#7A1832] px-1.5 py-0.5 rounded hover:bg-[#FFFDF5]">Editar</button>
                      <button onClick={() => onDeleteGoal(g.id)} className="text-[#8a8680] hover:text-[#e03131] p-1 rounded hover:bg-[#FFF5F5]"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 h-2.5 bg-[#f4f3f1] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: pct >= 100 ? '#2f9e44' : '#7A1832' }}
                    />
                  </div>
                  <div className="text-[16px] font-bold text-[#1a1a1a] tabular-nums shrink-0">
                    {g.current}<span className="text-[#8a8680] font-normal text-[13px]">/{g.target}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#8a8680]">
                  <span>{pct}% · {g.periodLabel}</span>
                  <span>{linkedTasks.length} tarea{linkedTasks.length !== 1 ? 's' : ''} vinculada{linkedTasks.length !== 1 ? 's' : ''}</span>
                </div>

                {pct >= 100 && (
                  <div className="mt-2 text-[12px] text-[#2f9e44] font-medium flex items-center gap-1">
                    <Check size={13} /> ¡Objetivo completado!
                  </div>
                )}
              </>
            )}

            {/* Expanded: linked tasks */}
            {isExpanded && !isEditing && (
              <div className="mt-3 pt-3 border-t border-[#f4f3f1] space-y-1.5">
                <div className="text-[11px] font-semibold text-[#8a8680] flex items-center gap-1">
                  <Link2 size={12} /> Tareas vinculadas
                </div>
                {linkedTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-[12px]">
                    <button
                      onClick={() => onLinkTask(t.id, null)}
                      className="text-[#8a8680] hover:text-[#e03131] shrink-0"
                      title="Desvincular"
                    >
                      <X size={12} />
                    </button>
                    <button
                      onClick={() => onSelectTask(t.id)}
                      className={`flex-1 text-left truncate ${t.column === 'hecho' ? 'line-through text-[#8a8680]' : 'text-[#1a1a1a]'}`}
                    >
                      {t.title}
                    </button>
                    {t.column === 'hecho' && <Check size={12} className="text-[#2f9e44] shrink-0" />}
                  </div>
                ))}
                {linkedTasks.length === 0 && (
                  <p className="text-[11px] text-[#8a8680]">Sin tareas vinculadas. El progreso es manual.</p>
                )}

                {/* Add task to goal */}
                {canManage && unlinkedTasks.length > 0 && (
                  <div className="pt-2">
                    <select
                      value=""
                      onChange={e => { if (e.target.value) onLinkTask(e.target.value, g.id) }}
                      className="w-full px-2.5 py-1.5 text-[11.5px] rounded-md border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832]"
                    >
                      <option value="">+ Vincular tarea…</option>
                      {unlinkedTasks.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Monthly goals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2">
            <Target size={18} className="text-[#7A1832]" /> Este mes
          </h3>
          {canManage && !showForm && (
            <button onClick={() => { setShowForm(true); setFormPeriod('monthly') }} className="text-[12px] px-3 py-1.5 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427] flex items-center gap-1.5">
              <Plus size={14} /> Nuevo objetivo
            </button>
          )}
        </div>
        {monthly.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#FFF1B5] p-6 text-center text-[12px] text-[#8a8680]">
            Sin objetivos mensuales. {canManage && 'Crea uno para empezar a medir tu progreso.'}
          </div>
        ) : (
          <div className="space-y-3">{monthly.map(renderGoal)}</div>
        )}
      </div>

      {/* Weekly goals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2">
            <Target size={18} className="text-[#A04060]" /> Esta semana
          </h3>
          {canManage && !showForm && (
            <button onClick={() => { setShowForm(true); setFormPeriod('weekly') }} className="text-[12px] px-3 py-1.5 rounded-lg bg-[#A04060] text-white font-medium hover:bg-[#7A1832] flex items-center gap-1.5">
              <Plus size={14} /> Nuevo objetivo
            </button>
          )}
        </div>
        {weekly.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#FFF1B5] p-6 text-center text-[12px] text-[#8a8680]">
            Sin objetivos semanales. {canManage && 'Crea uno para enfocar la semana.'}
          </div>
        ) : (
          <div className="space-y-3">{weekly.map(renderGoal)}</div>
        )}
      </div>

      {/* New goal form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-3 max-w-[500px]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormPeriod('monthly')}
              className={`px-3 py-1.5 text-[12px] rounded-md font-medium ${formPeriod === 'monthly' ? 'bg-[#7A1832] text-white' : 'bg-[#FFFDF5] text-[#8a8680] border border-[#e8e6e3]'}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setFormPeriod('weekly')}
              className={`px-3 py-1.5 text-[12px] rounded-md font-medium ${formPeriod === 'weekly' ? 'bg-[#A04060] text-white' : 'bg-[#FFFDF5] text-[#8a8680] border border-[#e8e6e3]'}`}
            >
              Semanal
            </button>
          </div>
          <input
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            placeholder="¿Qué quieres lograr? (ej: 20 piezas publicadas)"
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832]"
          />
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[11px] text-[#8a8680] mb-1">Meta</label>
              <input type="number" min={1} value={formTarget} onChange={e => setFormTarget(e.target.value)} placeholder="20" className="w-20 px-2.5 py-1.5 text-[13px] rounded-md border border-[#e8e6e3] bg-[#FFFDF5]" />
            </div>
            <div>
              <label className="block text-[11px] text-[#8a8680] mb-1">Ya hechas (fuera del sistema)</label>
              <input type="number" min={0} value={formOffset} onChange={e => setFormOffset(e.target.value)} placeholder="0" className="w-20 px-2.5 py-1.5 text-[13px] rounded-md border border-[#e8e6e3] bg-[#FFFDF5]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submitGoal} disabled={!formTitle.trim() || !formTarget} className="text-[12px] px-3 py-1.5 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427] disabled:opacity-40 flex items-center gap-1">
              <Plus size={13} /> Crear objetivo
            </button>
            <button onClick={() => setShowForm(false)} className="text-[12px] px-3 py-1.5 rounded-lg bg-white border border-[#e8e6e3] text-[#3d3d3d] hover:bg-[#FFFDF5]">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}