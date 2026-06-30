import type { Request, Response } from 'express'
import { createApp } from '../src/app'

/**
 * Vercel serverless entry point.
 * An Express app is itself a (req, res) handler, so Vercel's Node runtime
 * can invoke it directly. `vercel.json` rewrites all paths to this function.
 */
const app = createApp()

export default function handler(req: Request, res: Response) {
  return app(req, res)
}
