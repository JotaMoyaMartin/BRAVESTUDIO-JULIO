'use client'
import { useEffect, useState, useCallback } from 'react'
import { PLANNINGS, CLIENTS, TEAM } from './mock-data'
import type { WeeklyPlanning, Notification } from './types'

const STORAGE_KEY = 'brave_content_planning_overrides'
const NOTIF_KEY = 'brave_content_notifications'

function loadOverrides(): Record<string, WeeklyPlanning> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, any>
    // Defensive migration: drop any override that lacks the current schema
    // (e.g. leftovers from before the `publications` field existed).
    // This prevents stale data from hiding the mock seed for clients like Mayte.
    const cleaned: Record<string, WeeklyPlanning> = {}
    let dirty = false
    for (const [id, p] of Object.entries(parsed)) {
      if (
        !p ||
        typeof p !== 'object' ||
        !Array.isArray(p.publications) ||
        typeof p.clientId !== 'string' ||
        typeof p.week !== 'number'
      ) {
        dirty = true
        continue
      }
      cleaned[id] = p as WeeklyPlanning
    }
    if (dirty) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned)) } catch { /* ignore */ }
    }
    return cleaned
  } catch {
    return {}
  }
}

function saveOverrides(map: Record<string, WeeklyPlanning>): boolean {
  if (typeof window === 'undefined') return true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('localStorage lleno — las imágenes base64 pesan demasiado. Considera usar URLs en lugar de subir archivos.')
      return false
    }
    throw err
  }
}

export function getPlanning(id: string): WeeklyPlanning | null {
  const overrides = loadOverrides()
  if (overrides[id]) return overrides[id]
  return PLANNINGS.find(p => p.id === id) || null
}

export function getAllPlannings(): WeeklyPlanning[] {
  const overrides = loadOverrides()
  const merged: WeeklyPlanning[] = [...PLANNINGS]
  Object.values(overrides).forEach(o => {
    const idx = merged.findIndex(p => p.id === o.id)
    if (idx >= 0) merged[idx] = o
    else merged.push(o)
  })
  return merged
}

export function savePlanning(p: WeeklyPlanning): boolean {
  const overrides = loadOverrides()
  overrides[p.id] = { ...p, updatedAt: new Date().toISOString() }
  return saveOverrides(overrides)
}

export function generateShareLink(planningId: string): string {
  const p = getPlanning(planningId)
  if (!p) return ''
  const token = btoa(planningId)
  p.shareToken = token
  savePlanning(p)
  return `${window.location.origin}/team/preview/${token}`
}

export function getByToken(token: string): WeeklyPlanning | null {
  try {
    // Next.js passes the route param URL-encoded (e.g. `==` becomes `%3D%3D`).
    // Decode before base64-parsing, otherwise `atob` chokes on the `%` chars.
    const id = atob(decodeURIComponent(token))
    return getPlanning(id)
  } catch {
    return null
  }
}

// Reactive hook
export function usePlanning(id: string | null) {
  const [planning, setPlanning] = useState<WeeklyPlanning | null>(() =>
    id ? getPlanning(id) : null
  )
  const [saved, setSaved] = useState<boolean | null>(null)

  useEffect(() => {
    if (id) setPlanning(getPlanning(id))
    else setPlanning(null)
  }, [id])

  const update = useCallback((p: WeeklyPlanning) => {
    setPlanning(p)
    const ok = savePlanning(p)
    setSaved(ok)
  }, [])

  return { planning, update, saved }
}

// ── Notifications ──
function loadNotifications(): Notification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    return raw ? JSON.parse(raw) as Notification[] : []
  } catch { return [] }
}

function saveNotifications(list: Notification[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

export function getAllNotifications(): Notification[] {
  return loadNotifications()
}

export function createNotification(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
  const list = loadNotifications()
  const notif: Notification = {
    ...n,
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    read: false,
  }
  list.unshift(notif)
  saveNotifications(list)
}

export function markNotificationRead(id: string): void {
  const list = loadNotifications()
  const n = list.find(x => x.id === id)
  if (n) { n.read = true; saveNotifications(list) }
}

export function markAllNotificationsRead(): void {
  const list = loadNotifications()
  list.forEach(n => { n.read = true })
  saveNotifications(list)
}

// Notify CMs of a client that a publication is ready
export function notifyPublicationReady(planning: WeeklyPlanning, pubTitle: string): void {
  const client = CLIENTS.find(c => c.id === planning.clientId)
  if (!client) return
  const cm = TEAM.find(t => t.id === client.cmId)
  if (!cm) return
  createNotification({
    type: 'upload',
    message: `Listo: "${pubTitle}" de ${client.name} (sem ${planning.week}) está listo para revisar`,
    clientId: client.id,
  })
}

// Notify when a planification is sent to client
export function notifyPlanningSent(planning: WeeklyPlanning): void {
  const client = CLIENTS.find(c => c.id === planning.clientId)
  if (!client) return
  createNotification({
    type: 'review',
    message: `Planificación de ${client.name} (sem ${planning.week}) enviada al cliente`,
    clientId: client.id,
  })
}