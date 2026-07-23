'use client'
import type { Task, TaskStatus, TaskPriority, TaskType } from './types'

const TASKS_KEY = 'brave_content_tasks'

function load(): Task[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    return raw ? (JSON.parse(raw) as Task[]) : []
  } catch {
    return []
  }
}

function save(list: Task[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

export function getAllTasks(): Task[] {
  return load().sort((a, b) => {
    // Sort by status first (pending → in_progress → done → discarded)
    const order: Record<TaskStatus, number> = { pendiente: 0, en_proceso: 1, hecha: 2, descartada: 3 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    const prio: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 }
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority]
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function getTasksByAssignee(memberId: string): Task[] {
  return getAllTasks().filter(t => t.assignedTo === memberId)
}

export function getTasksByClient(clientId: string): Task[] {
  return getAllTasks().filter(t => t.clientId === clientId)
}

export interface NewTaskInput {
  clientId: string
  title: string
  description?: string
  type?: TaskType
  priority?: TaskPriority
  assignedTo?: string | null
  requestedByRole?: Task['requestedByRole']
  requestedById?: string | null
  planningId?: string | null
  publicationId?: string | null
  attachments?: string[]
  referenceLinks?: string[]
  dueDate?: string | null
}

export function createTask(input: NewTaskInput): Task {
  const now = new Date().toISOString()
  const task: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clientId: input.clientId,
    planningId: input.planningId ?? null,
    publicationId: input.publicationId ?? null,
    title: input.title,
    description: input.description ?? '',
    type: input.type ?? 'other',
    status: 'pendiente',
    priority: input.priority ?? 'media',
    assignedTo: input.assignedTo ?? null,
    requestedByRole: input.requestedByRole ?? 'cm',
    requestedById: input.requestedById ?? null,
    attachments: input.attachments ?? [],
    referenceLinks: input.referenceLinks ?? [],
    createdAt: now,
    updatedAt: now,
    dueDate: input.dueDate ?? null,
  }
  const list = load()
  list.unshift(task)
  save(list)
  return task
}

export function updateTask(id: string, patch: Partial<Task>): Task | null {
  const list = load()
  const t = list.find(x => x.id === id)
  if (!t) return null
  Object.assign(t, patch, { updatedAt: new Date().toISOString() })
  save(list)
  return t
}

export function deleteTask(id: string): void {
  const list = load().filter(t => t.id !== id)
  save(list)
}

export function setTaskStatus(id: string, status: TaskStatus): void {
  updateTask(id, { status })
}

export function setTaskPriority(id: string, priority: TaskPriority): void {
  updateTask(id, { priority })
}