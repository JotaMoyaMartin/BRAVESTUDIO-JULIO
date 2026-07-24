'use client'
import { useState, useEffect, useCallback } from 'react'
import type {
  ProductivityState,
  ProductivityTask,
  Project,
  InboxEntry,
  FocusSession,
  DailyStats,
  ProductivitySettings,
  ProductivityColumn,
  ProductivityPriority,
  Subtask,
  TaskComment,
  TaskHistoryEntry,
} from './types'

// ─────────────────────────────────────────────
// Storage key
// ─────────────────────────────────────────────
const STORAGE_KEY = 'brave_content_productividad_overrides'

// ─────────────────────────────────────────────
// ID helper
// ─────────────────────────────────────────────
function rid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─────────────────────────────────────────────
// SEED — realistic Spanish mock data
// ─────────────────────────────────────────────
export const SEED_STATE: ProductivityState = {
  projects: [
    {
      id: 'proj-webinar',
      name: 'Webinar Lanzamiento',
      description: 'Preparación del webinar de lanzamiento del nuevo servicio',
      color: '#7A1832',
      nextAction: 'Grabar pitch',
      status: 'activo',
      createdAt: '2026-07-01T09:00:00.000Z',
      updatedAt: '2026-07-20T14:30:00.000Z',
    },
    {
      id: 'proj-diseno',
      name: 'Rediseño Marca',
      description: 'Rediseño completo de la identidad visual de la marca',
      color: '#A04060',
      nextAction: 'Definir paleta',
      status: 'activo',
      createdAt: '2026-07-03T10:00:00.000Z',
      updatedAt: '2026-07-19T16:00:00.000Z',
    },
    {
      id: 'proj-estrategia',
      name: 'Estrategia Q3',
      description: 'Definición de la estrategia de contenido para Q3',
      color: '#591427',
      nextAction: null,
      status: 'pausado',
      createdAt: '2026-07-05T08:00:00.000Z',
      updatedAt: '2026-07-15T12:00:00.000Z',
    },
  ],
  tasks: [
    // ── ahora (1) ──
    {
      id: 'pt-001',
      projectId: 'proj-webinar',
      title: 'Grabar pitch webinar',
      description: 'Grabar el pitch de 3 min para el webinar de lanzamiento',
      column: 'ahora',
      priority: 'alta',
      assignedTo: 'tm-jota',
      estimatedMinutes: 45,
      actualMinutes: 0,
      dueDate: '2026-07-24T18:00:00.000Z',
      subtasks: [
        { id: 'st-001a', title: 'Preparar guion del pitch', done: true },
        { id: 'st-001b', title: 'Ensayar grabación', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-001', authorId: 'tm-jota', text: 'El guion ya está listo, hoy grabo.', createdAt: '2026-07-22T10:00:00.000Z' },
      ],
      history: [
        { id: 'h-001a', action: 'Tarea creada', at: '2026-07-20T09:00:00.000Z', by: 'tm-jota' },
        { id: 'h-001b', action: 'Movida a Ahora', at: '2026-07-23T08:30:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-20T09:00:00.000Z',
      updatedAt: '2026-07-23T08:30:00.000Z',
    },
    // ── hoy (3) ──
    {
      id: 'pt-002',
      projectId: 'proj-webinar',
      title: 'Editar teaser webinar',
      description: 'Editar el teaser de 30s para promo en redes',
      column: 'hoy',
      priority: 'alta',
      assignedTo: 'tm-delfino',
      estimatedMinutes: 60,
      actualMinutes: 0,
      dueDate: '2026-07-24T20:00:00.000Z',
      subtasks: [
        { id: 'st-002a', title: 'Cortar clips clave', done: false },
        { id: 'st-002b', title: 'Añadir subtítulos', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-002', authorId: 'tm-delfino', text: 'Necesito el material crudo primero.', createdAt: '2026-07-22T11:00:00.000Z' },
      ],
      history: [
        { id: 'h-002a', action: 'Tarea creada', at: '2026-07-21T10:00:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-21T10:00:00.000Z',
      updatedAt: '2026-07-22T11:00:00.000Z',
    },
    {
      id: 'pt-003',
      projectId: 'proj-webinar',
      title: 'Preparar slides webinar',
      description: 'Diseñar las slides de la presentación del webinar',
      column: 'hoy',
      priority: 'media',
      assignedTo: 'tm-tuani',
      estimatedMinutes: 90,
      actualMinutes: 0,
      dueDate: '2026-07-25T18:00:00.000Z',
      subtasks: [
        { id: 'st-003a', title: 'Estructura de la presentación', done: true },
        { id: 'st-003b', title: 'Diseñar visuales', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-003', authorId: 'tm-tuani', text: 'La estructura está lista, arranco con el diseño.', createdAt: '2026-07-22T15:00:00.000Z' },
      ],
      history: [
        { id: 'h-003a', action: 'Tarea creada', at: '2026-07-21T12:00:00.000Z', by: 'tm-jota' },
        { id: 'h-003b', action: 'Subtarea completada', at: '2026-07-22T15:00:00.000Z', by: 'tm-tuani' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-21T12:00:00.000Z',
      updatedAt: '2026-07-22T15:00:00.000Z',
    },
    {
      id: 'pt-004',
      projectId: 'proj-webinar',
      title: 'Email confirmación asistentes',
      description: 'Redactar email de confirmación para los inscritos al webinar',
      column: 'hoy',
      priority: 'media',
      assignedTo: 'tm-nahir',
      estimatedMinutes: 30,
      actualMinutes: 0,
      dueDate: null,
      subtasks: [
        { id: 'st-004a', title: 'Redactar copy del email', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-004', authorId: 'tm-nahir', text: 'Lo envío antes del mediodía.', createdAt: '2026-07-23T09:00:00.000Z' },
      ],
      history: [
        { id: 'h-004a', action: 'Tarea creada', at: '2026-07-22T08:00:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-22T08:00:00.000Z',
      updatedAt: '2026-07-23T09:00:00.000Z',
    },
    // ── esta_semana (4) ──
    {
      id: 'pt-005',
      projectId: 'proj-diseno',
      title: 'Definir paleta de colores',
      description: 'Investigar y proponer la nueva paleta cromática de la marca',
      column: 'esta_semana',
      priority: 'media',
      assignedTo: 'tm-tuani',
      estimatedMinutes: 120,
      actualMinutes: 0,
      dueDate: '2026-07-26T18:00:00.000Z',
      subtasks: [
        { id: 'st-005a', title: 'Mood board de referencias', done: false },
        { id: 'st-005b', title: 'Proponer 3 opciones de paleta', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-005', authorId: 'tm-tuani', text: 'Tengo varias referencias guardadas en Pinterest.', createdAt: '2026-07-20T14:00:00.000Z' },
      ],
      history: [
        { id: 'h-005a', action: 'Tarea creada', at: '2026-07-18T10:00:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 1,
      createdAt: '2026-07-18T10:00:00.000Z',
      updatedAt: '2026-07-20T14:00:00.000Z',
    },
    {
      id: 'pt-006',
      projectId: 'proj-diseno',
      title: 'Mockup nueva home',
      description: 'Crear mockup de la nueva página de inicio con la nueva identidad',
      column: 'esta_semana',
      priority: 'baja',
      assignedTo: 'tm-tuani',
      estimatedMinutes: 180,
      actualMinutes: 0,
      dueDate: '2026-07-28T18:00:00.000Z',
      subtasks: [
        { id: 'st-006a', title: 'Wireframe desktop', done: false },
        { id: 'st-006b', title: 'Wireframe mobile', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-006', authorId: 'tm-jota', text: 'Espero ver el avance el viernes.', createdAt: '2026-07-19T11:00:00.000Z' },
      ],
      history: [
        { id: 'h-006a', action: 'Tarea creada', at: '2026-07-19T09:00:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T11:00:00.000Z',
    },
    {
      id: 'pt-007',
      projectId: 'proj-diseno',
      title: 'Copy nueva home',
      description: 'Redactar el copy de la nueva página de inicio',
      column: 'esta_semana',
      priority: 'baja',
      assignedTo: 'tm-nahir',
      estimatedMinutes: 30,
      actualMinutes: 0,
      dueDate: null,
      subtasks: [
        { id: 'st-007a', title: 'Hero headline + subheadline', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-007', authorId: 'tm-nahir', text: 'Necesito que la paleta esté definida primero.', createdAt: '2026-07-20T16:00:00.000Z' },
      ],
      history: [
        { id: 'h-007a', action: 'Tarea creada', at: '2026-07-19T14:00:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-19T14:00:00.000Z',
      updatedAt: '2026-07-20T16:00:00.000Z',
    },
    {
      id: 'pt-008',
      projectId: 'proj-estrategia',
      title: 'Auditoría competencia Q3',
      description: 'Analizar lo que está haciendo la competencia en Q3',
      column: 'esta_semana',
      priority: 'media',
      assignedTo: 'tm-nahir',
      estimatedMinutes: 90,
      actualMinutes: 0,
      dueDate: '2026-07-27T18:00:00.000Z',
      subtasks: [
        { id: 'st-008a', title: 'Listar 5 competidores clave', done: true },
        { id: 'st-008b', title: 'Analizar su contenido', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-008', authorId: 'tm-nahir', text: 'Ya tengo la lista de competidores lista.', createdAt: '2026-07-21T17:00:00.000Z' },
      ],
      history: [
        { id: 'h-008a', action: 'Tarea creada', at: '2026-07-17T11:00:00.000Z', by: 'tm-jota' },
        { id: 'h-008b', action: 'Subtarea completada', at: '2026-07-21T17:00:00.000Z', by: 'tm-nahir' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-17T11:00:00.000Z',
      updatedAt: '2026-07-21T17:00:00.000Z',
    },
    // ── despues (2) ──
    {
      id: 'pt-009',
      projectId: 'proj-estrategia',
      title: 'Calendario editorial Q3',
      description: 'Crear el calendario editorial para todo Q3',
      column: 'despues',
      priority: 'baja',
      assignedTo: 'tm-nahir',
      estimatedMinutes: 120,
      actualMinutes: 0,
      dueDate: null,
      subtasks: [
        { id: 'st-009a', title: 'Definir pilares de contenido', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-009', authorId: 'tm-jota', text: 'Lo retomamos cuando termine la auditoría.', createdAt: '2026-07-16T10:00:00.000Z' },
      ],
      history: [
        { id: 'h-009a', action: 'Tarea creada', at: '2026-07-15T09:00:00.000Z', by: 'tm-jota' },
        { id: 'h-009b', action: 'Movida a Después (proyecto pausado)', at: '2026-07-18T12:00:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 1,
      createdAt: '2026-07-15T09:00:00.000Z',
      updatedAt: '2026-07-18T12:00:00.000Z',
    },
    {
      id: 'pt-010',
      projectId: 'proj-estrategia',
      title: 'Briefing equipo Q3',
      description: 'Preparar el briefing del equipo para los objetivos de Q3',
      column: 'despues',
      priority: 'baja',
      assignedTo: 'tm-jota',
      estimatedMinutes: 60,
      actualMinutes: 0,
      dueDate: null,
      subtasks: [
        { id: 'st-010a', title: 'Definir KPIs Q3', done: false },
        { id: 'st-010b', title: 'Preparar presentación', done: false },
      ],
      attachments: [],
      referenceLinks: [],
      comments: [],
      history: [
        { id: 'h-010a', action: 'Tarea creada', at: '2026-07-15T10:00:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-15T10:00:00.000Z',
    },
    // ── hecho (2) ──
    {
      id: 'pt-011',
      projectId: 'proj-webinar',
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
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-011', authorId: 'tm-delfino', text: 'Listo, link compartido en el grupo.', createdAt: '2026-07-22T17:00:00.000Z' },
      ],
      history: [
        { id: 'h-011a', action: 'Tarea creada', at: '2026-07-21T16:00:00.000Z', by: 'tm-delfino' },
        { id: 'h-011b', action: 'Tarea completada', at: '2026-07-22T17:30:00.000Z', by: 'tm-delfino' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-21T16:00:00.000Z',
      updatedAt: '2026-07-22T17:30:00.000Z',
    },
    {
      id: 'pt-012',
      projectId: 'proj-diseno',
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
      attachments: [],
      referenceLinks: [],
      comments: [
        { id: 'cm-012', authorId: 'tm-jota', text: 'Aprobado con cambios menores. Queda genial.', createdAt: '2026-07-20T18:00:00.000Z' },
      ],
      history: [
        { id: 'h-012a', action: 'Tarea creada', at: '2026-07-19T17:00:00.000Z', by: 'tm-jota' },
        { id: 'h-012b', action: 'Tarea completada', at: '2026-07-20T18:15:00.000Z', by: 'tm-jota' },
      ],
      postponeCount: 0,
      createdAt: '2026-07-19T17:00:00.000Z',
      updatedAt: '2026-07-20T18:15:00.000Z',
    },
  ],
  inbox: [
    {
      id: 'inb-001',
      rawText: 'Revisar reels de Cristina para ver qué formato usa',
      source: 'texto',
      createdAt: '2026-07-22T19:30:00.000Z',
      convertedToTaskId: null,
      suggestedProjectId: 'proj-estrategia',
      suggestedPriority: 'baja',
      suggestedDueDate: null,
    },
    {
      id: 'inb-002',
      rawText: 'Presentación equipo jueves — preparar puntos clave',
      source: 'texto',
      createdAt: '2026-07-23T08:15:00.000Z',
      convertedToTaskId: null,
      suggestedProjectId: 'proj-webinar',
      suggestedPriority: 'alta',
      suggestedDueDate: '2026-07-24T18:00:00.000Z',
    },
    {
      id: 'inb-003',
      rawText: 'Buscar referencias de diseños minimalistas para la nueva home',
      source: 'audio',
      createdAt: '2026-07-19T11:30:00.000Z',
      convertedToTaskId: 'pt-006',
      suggestedProjectId: 'proj-diseno',
      suggestedPriority: 'media',
      suggestedDueDate: '2026-07-22T18:00:00.000Z',
    },
  ],
  focusSessions: [
    {
      id: 'fs-001',
      taskId: 'pt-011',
      startedAt: '2026-07-18T10:00:00.000Z',
      endedAt: '2026-07-18T10:50:00.000Z',
      plannedMinutes: 50,
      actualMinutes: 45,
      interruptions: 1,
      status: 'completada',
    },
    {
      id: 'fs-002',
      taskId: 'pt-005',
      startedAt: '2026-07-19T09:00:00.000Z',
      endedAt: '2026-07-19T09:25:00.000Z',
      plannedMinutes: 25,
      actualMinutes: 20,
      interruptions: 0,
      status: 'completada',
    },
    {
      id: 'fs-003',
      taskId: 'pt-008',
      startedAt: '2026-07-20T16:00:00.000Z',
      endedAt: '2026-07-20T16:55:00.000Z',
      plannedMinutes: 60,
      actualMinutes: 50,
      interruptions: 2,
      status: 'interrumpida',
    },
    {
      id: 'fs-004',
      taskId: 'pt-012',
      startedAt: '2026-07-21T15:00:00.000Z',
      endedAt: '2026-07-21T15:15:00.000Z',
      plannedMinutes: 15,
      actualMinutes: 15,
      interruptions: 0,
      status: 'completada',
    },
    {
      id: 'fs-005',
      taskId: 'pt-003',
      startedAt: '2026-07-22T14:00:00.000Z',
      endedAt: '2026-07-22T14:40:00.000Z',
      plannedMinutes: 45,
      actualMinutes: 40,
      interruptions: 0,
      status: 'completada',
    },
    {
      id: 'fs-006',
      taskId: 'pt-002',
      startedAt: '2026-07-23T09:30:00.000Z',
      endedAt: '2026-07-23T10:20:00.000Z',
      plannedMinutes: 50,
      actualMinutes: 45,
      interruptions: 1,
      status: 'completada',
    },
    {
      id: 'fs-007',
      taskId: 'pt-001',
      startedAt: '2026-07-23T11:00:00.000Z',
      endedAt: null,
      plannedMinutes: 45,
      actualMinutes: 30,
      interruptions: 0,
      status: 'pausada',
    },
  ],
  dailyStats: [
    { date: '2026-07-18', completedCount: 2, prioritiesMet: 1, focusMinutes: 45, interruptions: 1, postponedCount: 0 },
    { date: '2026-07-19', completedCount: 1, prioritiesMet: 1, focusMinutes: 20, interruptions: 0, postponedCount: 0 },
    { date: '2026-07-20', completedCount: 1, prioritiesMet: 0, focusMinutes: 50, interruptions: 2, postponedCount: 1 },
    { date: '2026-07-21', completedCount: 3, prioritiesMet: 2, focusMinutes: 15, interruptions: 0, postponedCount: 0 },
    { date: '2026-07-22', completedCount: 2, prioritiesMet: 1, focusMinutes: 40, interruptions: 0, postponedCount: 0 },
    { date: '2026-07-23', completedCount: 4, prioritiesMet: 2, focusMinutes: 75, interruptions: 1, postponedCount: 0 },
    { date: '2026-07-24', completedCount: 0, prioritiesMet: 0, focusMinutes: 0, interruptions: 0, postponedCount: 0 },
  ],
  settings: {
    pomodoroPresets: [15, 25, 45, 60],
    defaultPreset: 25,
    focusRemindersEnabled: true,
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
    // Defensive merge: for each top-level key, use parsed if valid, else SEED
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : SEED_STATE.tasks,
      projects: Array.isArray(parsed.projects) ? parsed.projects : SEED_STATE.projects,
      inbox: Array.isArray(parsed.inbox) ? parsed.inbox : SEED_STATE.inbox,
      focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions : SEED_STATE.focusSessions,
      dailyStats: Array.isArray(parsed.dailyStats) ? parsed.dailyStats : SEED_STATE.dailyStats,
      settings:
        parsed.settings && typeof parsed.settings === 'object'
          ? { ...SEED_STATE.settings, ...parsed.settings }
          : SEED_STATE.settings,
    }
  } catch {
    return SEED_STATE
  }
}

// ─────────────────────────────────────────────
// saveState — write localStorage, catch QuotaExceededError
// ─────────────────────────────────────────────
export function saveState(state: ProductivityState): boolean {
  if (typeof window === 'undefined') return true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('localStorage lleno — no se pudo guardar el estado de productividad. Considera liberar espacio.')
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
    // Sync from localStorage on mount (in case it changed in another tab)
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

    const postponeColumns: ProductivityColumn[] = ['esta_semana', 'despues']
    const urgentColumns: ProductivityColumn[] = ['ahora', 'hoy']
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
      history: [
        ...task.history,
        {
          id: rid('h'),
          action: `Movida de ${fromColumn} a ${toColumn}`,
          at: now,
          by: 'system',
        },
      ],
    }

    const next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t => (t.id === id ? updatedTask : t)),
    }
    commit(next)
  }, [commit])

  // ── createTask ──
  const createTask = useCallback(
    (input: {
      projectId: string
      title: string
      description?: string
      column?: ProductivityColumn
      priority?: ProductivityPriority
      assignedTo?: string | null
      estimatedMinutes?: number | null
      dueDate?: string | null
    }): ProductivityTask => {
      const current = loadState()
      const now = new Date().toISOString()
      const task: ProductivityTask = {
        id: rid('pt'),
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? '',
        column: input.column ?? 'hoy',
        priority: input.priority ?? 'media',
        assignedTo: input.assignedTo ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        actualMinutes: 0,
        dueDate: input.dueDate ?? null,
        subtasks: [],
        attachments: [],
        referenceLinks: [],
        comments: [],
        history: [
          { id: rid('h'), action: 'Tarea creada', at: now, by: 'system' },
        ],
        postponeCount: 0,
        createdAt: now,
        updatedAt: now,
      }
      const next: ProductivityState = {
        ...current,
        tasks: [...current.tasks, task],
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
    const next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: now } : t,
      ),
    }
    commit(next)
  }, [commit])

  // ── deleteTask ──
  const deleteTask = useCallback((id: string) => {
    const current = loadState()
    const next: ProductivityState = {
      ...current,
      tasks: current.tasks.filter(t => t.id !== id),
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

  // ── addComment ──
  const addComment = useCallback((taskId: string, authorId: string, text: string) => {
    const current = loadState()
    const now = new Date().toISOString()
    const comment: TaskComment = { id: rid('cm'), authorId, text, createdAt: now }
    const next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t =>
        t.id === taskId
          ? { ...t, comments: [...t.comments, comment], updatedAt: now }
          : t,
      ),
    }
    commit(next)
  }, [commit])

  // ── addHistory ──
  const addHistory = useCallback((taskId: string, action: string, by: string) => {
    const current = loadState()
    const now = new Date().toISOString()
    const entry: TaskHistoryEntry = { id: rid('h'), action, at: now, by }
    const next: ProductivityState = {
      ...current,
      tasks: current.tasks.map(t =>
        t.id === taskId ? { ...t, history: [...t.history, entry] } : t,
      ),
    }
    commit(next)
  }, [commit])

  // ── createProject ──
  const createProject = useCallback(
    (input: { name: string; description?: string; color: string; nextAction?: string | null }) => {
      const current = loadState()
      const now = new Date().toISOString()
      const project: Project = {
        id: rid('proj'),
        name: input.name,
        description: input.description ?? '',
        color: input.color,
        nextAction: input.nextAction ?? null,
        status: 'activo',
        createdAt: now,
        updatedAt: now,
      }
      const next: ProductivityState = {
        ...current,
        projects: [...current.projects, project],
      }
      commit(next)
      return project
    },
    [commit],
  )

  // ── updateProject ──
  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    const current = loadState()
    const now = new Date().toISOString()
    const next: ProductivityState = {
      ...current,
      projects: current.projects.map(p =>
        p.id === id ? { ...p, ...patch, updatedAt: now } : p,
      ),
    }
    commit(next)
  }, [commit])

  // ── addInboxEntry ──
  const addInboxEntry = useCallback(
    (rawText: string, source: 'texto' | 'audio'): InboxEntry => {
      const current = loadState()
      const now = new Date().toISOString()
      const entry: InboxEntry = {
        id: rid('inb'),
        rawText,
        source,
        createdAt: now,
        convertedToTaskId: null,
        suggestedProjectId: null,
        suggestedPriority: null,
        suggestedDueDate: null,
      }
      const next: ProductivityState = {
        ...current,
        inbox: [...current.inbox, entry],
      }
      commit(next)
      return entry
    },
    [commit],
  )

  // ── convertInboxToTask ──
  const convertInboxToTask = useCallback(
    (entryId: string, input: { projectId: string; title: string; description?: string; column?: ProductivityColumn; priority?: ProductivityPriority; assignedTo?: string | null; estimatedMinutes?: number | null; dueDate?: string | null }) => {
      const current = loadState()
      const entry = current.inbox.find(e => e.id === entryId)
      if (!entry) return

      // Create the task
      const task = createTask(input)
      // Mark the inbox entry as converted
      const now = new Date().toISOString()
      const next: ProductivityState = {
        ...loadState(),
        inbox: loadState().inbox.map(e =>
          e.id === entryId ? { ...e, convertedToTaskId: task.id } : e,
        ),
      }
      // Also update the entry's convertedToTaskId
      // We need to reload since createTask already committed
      const updatedInbox = next.inbox.map(e =>
        e.id === entryId ? { ...e, convertedToTaskId: task.id, suggestedProjectId: e.suggestedProjectId, suggestedPriority: e.suggestedPriority, suggestedDueDate: e.suggestedDueDate } : e,
      )
      const finalState: ProductivityState = {
        ...loadState(),
        inbox: updatedInbox,
      }
      commit(finalState)
    },
    [commit, createTask],
  )

  // ── addFocusSession ──
  const addFocusSession = useCallback((session: FocusSession) => {
    const current = loadState()
    const next: ProductivityState = {
      ...current,
      focusSessions: [...current.focusSessions, session],
    }

    // Update daily stats for the session's date
    const sessionDate = session.startedAt.slice(0, 10)
    const existing = next.dailyStats.find(d => d.date === sessionDate)
    if (existing) {
      next.dailyStats = next.dailyStats.map(d =>
        d.date === sessionDate
          ? {
              ...d,
              focusMinutes: d.focusMinutes + session.actualMinutes,
              interruptions: d.interruptions + session.interruptions,
            }
          : d,
      )
    } else {
      const newStats: DailyStats = {
        date: sessionDate,
        completedCount: 0,
        prioritiesMet: 0,
        focusMinutes: session.actualMinutes,
        interruptions: session.interruptions,
        postponedCount: 0,
      }
      next.dailyStats = [...next.dailyStats, newStats]
    }

    commit(next)
  }, [commit])

  // ── ensureDailyStats ──
  const ensureDailyStats = useCallback((date: string): DailyStats => {
    const current = loadState()
    const existing = current.dailyStats.find(d => d.date === date)
    if (existing) return existing
    const newStats: DailyStats = {
      date,
      completedCount: 0,
      prioritiesMet: 0,
      focusMinutes: 0,
      interruptions: 0,
      postponedCount: 0,
    }
    const next: ProductivityState = {
      ...current,
      dailyStats: [...current.dailyStats, newStats],
    }
    commit(next)
    return newStats
  }, [commit])

  // ── updateDailyStats ──
  const updateDailyStats = useCallback((date: string, patch: Partial<DailyStats>) => {
    const current = loadState()
    const existing = current.dailyStats.find(d => d.date === date)
    if (existing) {
      const next: ProductivityState = {
        ...current,
        dailyStats: current.dailyStats.map(d =>
          d.date === date ? { ...d, ...patch } : d,
        ),
      }
      commit(next)
    } else {
      const newStats: DailyStats = {
        date,
        completedCount: 0,
        prioritiesMet: 0,
        focusMinutes: 0,
        interruptions: 0,
        postponedCount: 0,
        ...patch,
      }
      const next: ProductivityState = {
        ...current,
        dailyStats: [...current.dailyStats, newStats],
      }
      commit(next)
    }
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
    addComment,
    addHistory,
    createProject,
    updateProject,
    addInboxEntry,
    convertInboxToTask,
    addFocusSession,
    updateDailyStats,
    ensureDailyStats,
    updateSettings,
  }
}