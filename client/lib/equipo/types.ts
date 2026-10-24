/**
 * CLIENTES DEL SERVICIO (24-oct-2026): lo que el equipo BRÄVE publica para
 * cada clienta y lo que ella le envía (material e ideas).
 * La app es un complemento del servicio: no sustituye al equipo, lo acerca.
 */

export type PubTipo = 'reel' | 'carrusel' | 'post' | 'story'
export type PubEstado = 'preparando' | 'listo' | 'publicado'

export interface Publicacion {
  id: string
  user_id: string
  fecha: string
  tipo: PubTipo
  titulo: string
  nota: string | null
  estado: PubEstado
}

export type PeticionTipo = 'material' | 'idea'
export type PeticionEstado = 'nueva' | 'en-marcha' | 'hecha'

export interface Archivo { path: string; name: string; size: number; type: string }

export interface Peticion {
  id: string
  user_id: string
  tipo: PeticionTipo
  titulo: string | null
  mensaje: string | null
  archivos: Archivo[]
  origen: { seccion?: string; texto?: string } | null
  estado: PeticionEstado
  respuesta: string | null
  created_at: string
}

export const TIPO_LABEL: Record<PubTipo, string> = { reel: 'Reel', carrusel: 'Carrusel', post: 'Foto', story: 'Story' }
export const ESTADO_PUB: Record<PubEstado, { label: string; tone: string }> = {
  preparando: { label: 'Lo estamos preparando', tone: 'bg-mantequilla/70 text-burdeos' },
  listo: { label: 'Listo para publicar', tone: 'bg-rosa/70 text-burdeos' },
  publicado: { label: 'Publicado', tone: 'bg-[#EAF3EC] text-[#1F5C38]' },
}
export const ESTADO_PET: Record<PeticionEstado, string> = { nueva: 'Enviada', 'en-marcha': 'Tu equipo está en ello', hecha: 'Hecha' }

/** Máximo por archivo (límite del almacenamiento). */
export const MAX_FILE_MB = 50
export const MAX_FILES = 10
export const MATERIAL_BUCKET = 'equipo-material'

/** Ruta segura del archivo en el almacenamiento. */
export function materialPath(userId: string, batch: string, name: string): string {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-80) || 'archivo'
  return `u/${userId}/${batch}/${clean}`
}

/** Lunes (local) de la semana de una fecha AAAA-MM-DD. */
export function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - dow)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** Publicaciones agrupadas por semana, en orden. */
export function groupByWeek(pubs: Publicacion[]): Array<{ week: string; items: Publicacion[] }> {
  const map = new Map<string, Publicacion[]>()
  for (const p of [...pubs].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const w = weekStart(p.fecha)
    map.set(w, [...(map.get(w) ?? []), p])
  }
  return [...map].map(([week, items]) => ({ week, items }))
}

/** Primer y último día (AAAA-MM-DD) del mes de una fecha. */
export function monthBounds(d = new Date()): { from: string; to: string } {
  const f = new Date(d.getFullYear(), d.getMonth(), 1)
  const t = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  return { from: iso(f), to: iso(t) }
}
