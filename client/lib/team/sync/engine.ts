'use client'
/**
 * EQUIPO · SINCRONIZACIÓN (Fase 1) — motor en el navegador.
 * - Al entrar: baja todo de la base de datos y lo deja donde lo leen las pantallas.
 * - Al guardar algo (planificación, tarea, aviso, productividad): lo sube en ~1 s.
 * - Cada 45 s y al volver a la pestaña: trae lo que ha cambiado otra persona.
 * En modo demo (sin Supabase) no hace nada: todo sigue en el navegador.
 */
import { IS_DEMO } from '@/lib/demo'
import { CLIENTS, TEAM } from '../mock-data'
import { LS_KEYS, diff, emptyMap, localOnly, mergeRemote, readLocal, writeLocal, type Change, type RecordMap, type RemoteRecord } from './records'

const SNAPSHOT_KEY = 'brave_team_sync_snapshot'
const SINCE_KEY = 'brave_team_sync_since'

export type SyncStatus = 'off' | 'cargando' | 'al-dia' | 'guardando' | 'error' | 'sin-tablas'
interface State { status: SyncStatus; pendingLocal: Change[]; remoteChanged: boolean; lastError: string | null }

let state: State = { status: IS_DEMO ? 'off' : 'cargando', pendingLocal: [], remoteChanged: false, lastError: null }
let snapshot: RecordMap = emptyMap()
let since: string | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let started = false
let applying = false
const listeners = new Set<(s: State) => void>()

function set(patch: Partial<State>) { state = { ...state, ...patch }; listeners.forEach(l => l(state)) }
export function getSyncState() { return state }
export function subscribeSync(fn: (s: State) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* lleno */ } },
}
const local = () => readLocal(ls.get, CLIENTS, TEAM)

function hydrate(m: RecordMap) {
  applying = true
  try {
    writeLocal(ls.set, m, ls.get(LS_KEYS.prod) !== null)
    const clients = Object.values(m.client)
    if (clients.length) CLIENTS.splice(0, CLIENTS.length, ...(clients as typeof CLIENTS))
    const team = Object.values(m.member)
    if (team.length) TEAM.splice(0, TEAM.length, ...(team as typeof TEAM))
  } finally { applying = false }
}

function saveSnapshot(m: RecordMap) {
  snapshot = m
  ls.set(SNAPSHOT_KEY, JSON.stringify(m))
  if (since) ls.set(SINCE_KEY, since)
}

async function fetchRemote(sinceIso: string | null): Promise<{ records: RemoteRecord[]; now?: string; missingTable?: boolean }> {
  const res = await fetch(`/team/api/sync${sinceIso ? `?since=${encodeURIComponent(sinceIso)}` : ''}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`sync ${res.status}`)
  return res.json()
}

async function push(changes: Change[]): Promise<boolean> {
  const res = await fetch('/team/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes }) })
  const j = await res.json().catch(() => ({}))
  if (j.missingTable) { set({ status: 'sin-tablas' }); return false }
  if (!res.ok) throw new Error(j.error || `push ${res.status}`)
  // Imágenes que pasaron a enlace: actualizar la copia local.
  if (Array.isArray(j.replaced) && j.replaced.length) {
    const cur = local()
    for (const r of j.replaced as Array<{ kind: keyof RecordMap; id: string; data: unknown }>) if (cur[r.kind]) cur[r.kind][r.id] = r.data
    hydrate(cur)
  }
  return true
}

/** Arranca la sincronización (una vez, tras iniciar sesión). */
export async function startSync(): Promise<void> {
  if (IS_DEMO || started) return
  started = true
  set({ status: 'cargando' })
  try {
    const stored = ls.get(SNAPSHOT_KEY)
    const prevSnapshot: RecordMap = stored ? { ...emptyMap(), ...JSON.parse(stored) } : local()
    const { records, now, missingTable } = await fetchRemote(null)
    if (missingTable) { set({ status: 'sin-tablas' }); return }
    const cur = local()
    const merged = mergeRemote(cur, prevSnapshot, records)
    hydrate(merged)
    since = now ?? new Date().toISOString()
    // Lo que se tocó en local sin subir (con sesión previa) se sube ya.
    const onServer = new Set(records.map(r => `${r.kind}:${r.id}`))
    const dirty = diff(prevSnapshot, cur).filter(c => c.kind !== 'client' && c.kind !== 'member' && onServer.has(`${c.kind}:${c.id}`))
    saveSnapshot(merged)
    // Primera vez: la lista de clientas y el equipo del panel se guardan como punto de partida.
    if (!records.some(r => r.kind === 'client')) {
      const seed: Change[] = [
        ...Object.entries(merged.client).map(([id, data]) => ({ kind: 'client' as const, id, data })),
        ...Object.entries(merged.member).map(([id, data]) => ({ kind: 'member' as const, id, data })),
      ]
      if (seed.length) await push(seed).catch(() => false)
    }
    if (dirty.length) await push(dirty).catch(() => false)
    set({ status: 'al-dia', pendingLocal: localOnly(merged, records) })
    pollTimer = setInterval(() => { void pull() }, 45_000)
    window.addEventListener('focus', () => { void pull() })
  } catch (e) {
    set({ status: 'error', lastError: e instanceof Error ? e.message : 'error' })
  }
}

/** Trae lo que ha cambiado otra persona. */
export async function pull(): Promise<void> {
  if (IS_DEMO || state.status === 'sin-tablas' || state.status === 'cargando') return
  try {
    const { records, now } = await fetchRemote(since)
    if (now) since = now
    if (!records.length) { ls.set(SINCE_KEY, since ?? ''); return }
    const cur = local()
    const merged = mergeRemote(cur, snapshot, records)
    if (JSON.stringify(merged) === JSON.stringify(cur)) return
    hydrate(merged)
    // Lo que vino del servidor ya está sincronizado; lo local tocado sigue pendiente.
    const nextSnap = { ...snapshot } as RecordMap
    for (const r of records) {
      if (!nextSnap[r.kind]) continue
      nextSnap[r.kind] = { ...nextSnap[r.kind] }
      if (r.deleted) delete nextSnap[r.kind][r.id]; else nextSnap[r.kind][r.id] = r.data
    }
    saveSnapshot(nextSnap)
    set({ remoteChanged: true })
  } catch { /* se reintenta en el siguiente ciclo */ }
}

/** Lo llaman los almacenes del panel cada vez que guardan algo. */
export function notifyLocalChange(): void {
  if (IS_DEMO || applying || state.status === 'sin-tablas') return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    const cur = local()
    const changes = diff(snapshot, cur).filter(c => c.kind !== 'client' && c.kind !== 'member')
    if (!changes.length) return
    set({ status: 'guardando' })
    try {
      if (await push(changes)) {
        const next = { ...snapshot } as RecordMap
        for (const c of changes) { next[c.kind] = { ...next[c.kind] }; if (c.deleted) delete next[c.kind][c.id]; else next[c.kind][c.id] = local()[c.kind][c.id] }
        saveSnapshot(next)
        set({ status: 'al-dia', lastError: null })
      }
    } catch (e) {
      set({ status: 'error', lastError: e instanceof Error ? e.message : 'error' })
      // Reintento en 20 s.
      setTimeout(() => notifyLocalChange(), 20_000)
    }
  }, 900)
}

/** Sube lo que solo estaba en este navegador (botón del aviso). */
export async function uploadLocalOnly(): Promise<number> {
  const items = state.pendingLocal
  if (!items.length) return 0
  set({ status: 'guardando' })
  for (let i = 0; i < items.length; i += 100) await push(items.slice(i, i + 100))
  const next = { ...snapshot } as RecordMap
  for (const c of items) { next[c.kind] = { ...next[c.kind], [c.id]: c.data } }
  saveSnapshot(next)
  set({ status: 'al-dia', pendingLocal: [] })
  return items.length
}

export function acknowledgeRemote() { set({ remoteChanged: false }) }

export function stopSync() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  started = false
}
