/**
 * Rate limiting en memoria (sliding window).
 *
 * NOTA DE ALCANCE: el state es por instancia de función (Vercel Lambda).
 * Es suficiente como freno de abuso / coste; si se necesita un límite
 * estricto global, migrar a un store compartido (Upstash Redis, etc.).
 */

const buckets = new Map<string, number[]>()
let sweepCounter = 0

export interface RateLimitResult {
  ok: boolean
  /** Segundos que deben pasar antes de reintentar (0 si ok). */
  retryAfterSec: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const timestamps = (buckets.get(key) || []).filter(t => now - t < windowMs)

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps)
    const retryAfterSec = Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000))
    return { ok: false, retryAfterSec }
  }

  timestamps.push(now)
  buckets.set(key, timestamps)

  // Purga periódica de buckets vacíos para no crecer sin límite.
  if (++sweepCounter % 500 === 0) {
    for (const [k, v] of buckets) {
      const alive = v.some(t => now - t < windowMs)
      if (!alive) buckets.delete(k)
    }
  }

  return { ok: true, retryAfterSec: 0 }
}

/** Utilidad para tests: vacía todos los buckets. */
export function __resetRateLimit() {
  buckets.clear()
  sweepCounter = 0
}