import { CanvaError } from './types'

/**
 * Base HTTP de todos los endpoints Canva REST. Solo server (los tokens
 * jamás llegan al browser — ver tokens.ts y las rutas /api/canva/*).
 */
export const CANVA_API_BASE = 'https://api.canva.com/rest/v1'

interface CanvaRawError {
  code?: string
  message?: string
}

/** Mapea una respuesta fallida de Canva al error normalizado. */
async function toCanvaError(res: Response, path: string): Promise<CanvaError> {
  const raw = (await res.json().catch(() => null)) as { response?: CanvaRawError } | null
  const code = raw?.response?.code ?? (res.status === 429 ? 'too_many_requests' : 'internal_failure')
  const message =
    raw?.response?.message ?? `Canva ${res.status} en ${path} sin mensaje`
  return new CanvaError(res.status, code, message)
}

/**
 * Fetch contra Canva con token de acceso y errores normalizados.
 * JSON de respuesta devuelta tal cual (shape canónico de Canva con wrapper,
 * p. ej. { dataset: ... } | { job: ... } | { design: ... }).
 */
export async function canvaRequest(args: {
  accessToken: string
  path: string // empezando por /, ej. /designs/DA.../dataset
  method?: 'GET' | 'POST'
  body?: unknown
  timeoutMs?: number
}): Promise<Record<string, unknown>> {
  const { accessToken, path, method = 'GET', body, timeoutMs = 30_000 } = args
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${CANVA_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!res.ok) throw await toCanvaError(res, path)
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return json
  } catch (err) {
    if (err instanceof CanvaError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new CanvaError(504, 'timeout', `Timeout de ${timeoutMs}ms llamando a ${path}`)
    }
    throw new CanvaError(502, 'network_error', `No se pudo llamar a ${path}: ${(err as Error).message}`)
  } finally {
    clearTimeout(timer)
  }
}