import type { Express } from 'express'
import { createApp } from '../src/app'

/**
 * Vercel serverless entry point.
 *
 * An Express app is itself a (req, res) handler, so Vercel's Node runtime can
 * invoke it directly. `vercel.json` rewrites all paths to this function.
 *
 * `createApp()` is wrapped so that any unexpected error during construction is
 * surfaced as a clean JSON 500 instead of crashing the invocation
 * (FUNCTION_INVOCATION_FAILED).
 */
let app: Express | null = null
let bootError: Error | null = null

try {
  app = createApp()
} catch (err) {
  bootError = err instanceof Error ? err : new Error('Failed to initialize server')
  // eslint-disable-next-line no-console
  console.error('[boot] failed to create app:', bootError)
}

// Use loose typing: at runtime Vercel passes Node's req/res, which Express accepts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any) {
  if (!app) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Server failed to start', detail: bootError?.message }))
    return
  }
  return app(req, res)
}
