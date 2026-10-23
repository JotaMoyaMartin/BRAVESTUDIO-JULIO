/**
 * VIGILANCIA DE LA IA · lógica pura (23-oct-2026).
 * Traduce cada error del proveedor a un motivo en español sencillo y
 * calcula el estado (verde / ámbar / rojo) a partir del registro.
 * Sin dependencias de servidor: se puede probar con tests.
 */

export type AIReason =
  | 'sin-configurar' | 'clave' | 'limite' | 'proveedor-caido' | 'lento' | 'vacia' | 'modelo' | 'peticion' | 'red' | 'otro'

export const REASON_TEXT: Record<AIReason, { titulo: string; que_hacer: string }> = {
  'sin-configurar': { titulo: 'Falta la clave de la IA', que_hacer: 'En Vercel → Settings → Environment Variables revisa AI_PROVIDER y AI_API_KEY, y vuelve a publicar.' },
  clave: { titulo: 'La clave de la IA no vale', que_hacer: 'La clave ha caducado o es incorrecta. Crea una nueva en Ollama, cámbiala en Vercel (AI_API_KEY) y vuelve a publicar.' },
  limite: { titulo: 'Límite de uso alcanzado', que_hacer: 'El proveedor frena por demasiadas peticiones o se acabó la cuota. Revisa el plan y el saldo en Ollama.' },
  'proveedor-caido': { titulo: 'El proveedor de IA está caído', que_hacer: 'Es un fallo de Ollama, no de la app. Suele arreglarse solo: espera y pulsa «Probar ahora» en un rato.' },
  lento: { titulo: 'La IA tarda demasiado', que_hacer: 'Responde en más de 60 segundos. Si dura, prueba otro modelo más rápido (AI_MODEL en Vercel).' },
  vacia: { titulo: 'La IA responde en blanco', que_hacer: 'El modelo devolvió una respuesta vacía. Si se repite, cambia de modelo (AI_MODEL).' },
  modelo: { titulo: 'El modelo configurado no existe', que_hacer: 'Revisa el nombre del modelo en Vercel (AI_MODEL o AI_VISION_MODEL).' },
  peticion: { titulo: 'Error en la petición', que_hacer: 'El proveedor rechazó la petición: hay que revisar el código. Pásale el detalle a Claude.' },
  red: { titulo: 'Sin conexión con la IA', que_hacer: 'No se pudo conectar con el proveedor. Suele ser algo puntual: prueba de nuevo en unos minutos.' },
  otro: { titulo: 'Error desconocido', que_hacer: 'Pásale el detalle a Claude para revisarlo.' },
}

/** Motivo de un error lanzado por callLLM. */
export function classifyAIError(err: unknown): { reason: AIReason; detail: string } {
  const msg = err instanceof Error ? `${err.name === 'Error' ? '' : `${err.name}: `}${err.message}` : String(err)
  const detail = msg.slice(0, 300)
  const status = Number(msg.match(/LLM (\d{3})/)?.[1] ?? 0)
  let reason: AIReason = 'otro'
  if (/AI not configured/i.test(msg)) reason = 'sin-configurar'
  else if (status === 401 || status === 403) reason = 'clave'
  else if (status === 429 || /quota|rate.?limit/i.test(msg)) reason = 'limite'
  else if (status === 404 || /model .*not found/i.test(msg)) reason = 'modelo'
  else if (status >= 500) reason = 'proveedor-caido'
  else if (status >= 400) reason = 'peticion'
  else if (/timeout|timed out|abort/i.test(msg)) reason = 'lento'
  else if (/empty/i.test(msg)) reason = 'vacia'
  else if (/fetch failed|ECONN|ENOTFOUND|network|socket/i.test(msg)) reason = 'red'
  return { reason, detail }
}

export interface AIEventRow {
  created_at: string
  ok: boolean
  section: string | null
  reason: string | null
  detail: string | null
}

export type AILight = 'verde' | 'ambar' | 'rojo' | 'sin-datos'

export interface AIStatus {
  light: AILight
  titulo: string
  fallosHoy: number
  fallos30min: number
  ultimoFallo: (AIEventRow & { titulo: string; que_hacer: string }) | null
  ultimaPrueba: { at: string; ok: boolean } | null
  porSeccion: Array<{ section: string; count: number }>
}

/** Fallos seguidos en poco tiempo que disparan el aviso por email. */
export const ALERT_THRESHOLD = 3
export const ALERT_WINDOW_MIN = 15
export const ALERT_COOLDOWN_MIN = 60

export function summarizeAIStatus(rows: AIEventRow[], now = Date.now()): AIStatus {
  const ago = (r: AIEventRow) => now - new Date(r.created_at).getTime()
  const fails = rows.filter(r => !r.ok)
  const day = fails.filter(r => ago(r) <= 24 * 3600_000)
  const recent = fails.filter(r => ago(r) <= 30 * 60_000)
  const probes = rows.filter(r => r.section === 'prueba-automatica').sort((a, b) => b.created_at.localeCompare(a.created_at))
  const lastProbe = probes[0] ? { at: probes[0].created_at, ok: probes[0].ok } : null
  const last = [...fails].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const lastOk = rows.filter(r => r.ok).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  // Si la última prueba fue bien DESPUÉS del último fallo, ya está arreglado.
  const recovered = !!(last && lastOk && lastOk.created_at > last.created_at)

  let light: AILight = 'verde'
  if (!rows.length) light = 'sin-datos'
  else if (!recovered && (recent.length >= ALERT_THRESHOLD || (lastProbe && !lastProbe.ok))) light = 'rojo'
  else if (!recovered && day.length > 0) light = 'ambar'

  const bySection = new Map<string, number>()
  for (const r of day) bySection.set(r.section || 'otra', (bySection.get(r.section || 'otra') ?? 0) + 1)

  const reasonOf = (r: AIEventRow) => REASON_TEXT[(r.reason as AIReason) in REASON_TEXT ? (r.reason as AIReason) : 'otro']
  return {
    light,
    titulo: light === 'rojo' ? 'La IA está fallando ahora'
      : light === 'ambar' ? 'Ha habido fallos hoy, ahora parece estable'
      : light === 'sin-datos' ? 'Aún no hay datos: pulsa «Probar ahora»'
      : 'La IA funciona bien',
    fallosHoy: day.length,
    fallos30min: recent.length,
    ultimoFallo: last ? { ...last, ...reasonOf(last) } : null,
    ultimaPrueba: lastProbe,
    porSeccion: [...bySection].map(([section, count]) => ({ section, count })).sort((a, b) => b.count - a.count),
  }
}

/** Sección legible a partir de la ruta (/crear-contenido → «crear-contenido»). */
export function sectionFromPath(path: string | null | undefined): string | null {
  if (!path) return null
  try {
    const p = path.startsWith('http') ? new URL(path).pathname : path
    const s = p.split('?')[0].split('/').filter(Boolean).slice(0, 2).join('/')
    return s ? s.slice(0, 60) : 'inicio'
  } catch { return null }
}
