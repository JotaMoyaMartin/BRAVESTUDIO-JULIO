'use client'
import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { useProductividad } from '@/lib/team/productividad-store'
import { Target, LayoutGrid, Timer } from 'lucide-react'
import KanbanBoard, { COLUMNS } from './productividad/KanbanBoard'
import TaskDetail from './productividad/TaskDetail'
import Enfoque from './productividad/Enfoque'
import FocusMode from './productividad/FocusMode'
import Objetivos from './productividad/Objetivos'
import ProductividadAssistant from './productividad/ProductividadAssistant'
import BraviMascot from '@/components/team/BraviMascot'
import type { ProductivityColumn } from '@/lib/team/types'

type SubView = 'objetivos' | 'tareas' | 'enfoque'

const SUB_NAV: { key: SubView; label: string; icon: any }[] = [
  { key: 'objetivos', label: 'Objetivos', icon: Target },
  { key: 'tareas', label: 'Tareas', icon: LayoutGrid },
  { key: 'enfoque', label: 'Enfoque', icon: Timer },
]

export default function Productividad() {
  const { user, member } = useAuth()
  const { state, moveTask, createTask, updateTask, deleteTask, addSubtask, toggleSubtask, createGoal, updateGoal, deleteGoal, linkTaskToGoal, addFocusSession, updateSettings } = useProductividad()

  const [subView, setSubView] = useState<SubView>('objetivos')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [alertMsg, setAlertMsg] = useState<{ text: string; mood: 'warn' | 'celebrate' | 'info' } | null>(null)

  const canManage = user?.role === 'admin' || user?.role === 'cm'
  const isEditorOrDesigner = user?.role === 'editor' || user?.role === 'designer'

  // Role-scoped tasks: editors/designers see only assigned tasks
  const scopedTasks = useMemo(() => {
    if (!member) return state.tasks
    if (isEditorOrDesigner) return state.tasks.filter(t => t.assignedTo === member.id)
    return state.tasks
  }, [state.tasks, isEditorOrDesigner, member])

  if (!user || !member) return null

  const selectedTask = selectedTaskId ? state.tasks.find(t => t.id === selectedTaskId) || null : null
  const focusTask = focusTaskId ? state.tasks.find(t => t.id === focusTaskId) || null : null

  function handleAlert(message: string, mood: 'warn' | 'celebrate' | 'info') {
    setAlertMsg({ text: message, mood })
    setTimeout(() => setAlertMsg(null), 4000)
  }

  function handleMoveTask(taskId: string, toColumn: ProductivityColumn) {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return
    const isPostpone = task.column === 'ahora' && toColumn === 'esta_semana'
    moveTask(taskId, toColumn)
    if (isPostpone && task.postponeCount + 1 >= state.settings.postponeAlertThreshold) {
      handleAlert(`Has aplazado "${task.title}" ${task.postponeCount + 1} veces. ¿Merece la pena seguirla?`, 'warn')
    }
  }

  // Multi-task alert
  const ahoraCount = scopedTasks.filter(t => t.column === 'ahora').length
  const showMultiTaskAlert = state.settings.multiTaskAlertEnabled && ahoraCount > 1

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Sub-navigation */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-1 flex items-center gap-1 sticky top-2 z-30">
        {SUB_NAV.map(s => {
          const Icon = s.icon
          const active = subView === s.key
          return (
            <button key={s.key} onClick={() => setSubView(s.key)} className={`px-4 py-2 text-[13px] font-medium rounded-lg flex items-center gap-2 transition-colors ${active ? 'bg-[#FFF1B5] text-[#7A1832]' : 'text-[#8a8680] hover:bg-[#FFFDF5]'}`}>
              <Icon size={16} /> {s.label}
            </button>
          )
        })}
      </div>

      {/* Multi-task alert */}
      {showMultiTaskAlert && subView === 'tareas' && (
        <div className="bg-[#FFF8D1] border border-[#f08c00]/30 rounded-xl p-3 text-[12px] text-[#3d3d3d] flex items-center gap-2">
          <Target size={15} className="text-[#f08c00]" /> Tienes {ahoraCount} tareas en "Ahora". El foco funciona con una sola tarea a la vez.
        </div>
      )}

      {/* Content */}
      {subView === 'objetivos' && (
        <Objetivos
          goals={state.goals}
          tasks={state.tasks}
          canManage={canManage}
          onCreateGoal={createGoal}
          onUpdateGoal={updateGoal}
          onDeleteGoal={deleteGoal}
          onLinkTask={linkTaskToGoal}
          onSelectTask={setSelectedTaskId}
        />
      )}

      {subView === 'tareas' && (
        <KanbanBoard
          tasks={scopedTasks}
          goals={state.goals}
          onMoveTask={handleMoveTask}
          onSelectTask={setSelectedTaskId}
          onAlert={handleAlert}
          onCreateTask={createTask}
          canManage={canManage}
        />
      )}

      {subView === 'enfoque' && (
        <Enfoque
          tasks={scopedTasks}
          defaultPreset={state.settings.defaultPreset}
          presets={state.settings.pomodoroPresets}
          onStartFocus={(taskId) => setFocusTaskId(taskId)}
          onUpdateSettings={updateSettings}
        />
      )}

      {/* Task detail modal */}
      <TaskDetail
        task={selectedTask}
        goals={state.goals}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={(patch) => selectedTaskId && updateTask(selectedTaskId, patch)}
        onAddSubtask={(title) => selectedTaskId && addSubtask(selectedTaskId, title)}
        onToggleSubtask={(sid) => selectedTaskId && toggleSubtask(selectedTaskId, sid)}
        onDelete={() => { if (selectedTaskId) { deleteTask(selectedTaskId); setSelectedTaskId(null) } }}
        onLinkGoal={(goalId) => selectedTaskId && linkTaskToGoal(selectedTaskId, goalId)}
        onStartFocus={() => { if (selectedTaskId) { setFocusTaskId(selectedTaskId); setSelectedTaskId(null) } }}
        canManage={canManage}
      />

      {/* Focus mode overlay */}
      <FocusMode
        task={focusTask}
        defaultPreset={state.settings.defaultPreset}
        presets={state.settings.pomodoroPresets}
        onAddFocusSession={addFocusSession}
        onToggleSubtask={(sid) => focusTaskId && toggleSubtask(focusTaskId, sid)}
        onClose={() => setFocusTaskId(null)}
      />

      {/* Alert mascot */}
      {alertMsg && (
        <div className="fixed bottom-6 left-6 z-40">
          <BraviMascot messages={[{ text: alertMsg.text, mood: alertMsg.mood }]} variant="float" rotateMs={0} />
        </div>
      )}

      {/* Floating AI assistant */}
      <ProductividadAssistant
        goals={state.goals}
        tasks={scopedTasks}
        focusSessionsCount={state.focusSessions.length}
        focusModeActive={!!focusTaskId}
        onCreateTask={createTask}
        onMoveTask={moveTask}
        onUpdateTask={updateTask}
        onLinkGoal={linkTaskToGoal}
        onDeleteTask={deleteTask}
      />
    </div>
  )
}