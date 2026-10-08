import { CanvaError, CanvaJobStatus } from './types'
import { canvaRequest } from './client'

/**
 * Polling de jobs asíncronos de Canva (autofill / export / asset-uploads)
 * con backoff exponencial, timeout duro y SIN loop infinito. La doc oficial
 * recomienda backoff empezando corto.
 *
 * El getter devuelve el job en crudo: { job: { id, status, ...resto } }.
 */
export async function pollCanvaJob<T = Record<string, unknown>>(args: {
  accessToken: string
  path: string // GET /autofills/{id} | /exports/{id} | /asset-uploads/{id}
  timeoutMs?: number
  firstIntervalMs?: number
  maxIntervalMs?: number
}): Promise<{ status: CanvaJobStatus; body: T }> {
  const {
    accessToken,
    path,
    timeoutMs = 120_000,
    firstIntervalMs = 1_500,
    maxIntervalMs = 12_000,
  } = args
  const startedAt = Date.now()
  let interval = firstIntervalMs

  for (;;) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new CanvaError(504, 'job_timeout', `El job de Canva (${path}) no terminó en ${Math.round(timeoutMs / 1000)}s`)
    }

    let body: Record<string, unknown>
    try {
      body = await canvaRequest({ accessToken, path })
    } catch (err) {
      // 429/5xx transitorios durante el polling: esperar y reintentar, no reventar.
      if (err instanceof CanvaError && (err.status === 429 || err.status >= 500)) {
        await sleep(interval)
        interval = Math.min(interval * 2, maxIntervalMs)
        continue
      }
      throw err
    }

    const job = (body.job ?? {}) as { status?: string } & Record<string, unknown>
    const status = job.status

    if (status === 'success') return { status: 'success', body: job as unknown as T }
    if (status === 'failed') {
      const error = (job.error ?? {}) as { code?: string; message?: string }
      throw new CanvaError(502, error.code ?? 'job_failed', error.message ?? 'El job de Canva falló')
    }
    if (status !== 'in_progress') {
      throw new CanvaError(502, 'unknown_job_status', `Estado de job desconocido: ${status}`)
    }

    await sleep(interval)
    interval = Math.min(interval * 2, maxIntervalMs)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}