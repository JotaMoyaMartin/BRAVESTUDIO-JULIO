import type { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'

/** 404 handler for unmatched routes. */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` })
}

/** Centralized error handler. Must be registered last. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : 'Internal server error'
  // eslint-disable-next-line no-console
  console.error('[error]', err)
  res.status(500).json({
    error: message,
    ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  })
}
