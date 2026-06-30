import { ContentItem } from '@/types/database'

// Unified plan store for demo mode. All saved/planned content lives here
// and is read by the "Ver planificación" tab.
const KEY_PLAN = 'brave_demo_plan'

export type PlanStored = Omit<ContentItem, 'content_json'> & {
  user_id: 'demo'
  content_json: unknown
  order_index: number
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function read(): PlanStored[] {
  if (typeof window === 'undefined') return []
  try {
    const items: PlanStored[] = JSON.parse(localStorage.getItem(KEY_PLAN) || '[]')
    return items.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  } catch {
    return []
  }
}

function write(items: PlanStored[]) {
  localStorage.setItem(KEY_PLAN, JSON.stringify(items))
}

export function demoGetPlan(): PlanStored[] {
  return read()
}

export function demoSavePlan(item: Record<string, unknown>): PlanStored {
  const existing = read()
  const maxOrder = existing.reduce((m, i) => Math.max(m, i.order_index ?? 0), 0)
  const full = {
    ...item,
    id: makeId(),
    user_id: 'demo',
    status: (item.status as string) || 'library',
    order_index: maxOrder + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as PlanStored
  write([...existing, full])
  return full
}

export function demoSaveMany(items: Record<string, unknown>[]): PlanStored[] {
  const existing = read()
  let order = existing.reduce((m, i) => Math.max(m, i.order_index ?? 0), 0)
  const now = new Date().toISOString()
  const saved = items.map(item => {
    order += 1
    return {
      ...item,
      id: makeId(),
      user_id: 'demo',
      status: (item.status as string) || 'draft',
      order_index: order,
      created_at: now,
      updated_at: now,
    } as PlanStored
  })
  write([...existing, ...saved])
  return saved
}

export function demoUpdatePlan(id: string, patch: Record<string, unknown>) {
  write(read().map(i => (i.id === id ? { ...i, ...patch, updated_at: new Date().toISOString() } : i)))
}

export function demoDeletePlan(id: string) {
  write(read().filter(i => i.id !== id))
}

// --- Brand profile (demo) ---
const KEY_BRAND = 'brave_demo_brand'

export function demoGetBrand(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(KEY_BRAND) || 'null') } catch { return null }
}

export function demoSaveBrand(brand: Record<string, unknown>) {
  localStorage.setItem(KEY_BRAND, JSON.stringify(brand))
}

// Persist a full reordering (array order becomes the new order_index).
export function demoReorderPlan(orderedIds: string[]) {
  const items = read()
  const byId = new Map(items.map(i => [i.id, i]))
  const reordered = orderedIds
    .map((id, idx) => {
      const it = byId.get(id)
      return it ? { ...it, order_index: idx } : null
    })
    .filter((i): i is PlanStored => i !== null)
  write(reordered)
}
