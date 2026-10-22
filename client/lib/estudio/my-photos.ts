/**
 * «Mis fotos»: el banco de imágenes de la estilista.
 *
 * Con sesión → se guardan EN SU CUENTA (/api/estudio/mis-fotos, carpeta privada)
 * y aparecen en cualquier móvil o PC, en el Estudio y en Catálogo → Mis fotos
 * de carruseles y stories.
 * Sin sesión (modo demo o sin conexión) → se guardan en este navegador
 * (IndexedDB). Al volver a tener cuenta, las del móvil se suben solas.
 */
import { IS_DEMO } from '@/lib/demo'

export interface MyPhoto {
  id: string
  createdAt: number
  aspect: string
  /** true = guardada en la cuenta (url firmada); false = solo en este móvil (blob). */
  nube: boolean
  url?: string
  blob?: Blob
}

const API = '/api/estudio/mis-fotos'
const DB = 'brave-estudio'
const STORE = 'mis-fotos'
const MAX_LOCAL = 40

/* ---------- Copia local (IndexedDB) ---------- */
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const r = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(r ? (r as IDBRequest<T>).result : undefined)
    t.onerror = () => reject(t.error)
  }))
}

async function listLocal(): Promise<MyPhoto[]> {
  try {
    const all = ((await tx<Array<Omit<MyPhoto, 'nube'>>>('readonly', s => s.getAll())) || [])
    return all.map(p => ({ ...p, nube: false })).sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

async function saveLocal(blob: Blob, aspect: string): Promise<MyPhoto> {
  const photo = { id: `f${Date.now().toString(36)}`, blob, createdAt: Date.now(), aspect }
  await tx('readwrite', s => s.put(photo))
  const all = await listLocal()
  for (const old of all.slice(MAX_LOCAL)) await tx('readwrite', s => s.delete(old.id))
  return { ...photo, nube: false }
}

/* ---------- Cuenta ---------- */
async function upload(blob: Blob, aspect: string): Promise<MyPhoto | null> {
  if (IS_DEMO) return null
  try {
    const form = new FormData()
    form.append('file', blob, `foto.${blob.type === 'image/png' ? 'png' : 'jpg'}`)
    form.append('aspect', aspect)
    const res = await fetch(API, { method: 'POST', body: form })
    if (!res.ok) return null
    const data = await res.json() as { photo?: { id: string; aspect: string; createdAt: number; url: string | null } }
    return data.photo?.url ? { ...data.photo, url: data.photo.url, nube: true } : null
  } catch {
    return null
  }
}

/** Sube a la cuenta las fotos que quedaron solo en este móvil (una vez). */
let subiendo = false
async function migrarLocales(locales: MyPhoto[]) {
  if (subiendo || !locales.length) return
  subiendo = true
  try {
    for (const p of [...locales].reverse()) {
      if (!p.blob) continue
      const ok = await upload(p.blob, p.aspect)
      if (!ok) return
      await tx('readwrite', s => s.delete(p.id))
    }
    window.dispatchEvent(new Event('mis-fotos'))
  } finally {
    subiendo = false
  }
}

export async function listMyPhotos(): Promise<MyPhoto[]> {
  const locales = await listLocal()
  if (IS_DEMO) return locales
  try {
    const res = await fetch(API, { cache: 'no-store' })
    if (!res.ok) return locales
    const data = await res.json() as { photos?: Array<{ id: string; aspect: string; createdAt: number; url: string }> }
    const nube = (data.photos || []).map(p => ({ ...p, nube: true }))
    void migrarLocales(locales)
    return [...locales, ...nube].sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return locales
  }
}

/** Guarda en la cuenta; si no hay sesión o falla, en este móvil. */
export async function saveMyPhoto(blob: Blob, aspect: string): Promise<MyPhoto> {
  const photo = (await upload(blob, aspect)) || (await saveLocal(blob, aspect))
  window.dispatchEvent(new Event('mis-fotos'))
  return photo
}

export async function deleteMyPhoto(photo: Pick<MyPhoto, 'id' | 'nube'>): Promise<void> {
  if (photo.nube) {
    const res = await fetch(`${API}?id=${encodeURIComponent(photo.id)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('No se pudo borrar la foto')
  } else {
    await tx('readwrite', s => s.delete(photo.id))
  }
  window.dispatchEvent(new Event('mis-fotos'))
}

/** URL para abrir la foto en un editor (las locales necesitan su propia URL). */
export function photoSrc(p: MyPhoto): string {
  return p.nube ? p.url! : URL.createObjectURL(p.blob!)
}
