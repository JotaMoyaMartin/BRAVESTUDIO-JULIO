'use client'
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import type { ProductivityTask, ProductivityColumn, Goal } from '@/lib/team/types'
import TaskCard from './TaskCard'
import { Plus } from 'lucide-react'

export const COLUMNS: { key: ProductivityColumn; label: string; max: number | null; color: string }[] = [
  { key: 'ahora', label: 'Ahora', max: 1, color: '#7A1832' },
  { key: 'esta_semana', label: 'Esta semana', max: null, color: '#A04060' },
  { key: 'hecho', label: 'Hecho', max: null, color: '#2f9e44' },
]

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baja: 2 }

interface KanbanBoardProps {
  tasks: ProductivityTask[]
  goals: Goal[]
  onMoveTask: (taskId: string, toColumn: ProductivityColumn) => void
  onSelectTask: (taskId: string) => void
  onAlert: (message: string, mood: 'warn' | 'celebrate' | 'info') => void
  onCreateTask: (input: { title: string; column?: ProductivityColumn }) => void
  canManage: boolean
}

function resolveGoal(goalId: string | null, goals: Goal[]): Goal | undefined {
  if (!goalId) return undefined
  return goals.find(g => g.id === goalId)
}

function DraggableTaskCard({ task, goals, onSelect }: {
  task: ProductivityTask
  goals: Goal[]
  onSelect: (taskId: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="touch-none">
      <TaskCard
        task={task}
        goal={resolveGoal(task.goalId, goals)}
        onClick={() => onSelect(task.id)}
        dragging={isDragging}
      />
    </div>
  )
}

function KanbanColumn({ column, tasks, goals, onSelect }: {
  column: (typeof COLUMNS)[number]
  tasks: ProductivityTask[]
  goals: Goal[]
  onSelect: (taskId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key })
  return (
    <div
      ref={setNodeRef}
      className={`bg-[#FFFDF5] rounded-xl border border-[#FFF1B5] p-2 w-[280px] shrink-0 min-h-[300px] flex flex-col ${isOver ? 'ring-2 ring-[#7A1832]' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-1.5 h-4 rounded-full shrink-0" style={{ background: column.color }} />
        <span className="text-[13px] font-semibold text-[#1a1a1a]">{column.label}</span>
        <span className="text-[11px] text-[#8a8680]">
          {tasks.length}
          {column.max !== null && `/${column.max}`}
        </span>
        {column.max !== null && tasks.length >= column.max && (
          <span className="text-[9px] text-[#e03131] font-medium ml-auto">max</span>
        )}
      </div>
      <div className="flex-1 space-y-2">
        {tasks.map(task => (
          <DraggableTaskCard key={task.id} task={task} goals={goals} onSelect={onSelect} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-[11px] text-[#8a8680] py-8 opacity-50">Sin tareas</div>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ tasks, goals, onMoveTask, onSelectTask, onAlert, onCreateTask, canManage }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<ProductivityTask | null>(null)
  const [quickInput, setQuickInput] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const tasksByColumn = (column: ProductivityColumn): ProductivityTask[] =>
    tasks
      .filter(t => t.column === column)
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 99
        const pb = PRIORITY_ORDER[b.priority] ?? 99
        if (pa !== pb) return pa - pb
        return a.createdAt.localeCompare(b.createdAt)
      })

  function handleDragStart(e: { active: { data: { current: unknown } } }) {
    const data = e.active.data.current as { task?: ProductivityTask } | null
    setActiveTask(data?.task ?? null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return
    const taskId = active.id as string
    const targetColumnKey = over.id as ProductivityColumn
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    if (task.column === targetColumnKey) return

    const targetCol = COLUMNS.find(c => c.key === targetColumnKey)
    if (targetCol && targetCol.max !== null) {
      const currentCount = tasks.filter(t => t.column === targetColumnKey).length
      if (currentCount >= targetCol.max) {
        onAlert(`La columna "${targetCol.label}" ya está al máximo (${targetCol.max})`, 'warn')
        return
      }
    }
    onMoveTask(taskId, targetColumnKey)
    if (targetColumnKey === 'hecho') {
      onAlert('Tarea completada!', 'celebrate')
    }
  }

  function handleQuickAdd() {
    const title = quickInput.trim()
    if (!title) return
    onCreateTask({ title, column: 'esta_semana' })
    setQuickInput('')
  }

  return (
    <div className="space-y-3">
      {/* Quick capture */}
      {canManage && (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-2.5 flex items-center gap-2">
          <input
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd() }}
            placeholder="Captura una tarea rápida…"
            className="flex-1 px-3 py-1.5 text-[13px] bg-transparent focus:outline-none placeholder:text-[#8a8680]"
          />
          <button
            onClick={handleQuickAdd}
            disabled={!quickInput.trim()}
            className="text-[12px] px-3 py-1.5 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427] disabled:opacity-40 flex items-center gap-1"
          >
            <Plus size={13} /> Añadir
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.key}
              column={column}
              tasks={tasksByColumn(column.key)}
              goals={goals}
              onSelect={onSelectTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 opacity-90 shadow-lg">
              <TaskCard
                task={activeTask}
                goal={resolveGoal(activeTask.goalId, goals)}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}