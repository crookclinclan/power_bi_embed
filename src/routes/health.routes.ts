import { Router } from 'express'
import { env } from '../config/env.js'
import { configController, healthController } from '../controllers/health.controller.js'
import { apiKeyGuard } from '../middleware/embed-auth.middleware.js'

export const healthRouter = Router()

healthRouter.get('/health', healthController)

if (env.isProduction) {
  healthRouter.get('/config', apiKeyGuard, configController)
} else {
  healthRouter.get('/config', configController)
}
