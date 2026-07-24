'use client'
import { useState, useEffect, useCallback } from 'react'
import type {
  ProductivityState,
  ProductivityTask,
  Goal,
  FocusSession,
  ProductivitySettings,
  ProductivityColumn,
  ProductivityPriority,
  Subtask,
} from './types'

// ─────────────────────────────────────────────
// Storage key (v2 — nuevo para evitar conflictos)
// ─────────────────────────────────────────────
const STORAGE_KEY = 'brave_content_productividad_v2'

// ─────────────────────────────────────────────
// ID helper
// ─────────────────────────────────────────────
function rid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─────────────────────────────────────────────
// Goal current calculator
// ─────────────────────────────────────────────
function recalcGoalCurrent(goal: Goal, tasks: ProductivityTask[]): Goal {
  const doneCount = goal.taskIds
    .map(id => tasks.find(t => t.id === id))
    .filter(t => t && t.column === 'hecho')
    .length
  return { ...goal, current: doneCount + goal.manualOffset }
}

function recalcAllGoals(goals: Goal[], tasks: ProductivityTask[]): Goal[] {
  return goals.map(g => recalcGoalCurrent(g, tasks))
}

// ─────────────────────────────────────────────
// SEED — simplified v2 data
// ─────────────────────────────────────────────
export const SEED_STATE: ProductivityState = {
  goals: [
    // ── Monthly (Julio 2026) ──
    {
      id: 'goal-m1',
      title: 'Piezas de contenido publicadas',
      target: 20,
      current: 12,
      period: 'monthly',
      periodLabel: 'Julio 2026',
      taskIds: ['pt-011', 'pt-012'],
      manualOffset: 10, // 10 piezas hechas fuera del sistema
      createdAt: '2026-07-01T09:00:00.000Z',
    },
    {
      id: 'goal-m2',
      title: 'Reels grabados',
      target: 10,
      current: 6,
      period: 'monthly',
      periodLabel: 'Julio 2026',
      taskIds: ['pt-001', 'pt-002'],
      manualOffset: 4,
      createdAt: '2026-07-01T09:00:00.000Z',
    },
    {
      id: 'goal-m3',
      title: 'Webinars preparados',
      target: 5,
      current: 2,
      period: 'monthly',
      periodLabel: 'Julio 2026',
      taskIds: ['pt-003'],
      manualOffset: 1,
      createdAt: '2026-07-01T09:00:00.000Z',
    },
    // ── Weekly (Semana 30) ──
    {
      id: 'goal-w1',
      title: 'Reels editados esta semana',
      target: 5,
      current: 2,
      period: 'weekly',
      periodLabel: 'Semana 30 (22-28 jul)',
      taskIds: ['pt-002', 'pt-011'],
      manualOffset: 0,
      createdAt: '2026-07-22T09:00:00.000Z',
    },
    {
      id: 'goal-w2',
      title: 'Sesiones de enfoque',
      target: 3,
      current: 1,
      period: 'weekly',
      periodLabel: 'Semana 30 (22-28 jul)',
      taskIds: [],
      manualOffset: 1,
      createdAt: '2026-07-22T09:00:00.000Z',
    },
  ],
  tasks: [
    // ── ahora (1) ──
    {
      id: 'pt-001',
      title: 'Grabar pitch webinar',
      description: 'Grabar el pitch de 3 min para el webinar de lanzamiento',
      column: 'ahora',
      priority: 'alta',
      assignedTo: 'tm-jota',
      estimatedMinutes: 45,
      actualMinutes: 0,
      dueDate: '2026-07-24T18:00:00.000Z',
      subtasks: [
        { id: 'st-001a', title: 'Preparar guion', done: true },
        { id: 'st-001b', title: 'Ensayar grabación', done: false },
      ],
      goalId: 'goal-m2',
      postponeCount: 0,
      createdAt: '2026-07-20T09:00:00.000Z',
      updatedAt: '2026-07-23T08:30:00.000Z',
    },
    // ── esta_semana (4) ──
    {
      id: 'pt-002',
      title: 'Editar teaser webinar',
      description: 'Editar el teaser de 30s para promo en redes',
      column: 'esta_semana',
      priority: 'alta',
      assignedTo: 'tm-delfino',
      estimatedMinutes: 60,
      actualMinutes: 0,
      dueDate: '2026-07-26T20:00:00.000Z',
      subtasks: [
        { id: 'st-002a', title: 'Cortar clips clave', done: false },
        { id: 'st-002b', title: 'Añadir subtítulos', done: false },
      ],
      goalId: 'goal-m2',
      postponeCount: 0,
      createdAt: '2026-07-21T10:00:00.000Z',
      updatedAt: '2026-07-22T11:00:00.000Z',
    },
    {
      id: 'pt-003',
      title: 'Preparar slides webinar',
      description: 'Diseñar las slides de la presentación del webinar',
      column: 'esta_semana',
      priority: 'media',
      assignedTo: 'tm-tuani',
      estimatedMinutes: 90,
      actualMinutes: 0,
      dueDate: '2026-07-27T18:00:00.000Z',
      subtasks: [
        { id: 'st-003a', title: 'Estructura de la presentación', done: true },
        { id: 'st-003b', title: 'Diseñar visuales', done: false },
      ],
      goalId: 'goal-m3',
      postponeCount: 0,
      createdAt: '2026-07-21T12:00:00.000Z',
      updatedAt: '2026-07-22T15:00:00.000Z',
    },
    {
      id: 'pt-004',
      title: 'Definir paleta de colores',
      description: 'Investigar y proponer la nueva paleta cromática de la marca',
      column: 'esta_semana',
      priority: 'media',
      assignedTo: 'tm-tuani',
      estimatedMinutes: 120,
      actualMinutes: 0,
      dueDate: '2026-07-28T18:00:00.000Z',
      subtasks: [
        { id: 'st-004a', title: 'Mood board de referencias', done: false },
      ],
      goalId: null,
      postponeCount: 1,
      createdAt: '2026-07-18T10:00:00.000Z',
      updatedAt: '2026-07-20T14:00:00.000Z',
    },
    {
      id: 'pt-005',
      title: 'Auditoría competencia Q3',
      description: 'Analizar lo que está haciendo la competencia en Q3',
      column: 'esta_semana',
      priority: 'baja',
      assignedTo: 'tm-nahir',
      estimatedMinutes: 90,
      actualMinutes: 0,
      dueDate: null,
      subtasks: [
        { id: 'st-005a', title: 'Listar 5 competidores clave', done: true },
        { id: 'st-005b', title: 'Analizar su contenido', done: false },
      ],
      goalId: null,
      postponeCount: 0,
      createdAt: '2026-07-17T11:00:00.000Z',
      updatedAt: '2026-07-21T17:00:00.000Z',
    },
    // ── hecho (3) ──
    {
      id: 'pt-011',
      title: 'Subir teaser a Drive',
      description: 'Subir el teaser editado a la carpeta compartida de Drive',
      column: 'hecho',
      priority: 'alta',
      assignedTo: 'tm-delfino',
      estimatedMinutes: 15,
      actualMinutes: 20,
      dueDate: '2026-07-22T18:00:00.000Z',
      subtasks: [
        { id: 'st-011a', title: 'Subir archivo a Drive', done: true },
        { id: 'st-011b', title: 'Compartir link con el equipo', done: true },
      ],
      goalId: 'goal-m1',
      postponeCount: 0,
      createdAt: '2026-07-21T16:00:00.000Z',
      updatedAt: '2026-07-22T17:30:00.000Z',
    },
    {
      id: 'pt-012',
      title: 'Aprobar mockup home',
      description: 'Revisar y aprobar el mockup de la nueva home',
      column: 'hecho',
      priority: 'media',
      assignedTo: 'tm-jota',
      estimatedMinutes: 10,
      actualMinutes: 15,
      dueDate: null,
      subtasks: [
        { id: 'st-012a', title: 'Revisar mockup', done: true },
      ],
      goalId: 'goal-m1',
      postponeCount: 0,
      createdAt: '2026-07-19T17:00:00.000Z',
      updatedAt: '2026-07-20T18:15:00.000Z',
    },
    {
      id: 'pt-013',
      title: 'Email confirmación asistentes',
      description: 'Redactar email de confirmación para los inscritos al webinar',
      column: 'hecho',
      priority: 'media',
      assignedTo: 'tm-nahir',
      estimatedMinutes: 30,
      actualMinutes: 25,
      dueDate: null,
      subtasks: [],
      goalId: null,
      postponeCount: 0,
      createdAt: '2026-07-22T08:00:00.000Z',
      updatedAt: '2026-07-23T09:00:00.000Z',
    },
  ],
  focusSessions: [
    {
      id: 'fs-001',
      taskId: 'pt-011',
      startedAt: '2026-07-22T14:00:00.000Z',
      endedAt: '2026-07-22T14:25:00.000Z',
      plannedMinutes: 25,
      actualMinutes: 25,
      interruptions: 0,
      status: 'completada',
    },
    {
      id: 'fs-002',
      taskId: 'pt-003',
      startedAt: '2026-07-23T09:30:00.000Z',
      endedAt: '2026-07-23T10:15:00.000Z',
      plannedMinutes: 45,
      actualMinutes: 45,
      interruptions: 1,
      status: 'completada',
    },
    {
      id: 'fs-003',
      taskId: 'pt-004',
      startedAt: '2026-07-23T11:00:00.000Z',
      endedAt: null,
      plannedMinutes: 25,
      actualMinutes: 15,
      interruptions: 0,
      status: 'pausada',
    },
  ],
  settings: {
    pomodoroPresets: [15, 25, 45, 60],
    defaultPreset: 25,
    multiTaskAlertEnabled: true,
    postponeAlertThreshold: 2,
  },
}

// ─────────────────────────────────────────────
// loadState — read localStorage, merge with SEED
// ─────────────────────────────────────────────
export function loadState(): ProductivityState {
  if (typeof window === 'undefined') return SEED_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SEED_STATE
    const parsed = JSON.parse(raw) as Partial<ProductivityState>
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : SEED_STATE.tasks
    const goals = Array.isArray(parsed.goals) ? parsed.goals : SEED_STATE.goals
    const focusSessions = Array.isArray(parsed.focusSessions) ? parsed.focusSessions : SEED_STATE.focusSessions
    const settings =
      parsed.settings && typeof parsed.settings === 'object'
        ? { ...SEED_STATE.settings, ...parsed.settings }
        : SEED_STATE.settings
    // Recalc goal current on load
    return {
      tasks,
      goals: recalcAllGoals(goals, tasks),
      focusSessions,
      settings,
    }
  } catch {
    return SEED_STATE
  }
}

// ─────────────────────────────────────────────
// saveState — write localStorage
// ─────────────────────────────────────────────
export function saveState(state: ProductivityState): boolean {
  if (typeof window === 'undefined') return true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('localStorage lleno — no se pudo guardar.')
      return false
    }
    throw err
  }
}

// ─────────────────────────────────────────────
// React hook — useProductividad
// ─────────────────────────────────────────────
export function useProductividad() {
  const [state, setState] = useState<ProductivityState>(() => loadState())

  useEffect(() => {
    setState(loadState())
  }, [])

  const commit = useCallback((next: ProductivityState) => {
    saveState(next)
    setState(next)
  }, [])

  const refresh = useCallback(() => {
    setState(loadState())
  }, [])

  // ── moveTask ──
  const moveTask = useCallback((id: string, toColumn: ProductivityColumn) => {
    const current = loadState()
    const task = current.tasks.find(t => t.id === id)
    if (!task) return
    const fromColumn = task.column
    const now = new Date().toISOString()

    const postponeColumns: ProductivityColumn[] = ['esta_semana']
    const urgentColumns: ProductivityColumn[] = ['ahora']
    const shouldIncrementPostpone =
      urgentColumns.includes(fromColumn) && postponeColumns.includes(toColumn)

    const updatedTask: ProductivityTask = {
      ...task,
      column: toColumn,
      postponeCount: shouldIncrementPostpone ? task.postponeCount + 1 : task.postponeCount,
      actualMinutes:
        toColumn === 'hecho' && task.actualMinutes === 0 && task.estimatedMinutes
          ? task.estimatedMinutes
          : task.actualMinutes,
      updatedAt: now,
    }

    let next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t => (t.id === id ? updatedTask : t)),
    }
    // Recalc goals if task has a goalId
    if (task.goalId) {
      next = { ...next, goals: recalcAllGoals(next.goals, next.tasks) }
    }
    commit(next)
  }, [commit])

  // ── createTask ──
  const createTask = useCallback(
    (input: {
      title: string
      description?: string
      column?: ProductivityColumn
      priority?: ProductivityPriority
      assignedTo?: string | null
      estimatedMinutes?: number | null
      dueDate?: string | null
      goalId?: string | null
    }): ProductivityTask => {
      const current = loadState()
      const now = new Date().toISOString()
      const task: ProductivityTask = {
        id: rid('pt'),
        title: input.title,
        description: input.description ?? '',
        column: input.column ?? 'esta_semana',
        priority: input.priority ?? 'media',
        assignedTo: input.assignedTo ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        actualMinutes: 0,
        dueDate: input.dueDate ?? null,
        subtasks: [],
        goalId: input.goalId ?? null,
        postponeCount: 0,
        createdAt: now,
        updatedAt: now,
      }
      let next: ProductivityState = {
        ...current,
        tasks: [...current.tasks, task],
      }
      // If linked to a goal, add task to goal.taskIds and recalc
      if (task.goalId) {
        next = {
          ...next,
          goals: next.goals.map(g =>
            g.id === task.goalId
              ? recalcGoalCurrent({ ...g, taskIds: [...g.taskIds, task.id] }, next.tasks)
              : g,
          ),
        }
      }
      commit(next)
      return task
    },
    [commit],
  )

  // ── updateTask ──
  const updateTask = useCallback((id: string, patch: Partial<ProductivityTask>) => {
    const current = loadState()
    const now = new Date().toISOString()
    let next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: now } : t,
      ),
    }
    // If column or goalId changed, recalc goals
    if (patch.column !== undefined || patch.goalId !== undefined) {
      next = { ...next, goals: recalcAllGoals(next.goals, next.tasks) }
    }
    commit(next)
  }, [commit])

  // ── deleteTask ──
  const deleteTask = useCallback((id: string) => {
    const current = loadState()
    const task = current.tasks.find(t => t.id === id)
    let next: ProductivityState = {
      ...current,
      tasks: current.tasks.filter(t => t.id !== id),
    }
    // Remove task from any goal.taskIds and recalc
    if (task?.goalId) {
      next = {
        ...next,
        goals: next.goals.map(g =>
          g.id === task.goalId
            ? recalcGoalCurrent({ ...g, taskIds: g.taskIds.filter(tid => tid !== id) }, next.tasks)
            : g,
        ),
      }
    }
    commit(next)
  }, [commit])

  // ── addSubtask ──
  const addSubtask = useCallback((taskId: string, title: string) => {
    const current = loadState()
    const now = new Date().toISOString()
    const subtask: Subtask = { id: rid('st'), title, done: false }
    const next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, subtask], updatedAt: now }
          : t,
      ),
    }
    commit(next)
  }, [commit])

  // ── toggleSubtask ──
  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    const current = loadState()
    const now = new Date().toISOString()
    const next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map(st =>
                st.id === subtaskId ? { ...st, done: !st.done } : st,
              ),
              updatedAt: now,
            }
          : t,
      ),
    }
    commit(next)
  }, [commit])

  // ── createGoal ──
  const createGoal = useCallback(
    (input: { title: string; target: number; period: 'monthly' | 'weekly'; periodLabel: string; manualOffset?: number }): Goal => {
      const current = loadState()
      const now = new Date().toISOString()
      const goal: Goal = {
        id: rid('goal'),
        title: input.title,
        target: input.target,
        current: (input.manualOffset ?? 0),
        period: input.period,
        periodLabel: input.periodLabel,
        taskIds: [],
        manualOffset: input.manualOffset ?? 0,
        createdAt: now,
      }
      const next: ProductivityState = {
        ...current,
        goals: [...current.goals, goal],
      }
      commit(next)
      return goal
    },
    [commit],
  )

  // ── updateGoal ──
  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    const current = loadState()
    const next: ProductivityState = {
      ...current,
      goals: current.goals.map(g => {
        if (g.id !== id) return g
        const updated = { ...g, ...patch }
        return recalcGoalCurrent(updated, current.tasks)
      }),
    }
    commit(next)
  }, [commit])

  // ── deleteGoal ──
  const deleteGoal = useCallback((id: string) => {
    const current = loadState()
    const next: ProductivityState = {
      ...current,
      goals: current.goals.filter(g => g.id !== id),
      // Unlink tasks from this goal
      tasks: current.tasks.map(t =>
        t.goalId === id ? { ...t, goalId: null } : t,
      ),
    }
    commit(next)
  }, [commit])

  // ── linkTaskToGoal ──
  const linkTaskToGoal = useCallback((taskId: string, goalId: string | null) => {
    const current = loadState()
    const task = current.tasks.find(t => t.id === taskId)
    if (!task) return

    // Remove from old goal
    let goals = current.goals
    if (task.goalId) {
      goals = goals.map(g =>
        g.id === task.goalId
          ? { ...g, taskIds: g.taskIds.filter(tid => tid !== taskId) }
          : g,
      )
    }
    // Add to new goal
    if (goalId) {
      goals = goals.map(g =>
        g.id === goalId
          ? { ...g, taskIds: g.taskIds.includes(taskId) ? g.taskIds : [...g.taskIds, taskId] }
          : g,
      )
    }

    const next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t =>
        t.id === taskId ? { ...t, goalId } : t,
      ),
      goals: recalcAllGoals(goals, current.tasks.map(t => t.id === taskId ? { ...t, goalId } : t)),
    }
    commit(next)
  }, [commit])

  // ── addFocusSession ──
  const addFocusSession = useCallback((session: FocusSession) => {
    const current = loadState()
    const next: ProductivityState = {
      ...current,
      focusSessions: [...current.focusSessions, session],
    }
    commit(next)
  }, [commit])

  // ── updateSettings ──
  const updateSettings = useCallback((patch: Partial<ProductivitySettings>) => {
    const current = loadState()
    const next: ProductivityState = {
      ...current,
      settings: { ...current.settings, ...patch },
    }
    commit(next)
  }, [commit])

  return {
    state,
    refresh,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    addSubtask,
    toggleSubtask,
    createGoal,
    updateGoal,
    deleteGoal,
    linkTaskToGoal,
    addFocusSession,
    updateSettings,
  }
}