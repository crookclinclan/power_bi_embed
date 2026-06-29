import { Router } from 'express'
import { postEmbedToken } from '../controllers/embed.controller.js'
import { getHandoff, postHandoff } from '../controllers/handoff.controller.js'
import { apiKeyGuard, embedSignatureGuard } from '../middleware/embed-auth.middleware.js'
import { originGuard } from '../middleware/origin-guard.middleware.js'
import { embedRateLimiter } from '../middleware/rate-limit.middleware.js'

export const embedRouter = Router()

embedRouter.use(embedRateLimiter)

embedRouter.post(
  '/embed-token',
  originGuard,
  apiKeyGuard,
  embedSignatureGuard,
  postEmbedToken,
)

/** One-time session handoff for fullscreen tab (no window.opener needed). */
embedRouter.post('/handoff', originGuard, apiKeyGuard, postHandoff)
embedRouter.get('/handoff/:id', getHandoff)
