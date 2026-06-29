import { Router } from 'express'
import { env } from '../config/env.js'
import { devRouter } from './dev.routes.js'
import { embedRouter } from './embed.routes.js'
import { healthRouter } from './health.routes.js'
import { testRouter } from './test.routes.js'

export const apiRouter = Router()

apiRouter.use(healthRouter)
apiRouter.use('/powerbi', embedRouter)
apiRouter.use('/test', testRouter)

if (!env.isProduction) {
  apiRouter.use('/dev', devRouter)
}
