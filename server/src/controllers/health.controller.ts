import type { Request, Response } from 'express'
import { getSupabaseAdmin } from '../lib/supabase'
import { getMissingEnv } from '../config/env'

/** Liveness probe — does the process respond. Never touches the DB. */
export function getHealth(_req: Request, res: Response): void {
  res.json({ status: 'ok', service: 'brave-studio-server', time: new Date().toISOString() })
}

/** Readiness probe — verifies configuration and Supabase connectivity. */
export async function getReadiness(_req: Request, res: Response): Promise<void> {
  const missing = getMissingEnv()
  if (missing.length) {
    res.status(503).json({
      status: 'degraded',
      database: 'not_configured',
      missingEnv: missing,
    })
    return
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (error) {
      res.status(503).json({ status: 'degraded', database: 'unreachable', detail: error.message })
      return
    }
    res.json({ status: 'ok', database: 'reachable' })
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'unreachable',
      detail: err instanceof Error ? err.message : 'unknown error',
    })
  }
}
