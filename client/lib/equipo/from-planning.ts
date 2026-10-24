/**
 * «Lo que publicamos» lee la PLANIFICACIÓN REAL del equipo (panel /team),
 * no un calendario aparte. Traduce las planificaciones semanales que el
 * equipo ya ha enviado a la clienta a publicaciones con fecha y estado.
 */
import type { Publicacion, PubEstado } from './types'

export interface TeamPlanningLite {
  id: string
  clientId: string
  week: number
  month: string
  status: string
  shareToken?: string | null
  weekStartDate?: string | null
  publications?: Array<{
    id: string; type: 'reel' | 'carrusel'; title: string; copy?: string; day?: string | null; time?: string
    markedReadyAt?: string | null; scheduledDate?: string | null; blockedNoMaterial?: boolean; blockedReason?: string | null
  }>
}

const DAY_OFFSET: Record<string, number> = { Lunes: 0, Martes: 1, Miércoles: 2, Jueves: 3, Viernes: 4, Sábado: 5, Domingo: 6 }

/** Solo lo que el equipo ya le ha enseñado (no borradores internos). */
export const VISIBLE_TO_CLIENT = ['enviada', 'aprobada', 'cambios']

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function planningToPubs(p: TeamPlanningLite, today = new Date()): Publicacion[] {
  if (!VISIBLE_TO_CLIENT.includes(p.status)) return []
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return (p.publications ?? []).flatMap(pub => {
    const fecha = pub.scheduledDate?.slice(0, 10)
      ?? (p.weekStartDate && pub.day && pub.day in DAY_OFFSET ? addDays(p.weekStartDate, DAY_OFFSET[pub.day]) : null)
    if (!fecha) return []
    const estado: PubEstado = pub.scheduledDate && fecha < todayIso ? 'publicado' : pub.markedReadyAt || pub.scheduledDate ? 'listo' : 'preparando'
    const nota = pub.blockedNoMaterial ? `Tu equipo necesita tu material${pub.blockedReason ? `: ${pub.blockedReason}` : ''}` : null
    return [{ id: pub.id, user_id: '', fecha, tipo: pub.type, titulo: pub.title, nota, estado }]
  })
}

/** Planificaciones enviadas que esperan su aprobación (para el botón «Revisar y aprobar»). */
export function pendingApprovals(list: TeamPlanningLite[]): Array<{ token: string; week: number; month: string }> {
  return list.filter(p => p.status === 'enviada' && p.shareToken).map(p => ({ token: p.shareToken!, week: p.week, month: p.month }))
}
