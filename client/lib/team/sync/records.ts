/**
 * EQUIPO · SINCRONIZACIÓN (Fase 1, 24-oct-2026) — lógica pura.
 *
 * Antes, el panel del equipo guardaba planificaciones, tareas, avisos y
 * productividad SOLO en el navegador de cada persona (localStorage). Ahora
 * cada elemento se guarda también en la tabla team_records (uno por fila),
 * así todo el equipo ve lo mismo y no se pierde nada.
 *
 * Las pantallas siguen leyendo de localStorage (como siempre): esta capa
 * traduce entre ese formato y «registros» {kind, id, data}.
 */

export const LS_KEYS = {
  planning: 'brave_content_planning_overrides',
  task: 'brave_content_tasks',
  notification: 'brave_content_notifications',
  prod: 'brave_content_productividad_v2',
} as const

export const KINDS = ['planning', 'task', 'notification', 'prod-task', 'prod-goal', 'prod-focus', 'prod-settings', 'client', 'member'] as const
export type Kind = (typeof KINDS)[number]

export type RecordMap = Record<Kind, Record<string, unknown>>
export interface RemoteRecord { kind: Kind; id: string; data: unknown; deleted: boolean; updated_at?: string }
export interface Change { kind: Kind; id: string; data?: unknown; deleted?: boolean }

export const emptyMap = (): RecordMap => Object.fromEntries(KINDS.map(k => [k, {}])) as unknown as RecordMap

type Getter = (key: string) => string | null
type Setter = (key: string, value: string) => void

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}
const byId = (list: unknown): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  if (Array.isArray(list)) for (const it of list) { const id = (it as { id?: unknown })?.id; if (typeof id === 'string') out[id] = it }
  return out
}

/** Lo que hay en este navegador (más clientas y equipo en memoria) → registros. */
export function readLocal(get: Getter, clients: unknown[], team: unknown[]): RecordMap {
  const m = emptyMap()
  const plannings = parse<Record<string, unknown>>(get(LS_KEYS.planning), {})
  if (plannings && typeof plannings === 'object') for (const [id, p] of Object.entries(plannings)) if (p && typeof p === 'object') m.planning[id] = p
  m.task = byId(parse(get(LS_KEYS.task), []))
  m.notification = byId(parse(get(LS_KEYS.notification), []))
  const prod = parse<{ tasks?: unknown; goals?: unknown; focusSessions?: unknown; settings?: unknown } | null>(get(LS_KEYS.prod), null)
  if (prod) {
    m['prod-task'] = byId(prod.tasks)
    m['prod-goal'] = byId(prod.goals)
    m['prod-focus'] = byId(prod.focusSessions)
    if (prod.settings && typeof prod.settings === 'object') m['prod-settings'] = { settings: prod.settings }
  }
  m.client = byId(clients)
  m.member = byId(team)
  return m
}

const byDateDesc = (a: unknown, b: unknown) =>
  String((b as { createdAt?: string })?.createdAt ?? '').localeCompare(String((a as { createdAt?: string })?.createdAt ?? ''))

/** Registros → formato que esperan las pantallas en localStorage. Clientas/equipo los aplica quien llama. */
export function writeLocal(set: Setter, m: RecordMap, hadProd: boolean) {
  set(LS_KEYS.planning, JSON.stringify(m.planning))
  set(LS_KEYS.task, JSON.stringify(Object.values(m.task)))
  set(LS_KEYS.notification, JSON.stringify(Object.values(m.notification).sort(byDateDesc)))
  const hasProd = hadProd || Object.keys(m['prod-task']).length + Object.keys(m['prod-goal']).length + Object.keys(m['prod-focus']).length > 0 || !!m['prod-settings'].settings
  if (hasProd) {
    set(LS_KEYS.prod, JSON.stringify({
      tasks: Object.values(m['prod-task']),
      goals: Object.values(m['prod-goal']),
      focusSessions: Object.values(m['prod-focus']),
      ...(m['prod-settings'].settings ? { settings: m['prod-settings'].settings } : {}),
    }))
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Qué ha cambiado en local desde la última vez que se sincronizó. */
export function diff(prev: RecordMap, cur: RecordMap): Change[] {
  const out: Change[] = []
  for (const k of KINDS) {
    for (const [id, data] of Object.entries(cur[k])) if (!same(prev[k][id], data)) out.push({ kind: k, id, data })
    for (const id of Object.keys(prev[k])) if (!(id in cur[k])) out.push({ kind: k, id, deleted: true })
  }
  return out
}

/**
 * Junta lo que llega del servidor con lo local. Si una cosa NO se ha tocado
 * en local desde la última sincronización, gana el servidor (lo que cambió
 * otra persona). Si se tocó en local, se queda la versión local (se subirá).
 */
export function mergeRemote(local: RecordMap, snapshot: RecordMap, remote: RemoteRecord[]): RecordMap {
  const out = emptyMap()
  for (const k of KINDS) out[k] = { ...local[k] }
  for (const r of remote) {
    if (!(KINDS as readonly string[]).includes(r.kind)) continue
    const dirty = !same(local[r.kind][r.id], snapshot[r.kind][r.id])
    if (dirty) continue
    if (r.deleted) delete out[r.kind][r.id]
    else out[r.kind][r.id] = r.data
  }
  return out
}

/** Elementos que solo existen en este navegador (para el botón «Subir lo de este navegador»). */
export function localOnly(local: RecordMap, remote: RemoteRecord[]): Change[] {
  const known = new Set(remote.map(r => `${r.kind}:${r.id}`))
  const out: Change[] = []
  for (const k of KINDS) {
    if (k === 'client' || k === 'member') continue
    for (const [id, data] of Object.entries(local[k])) if (!known.has(`${k}:${id}`)) out.push({ kind: k, id, data })
  }
  return out
}

/** Busca imágenes/vídeos incrustados (data:…) para subirlos al almacenamiento. */
export function findDataUrls(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') { if (/^data:(image|video)\/[a-z0-9.+-]+;base64,/i.test(value) && value.length > 200) found.add(value) }
  else if (Array.isArray(value)) value.forEach(v => findDataUrls(v, found))
  else if (value && typeof value === 'object') Object.values(value).forEach(v => findDataUrls(v, found))
  return found
}

/** Sustituye cadenas exactas en todo el objeto. */
export function replaceStrings<T>(value: T, map: Map<string, string>): T {
  if (typeof value === 'string') return (map.get(value) ?? value) as unknown as T
  if (Array.isArray(value)) return value.map(v => replaceStrings(v, map)) as unknown as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceStrings(v, map)])) as T
  return value
}
