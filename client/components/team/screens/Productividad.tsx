'use client'
import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { useProductividad } from '@/lib/team/productividad-store'
import { TEAM } from '@/lib/team/mock-data'
import {
  LayoutGrid, Inbox as InboxIcon, Sun, CalendarDays, Target,
  CheckCheck, BarChart3, FolderKanban, Settings,
} from 'lucide-react'
import KanbanBoard, { COLUMNS } from './productividad/KanbanBoard'
import TaskDetail from './productividad/TaskDetail'
import Inbox from './productividad/Inbox'
import FocusMode from './productividad/FocusMode'
import Estadisticas from './productividad/Estadisticas'
import Proyectos from './productividad/Proyectos'
import Ajustes from './productividad/Ajustes'
import ProductividadAssistant from './productividad/ProductividadAssistant'
import BraviMascot from '@/components/team/BraviMascot'
import type { ProductivityColumn } from '@/lib/team/types'

type SubView = 'kanban' | 'inbox' | 'hoy' | 'semana' | 'focus' | 'hecho' | 'estadisticas' | 'proyectos' | 'ajustes'

const SUB_NAV: { key: SubView; label: string; icon: any }[] = [
  { key: 'kanban', label: 'Tablero', icon: LayoutGrid },
  { key: 'inbox', label: 'Bandeja', icon: InboxIcon },
  { key: 'hoy', label: 'Hoy', icon: Sun },
  { key: 'semana', label: 'Esta semana', icon: CalendarDays },
  { key: 'focus', label: 'Enfoque', icon: Target },
  { key: 'hecho', label: 'Hecho', icon: CheckCheck },
  { key: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { key: 'proyectos', label: 'Proyectos', icon: FolderKanban },
  { key: 'ajustes', label: 'Ajustes', icon: Settings },
]

export default function Productividad() {
  const { user, member } = useAuth()
  const { state, moveTask, createTask, updateTask, deleteTask, addSubtask, toggleSubtask, addComment, createProject, addInboxEntry, convertInboxToTask, addFocusSession, updateSettings } = useProductividad()

  const [subView, setSubView] = useState<SubView>('kanban')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)
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

  // Visible sub-views per role
  const visibleSubNav = SUB_NAV.filter(s => {
    if (s.key === 'proyectos' || s.key === 'ajustes') return canManage
    return true
  })

  const selectedTask = selectedTaskId ? state.tasks.find(t => t.id === selectedTaskId) || null : null
  const focusTask = focusTaskId ? state.tasks.find(t => t.id === focusTaskId) || null : null
  const focusProject = focusTask ? state.projects.find(p => p.id === focusTask.projectId) : undefined

  function handleAlert(message: string, mood: 'warn' | 'celebrate' | 'info') {
    setAlertMsg({ text: message, mood })
    setTimeout(() => setAlertMsg(null), 4000)
  }

  function handleMoveTask(taskId: string, toColumn: ProductivityColumn) {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return
    const isPostpone = (task.column === 'ahora' || task.column === 'hoy') && (toColumn === 'esta_semana' || toColumn === 'despues')
    moveTask(taskId, toColumn)
    if (isPostpone && task.postponeCount + 1 >= state.settings.postponeAlertThreshold) {
      handleAlert(`Has aplazado "${task.title}" ${task.postponeCount + 1} veces. ¿Merece la pena seguirla?`, 'warn')
    }
  }

  // Multi-task alert
  const ahoraCount = scopedTasks.filter(t => t.column === 'ahora').length
  const showMultiTaskAlert = state.settings.multiTaskAlertEnabled && ahoraCount > 1

  // Filtered views
  const hoyTasks = scopedTasks.filter(t => t.column === 'hoy')
  const semanaTasks = scopedTasks.filter(t => t.column === 'esta_semana')
  const hechasTasks = scopedTasks.filter(t => t.column === 'hecho')

  // AI summary generator for Estadisticas
  async function generateAISummary(): Promise<string> {
    const res = await fetch('/team/api/productividad/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorId: user!.id,
        message: 'Dame un resumen inteligente del progreso semanal con recomendaciones.',
        context: { tasks: scopedTasks, projects: state.projects, inboxCount: state.inbox.length, dailyStats: state.dailyStats, focusModeActive: false },
      }),
    })
    const j = await res.json()
    if (!res.ok) throw new Error(j.error || 'Error')
    return j.reply
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Sub-navigation */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-1 flex items-center gap-1 overflow-x-auto sticky top-2 z-30">
        {visibleSubNav.map(s => {
          const Icon = s.icon
          const active = subView === s.key
          return (
            <button key={s.key} onClick={() => { setSubView(s.key); setFilterProjectId(null) }} className={`px-3 py-1.5 text-[12px] font-medium rounded-lg whitespace-nowrap flex items-center gap-1.5 transition-colors ${active ? 'bg-[#FFF1B5] text-[#7A1832]' : 'text-[#8a8680] hover:bg-[#FFFDF5]'}`}>
              <Icon size={14} /> {s.label}
            </button>
          )
        })}
      </div>

      {/* Multi-task alert */}
      {showMultiTaskAlert && subView === 'kanban' && (
        <div className="bg-[#FFF8D1] border border-[#f08c00]/30 rounded-xl p-3 text-[12px] text-[#3d3d3d] flex items-center gap-2">
          <Target size={15} className="text-[#f08c00]" /> Tienes {ahoraCount} tareas en "Ahora". El foco funciona con una sola tarea a la vez.
        </div>
      )}

      {/* Content */}
      {subView === 'kanban' && (
        <KanbanBoard
          tasks={scopedTasks}
          projects={state.projects}
          onMoveTask={handleMoveTask}
          onSelectTask={setSelectedTaskId}
          onAlert={handleAlert}
          filterProjectId={filterProjectId}
        />
      )}

      {subView === 'inbox' && (
        <Inbox
          entries={state.inbox}
          projects={state.projects}
          onCapture={(text, source) => addInboxEntry(text, source)}
          onConvert={(entryId, input) => convertInboxToTask(entryId, input)}
        />
      )}

      {subView === 'hoy' && (
        <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Hoy · {hoyTasks.length} tareas</h3>
          <KanbanBoard tasks={hoyTasks} projects={state.projects} onMoveTask={handleMoveTask} onSelectTask={setSelectedTaskId} onAlert={handleAlert} />
        </div>
      )}

      {subView === 'semana' && (
        <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Esta semana · {semanaTasks.length} tareas</h3>
          <KanbanBoard tasks={semanaTasks} projects={state.projects} onMoveTask={handleMoveTask} onSelectTask={setSelectedTaskId} onAlert={handleAlert} />
        </div>
      )}

      {subView === 'focus' && (
        <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Modo enfoque</h3>
          <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-3">
            <p className="text-[12.5px] text-[#3d3d3d]">Selecciona una tarea para iniciar una sesión de enfoque con temporizador Pomodoro. La pantalla se limpia de distracciones.</p>
            <div className="space-y-2">
              {scopedTasks.filter(t => t.column === 'ahora' || t.column === 'hoy').slice(0, 6).map(t => {
                const p = state.projects.find(x => x.id === t.projectId)
                return (
                  <button key={t.id} onClick={() => { setFocusTaskId(t.id); }} className="w-full text-left bg-[#FFFDF5] rounded-lg border border-[#e8e6e3] p-3 hover:border-[#7A1832]/40 transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p?.color || '#7A1832' }}>
                      <Target size={15} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-[#1a1a1a] truncate">{t.title}</div>
                      <div className="text-[11px] text-[#8a8680]">{p?.name} · {t.estimatedMinutes || '?'} min estimados</div>
                    </div>
                  </button>
                )
              })}
              {scopedTasks.filter(t => t.column === 'ahora' || t.column === 'hoy').length === 0 && (
                <div className="text-[12px] text-[#8a8680] text-center py-4">No hay tareas en "Ahora" o "Hoy". Mueve una tarea a "Ahora" desde el tablero.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {subView === 'hecho' && (
        <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Hecho · {hechasTasks.length} completadas</h3>
          <KanbanBoard tasks={hechasTasks} projects={state.projects} onMoveTask={handleMoveTask} onSelectTask={setSelectedTaskId} onAlert={handleAlert} />
        </div>
      )}

      {subView === 'estadisticas' && (
        <Estadisticas
          dailyStats={state.dailyStats}
          tasks={scopedTasks}
          projects={state.projects}
          focusSessions={state.focusSessions}
          onGenerateAISummary={generateAISummary}
        />
      )}

      {subView === 'proyectos' && canManage && (
        <Proyectos
          projects={state.projects}
          tasks={state.tasks}
          onCreateProject={(input) => createProject(input)}
          onSelectProject={(pid) => { setFilterProjectId(pid); setSubView('kanban') }}
        />
      )}

      {subView === 'ajustes' && canManage && (
        <Ajustes settings={state.settings} onUpdate={updateSettings} />
      )}

      {/* Task detail modal */}
      <TaskDetail
        task={selectedTask}
        projects={state.projects}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={(patch) => selectedTaskId && updateTask(selectedTaskId, patch)}
        onAddSubtask={(title) => selectedTaskId && addSubtask(selectedTaskId, title)}
        onToggleSubtask={(sid) => selectedTaskId && toggleSubtask(selectedTaskId, sid)}
        onAddComment={(text) => selectedTaskId && addComment(selectedTaskId, member.id, text)}
        onStartFocus={() => { if (selectedTaskId) { setFocusTaskId(selectedTaskId); setSelectedTaskId(null) } }}
        canManage={canManage}
      />

      {/* Focus mode overlay */}
      <FocusMode
        task={focusTask}
        project={focusProject}
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
        tasks={scopedTasks}
        projects={state.projects}
        inboxCount={state.inbox.length}
        dailyStats={state.dailyStats}
        focusModeActive={!!focusTaskId}
      />
    </div>
  )
}