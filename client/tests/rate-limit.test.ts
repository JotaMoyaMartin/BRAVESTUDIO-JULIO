import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, __resetRateLimit } from '@/lib/rate-limit'

describe('rateLimit (sliding window)', () => {
  beforeEach(() => __resetRateLimit())

  it('permite peticiones por debajo del límite', () => {
    expect(rateLimit('k1', 3, 60_000).ok).toBe(true)
    expect(rateLimit('k1', 3, 60_000).ok).toBe(true)
    expect(rateLimit('k1', 3, 60_000).ok).toBe(true)
  })

  it('bloquea al superar el límite y devuelve retryAfterSec >= 1', () => {
    for (let i = 0; i < 3; i++) rateLimit('k2', 3, 60_000)
    const blocked = rateLimit('k2', 3, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1)
  })

  it('claves independientes (usuario vs otro)', () => {
    rateLimit('user-a', 1, 60_000)
    expect(rateLimit('user-a', 1, 60_000).ok).toBe(false)
    expect(rateLimit('user-b', 1, 60_000).ok).toBe(true)
  })

  it('la ventana deslizante libera hueco tras expirar', () => {
    vi.useFakeTimers()
    try {
      const now = Date.now()
      vi.setSystemTime(now)
      expect(rateLimit('k4', 1, 1_000).ok).toBe(true)
      expect(rateLimit('k4', 1, 1_000).ok).toBe(false)
      vi.setSystemTime(now + 1_500)
      expect(rateLimit('k4', 1, 1_000).ok).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('retryAfterSec es 0 cuando la petición pasa', () => {
    const r = rateLimit('k5', 5, 60_000)
    expect(r.ok).toBe(true)
    expect(r.retryAfterSec).toBe(0)
  })
})