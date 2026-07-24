'use client'
import type { ProductivityTask } from '@/lib/team/types'
import { Target, Clock, Timer } from 'lucide-react'

interface Props {
  tasks: ProductivityTask[]
  defaultPreset: number
  presets: number[]
  onStartFocus: (taskId: string) => void
  onUpdateSettings: (patch: { pomodoroPresets?: number[]; defaultPreset?: number }) => void
}

export default function Enfoque({ tasks, defaultPreset, presets, onStartFocus, onUpdateSettings }: Props) {
  const focusable = tasks.filter(t => t.column === 'ahora' || t.column === 'esta_semana')
  const ahoraTask = tasks.find(t => t.column === 'ahora')

  return (
    <div className="space-y-4">
      {/* Preset selector */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
        <div className="text-[13px] font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2">
          <Timer size={15} className="text-[#7A1832]" /> Duración por defecto
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => onUpdateSettings({ defaultPreset: p })}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                defaultPreset === p
                  ? 'bg-[#7A1832] text-white'
                  : 'bg-white border border-[#e8e6e3] text-[#3d3d3d] hover:border-[#7A1832]'
              }`}
            >
              {p} min
            </button>
          ))}
        </div>
      </div>

      {/* Recommended: ahora task */}
      {ahoraTask && (
        <div className="bg-gradient-to-br from-[#7A1832] to-[#591427] rounded-xl p-4 text-white">
          <div className="text-[11px] uppercase tracking-wide opacity-80 mb-1">Recomendado</div>
          <div className="text-[15px] font-semibold mb-3">{ahoraTask.title}</div>
          <button
            onClick={() => onStartFocus(ahoraTask.id)}
            className="bg-white text-[#7A1832] text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#FFFDF5] flex items-center gap-2"
          >
            <Target size={15} /> Empezar enfoque ({defaultPreset} min)
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-2">
        <div className="text-[13px] font-semibold text-[#1a1a1a] mb-2">Tareas disponibles</div>
        {focusable.length === 0 ? (
          <div className="text-[12px] text-[#8a8680] text-center py-6">
            No hay tareas para enfocarse. Mueve una tarea a "Ahora" o "Esta semana" desde el tablero.
          </div>
        ) : (
          focusable.map(t => (
            <button
              key={t.id}
              onClick={() => onStartFocus(t.id)}
              className="w-full text-left bg-[#FFFDF5] rounded-lg border border-[#e8e6e3] p-3 hover:border-[#7A1832]/40 transition-colors flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.column === 'ahora' ? 'bg-[#7A1832]' : 'bg-[#A04060]'}`}>
                <Target size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1a1a1a] truncate">{t.title}</div>
                <div className="text-[11px] text-[#8a8680] flex items-center gap-2">
                  {t.column === 'ahora' ? 'Ahora' : 'Esta semana'}
                  {t.estimatedMinutes && (<><span>·</span><span className="flex items-center gap-0.5"><Clock size={10} /> {t.estimatedMinutes}min</span></>)}
                  {t.subtasks.length > 0 && (<><span>·</span><span>{t.subtasks.filter(s => s.done).length}/{t.subtasks.length} subtareas</span></>)}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}