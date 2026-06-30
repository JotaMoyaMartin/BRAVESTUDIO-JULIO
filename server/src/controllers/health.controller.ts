import type { Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'

/** Liveness probe — does the process respond. */
export function getHealth(_req: Request, res: Response): void {
  res.json({ status: 'ok', service: 'brave-studio-server', time: new Date().toISOString() })
}

/** Readiness probe — can we actually reach Supabase. */
export async function getReadiness(_req: Request, res: Response): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  if (error) {
    res.status(503).json({ status: 'degraded', database: 'unreachable', detail: error.message })
    return
  }
  res.json({ status: 'ok', database: 'reachable' })
}
