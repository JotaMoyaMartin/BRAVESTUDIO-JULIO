import express, { type Express } from 'express'
import cors from 'cors'
import { env } from './config/env'
import routes from './routes'
import { notFound, errorHandler } from './middleware/errorHandler'

/**
 * Builds and configures the Express application.
 * Exported (not started) so it can be reused by both the local server
 * (src/index.ts) and the Vercel serverless entry (api/index.ts).
 */
export function createApp(): Express {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin.length ? env.corsOrigin : true,
      credentials: true,
    })
  )
  app.use(express.json())

  app.get('/', (_req, res) => {
    res.json({ name: 'brave-studio-server', status: 'running' })
  })

  app.use('/api', routes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
