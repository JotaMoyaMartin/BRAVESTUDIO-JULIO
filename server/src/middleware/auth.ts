import type { Request, Response, NextFunction } from 'express'
import { getSupabaseAdmin } from '../lib/supabase'
import { isConfigured } from '../config/env'

export interface AuthedRequest extends Request {
  user?: { id: string; email?: string }
  accessToken?: string
}

/**
 * Verifies the Supabase access token from the `Authorization: Bearer <token>`
 * header and attaches the resolved user to the request. Responds 401 on failure.
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' })
    return
  }

  if (!isConfigured()) {
    res.status(503).json({ error: 'Server not configured' })
    return
  }

  const { data, error } = await getSupabaseAdmin().auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  req.user = { id: data.user.id, email: data.user.email ?? undefined }
  req.accessToken = token
  next()
}
