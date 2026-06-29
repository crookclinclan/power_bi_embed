import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blockDevAssetsInProduction } from './middleware/dev-assets.middleware.js'
import { corsMiddleware } from './middleware/cors.middleware.js'
import { errorHandler } from './middleware/error.middleware.js'
import { iframeEmbedHeaders } from './middleware/iframe-embed.middleware.js'
import { apiRouter } from './routes/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()

  app.use(
    helmet({
      contentSecurityPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: false,
    }),
  )
  app.use(corsMiddleware)
  app.use(express.json({ limit: '64kb' }))

  app.use('/api', apiRouter)

  app.use(blockDevAssetsInProduction)
  app.use(iframeEmbedHeaders)

  const publicDir = path.join(__dirname, '..', 'public')
  app.use(express.static(publicDir))

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(errorHandler)

  return app
}
