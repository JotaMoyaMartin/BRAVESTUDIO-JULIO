/**
 * Thin client for the standalone backend API (the `server/` app).
 *
 * Base URL comes from NEXT_PUBLIC_API_URL so it can point at the deployed
 * Vercel backend in production and at localhost during development.
 */
import { createClient } from '@/lib/supabase/client'

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  /** Parsed JSON body — serialized automatically. */
  body?: unknown
  /** Attach the current Supabase access token as a Bearer header. */
  auth?: boolean
}

/**
 * Call the backend API. Returns the parsed JSON response.
 *
 * @example
 *   const health = await api('/api/health')
 *   const data = await api('/api/something', { method: 'POST', body: {...}, auth: true })
 */
export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, auth, headers, ...rest } = options

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  }

  if (auth) {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const message =
      (isJson && (payload as { error?: string })?.error) || `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }

  return payload as T
}

/** Convenience: backend liveness check. */
export function getApiHealth() {
  return api<{ status: string; service: string; time: string }>('/api/health')
}
