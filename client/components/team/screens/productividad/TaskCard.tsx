'use client'
import { Clock, Calendar, CheckSquare, AlertCircle } from 'lucide-react'
import type { ProductivityTask, Project } from '@/lib/team/types'
import type { TeamMember } from '@/lib/team/types'

const PRIORITY_COLOR: Record<string, string> = {
  alta: '#e03131',
  media: '#f08c00',
  baja: '#2f9e44',
}

interface TaskCardProps {
  task: ProductivityTask
  project?: Project
  assignee?: TeamMember
  onClick: () => void
  dragging?: boolean
}

export default function TaskCard({ task, project, assignee, onClick, dragging }: TaskCardProps) {
  const subtaskDone = task.subtasks.filter(s => s.done).length
  const subtaskTotal = task.subtasks.length
  const isOverdue =
    task.dueDate !== null &&
    new Date(task.dueDate) < new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')

  return (
    <div
      onClick={dragging ? undefined : onClick}
      className={`bg-white rounded-xl border border-[#FFF1B5] p-3 cursor-pointer transition-all hover:shadow-sm ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[13px] font-medium text-[#1a1a1a] line-clamp-2 flex-1 leading-snug">
          {task.title}
        </p>
        <span
          className="w-2 h-2 rounded-full shrink-0 mt-1"
          style={{ background: PRIORITY_COLOR[task.priority] || '#8a8680' }}
          title={`Prioridad ${task.priority}`}
        />
      </div>

      {/* Project badge */}
      {project && (
        <div className="mb-2">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] text-white font-medium"
            style={{ background: project.color }}
          >
            {project.name}
          </span>
        </div>
      )}

      {/* Meta rows */}
      <div className="space-y-1">
        {task.estimatedMinutes !== null && task.estimatedMinutes > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-[#8a8680]">
            <Clock size={11} />
            <span>{task.estimatedMinutes}min</span>
          </div>
        )}
        {task.dueDate && (
          <div
            className="flex items-center gap-1 text-[11px]"
            style={{ color: isOverdue ? '#e03131' : '#8a8680' }}
          >
            <Calendar size={11} />
            <span>
              {new Date(task.dueDate).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
        )}
        {subtaskTotal > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-[#8a8680]">
            <CheckSquare size={11} />
            <span>
              {subtaskDone}/{subtaskTotal}
            </span>
          </div>
        )}
        {task.postponeCount > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-[#f08c00]">
            <AlertCircle size={11} />
            <span>Adelantada {task.postponeCount}x</span>
          </div>
        )}
      </div>

      {/* Assignee avatar */}
      {assignee && (
        <div className="mt-2 pt-2 border-t border-[#FFF1B5]/60 flex items-center justify-end">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
            style={{ background: assignee.color }}
            title={assignee.name}
          >
            {assignee.avatar}
          </div>
        </div>
      )}
    </div>
  )
}