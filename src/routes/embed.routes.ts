import { Router } from 'express'
import { postEmbedToken } from '../controllers/embed.controller.js'
import { apiKeyGuard, embedSignatureGuard } from '../middleware/embed-auth.middleware.js'
import { originGuard } from '../middleware/origin-guard.middleware.js'
import { embedRateLimiter } from '../middleware/rate-limit.middleware.js'

export const embedRouter = Router()

embedRouter.use(embedRateLimiter)
embedRouter.use(originGuard)

embedRouter.post(
  '/embed-token',
  apiKeyGuard,
  embedSignatureGuard,
  postEmbedToken,
)
