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
import type { ProductivityTask, ProductivityColumn, Project } from '@/lib/team/types'
import type { TeamMember } from '@/lib/team/types'
import { TEAM } from '@/lib/team/mock-data'
import TaskCard from './TaskCard'

export const COLUMNS: { key: ProductivityColumn; label: string; max: number | null; color: string }[] = [
  { key: 'ahora', label: 'Ahora', max: 1, color: '#7A1832' },
  { key: 'hoy', label: 'Hoy', max: 5, color: '#A04060' },
  { key: 'esta_semana', label: 'Esta semana', max: null, color: '#591427' },
  { key: 'despues', label: 'Después', max: null, color: '#8a8680' },
  { key: 'hecho', label: 'Hecho', max: null, color: '#2f9e44' },
]

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baja: 2 }

interface KanbanBoardProps {
  tasks: ProductivityTask[]
  projects: Project[]
  onMoveTask: (taskId: string, toColumn: ProductivityColumn) => void
  onSelectTask: (taskId: string) => void
  onAlert: (message: string, mood: 'warn' | 'celebrate' | 'info') => void
  filterProjectId?: string | null
}

function resolveAssignee(memberId: string | null): TeamMember | undefined {
  if (!memberId) return undefined
  return TEAM.find(m => m.id === memberId)
}

function resolveProject(projectId: string, projects: Project[]): Project | undefined {
  return projects.find(p => p.id === projectId)
}

function DraggableTaskCard({
  task,
  projects,
  onSelect,
}: {
  task: ProductivityTask
  projects: Project[]
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
        project={resolveProject(task.projectId, projects)}
        assignee={resolveAssignee(task.assignedTo)}
        onClick={() => onSelect(task.id)}
        dragging={isDragging}
      />
    </div>
  )
}

function KanbanColumn({
  column,
  tasks,
  projects,
  onSelect,
}: {
  column: (typeof COLUMNS)[number]
  tasks: ProductivityTask[]
  projects: Project[]
  onSelect: (taskId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key })

  return (
    <div
      ref={setNodeRef}
      className={`bg-[#FFFDF5] rounded-xl border border-[#FFF1B5] p-2 w-[260px] shrink-0 min-h-[400px] flex flex-col ${
        isOver ? 'ring-2 ring-[#7A1832]' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-1 h-4 rounded-full shrink-0" style={{ background: column.color }} />
        <span className="text-[12.5px] font-semibold text-[#1a1a1a]">{column.label}</span>
        <span className="text-[11px] text-[#8a8680]">
          {tasks.length}
          {column.max !== null && `/${column.max}`}
        </span>
        {column.max !== null && tasks.length >= column.max && (
          <span className="text-[9px] text-[#e03131] font-medium ml-auto">max</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2">
        {tasks.map(task => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            projects={projects}
            onSelect={onSelect}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-[11px] text-[#8a8680] py-8 opacity-50">
            Sin tareas
          </div>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({
  tasks,
  projects,
  onMoveTask,
  onSelectTask,
  onAlert,
  filterProjectId = null,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<ProductivityTask | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const filteredTasks = filterProjectId
    ? tasks.filter(t => t.projectId === filterProjectId)
    : tasks

  const tasksByColumn = (column: ProductivityColumn): ProductivityTask[] =>
    filteredTasks
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
    const task = filteredTasks.find(t => t.id === taskId)
    if (!task) return

    // Same column → no-op
    if (task.column === targetColumnKey) return

    // Enforce max
    const targetCol = COLUMNS.find(c => c.key === targetColumnKey)
    if (targetCol && targetCol.max !== null) {
      const currentCount = filteredTasks.filter(t => t.column === targetColumnKey).length
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

  return (
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
            projects={projects}
            onSelect={onSelectTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 opacity-90 shadow-lg">
            <TaskCard
              task={activeTask}
              project={resolveProject(activeTask.projectId, projects)}
              assignee={resolveAssignee(activeTask.assignedTo)}
              onClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}