'use client'
import { Clock, Calendar, CheckSquare, AlertCircle, Target } from 'lucide-react'
import type { ProductivityTask, Goal } from '@/lib/team/types'

const PRIORITY_COLOR: Record<string, string> = {
  alta: '#e03131',
  media: '#f08c00',
  baja: '#2f9e44',
}

interface TaskCardProps {
  task: ProductivityTask
  goal?: Goal
  onClick: () => void
  dragging?: boolean
}

export default function TaskCard({ task, goal, onClick, dragging }: TaskCardProps) {
  const subtaskDone = task.subtasks.filter(s => s.done).length
  const subtaskTotal = task.subtasks.length
  const isOverdue =
    task.dueDate !== null &&
    new Date(task.dueDate) < new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')

  return (
    <div
      onClick={dragging ? undefined : onClick}
      className={`bg-white rounded-xl border border-[#FFF1B5] p-3 cursor-pointer transition-all hover:shadow-sm ${dragging ? 'opacity-40' : ''} ${task.column === 'hecho' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-[13px] font-medium text-[#1a1a1a] line-clamp-2 flex-1 leading-snug ${task.column === 'hecho' ? 'line-through' : ''}`}>
          {task.title}
        </p>
        <span
          className="w-2 h-2 rounded-full shrink-0 mt-1"
          style={{ background: PRIORITY_COLOR[task.priority] || '#8a8680' }}
          title={`Prioridad ${task.priority}`}
        />
      </div>

      {/* Goal badge */}
      {goal && (
        <div className="mb-1.5">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] text-[#7A1832] font-medium bg-[#FFF1B5]">
            <Target size={8} /> {goal.title}
          </span>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap">
        {task.estimatedMinutes !== null && task.estimatedMinutes > 0 && (
          <span className="flex items-center gap-1 text-[10.5px] text-[#8a8680]">
            <Clock size={10} /> {task.estimatedMinutes}min
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10.5px]" style={{ color: isOverdue ? '#e03131' : '#8a8680' }}>
            <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {subtaskTotal > 0 && (
          <span className="flex items-center gap-1 text-[10.5px] text-[#8a8680]">
            <CheckSquare size={10} /> {subtaskDone}/{subtaskTotal}
          </span>
        )}
        {task.postponeCount > 0 && (
          <span className="flex items-center gap-1 text-[10.5px] text-[#f08c00]">
            <AlertCircle size={10} /> {task.postponeCount}x
          </span>
        )}
      </div>
    </div>
  )
}