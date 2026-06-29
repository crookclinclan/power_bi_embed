import { Router } from 'express'
import { getEmbedToken } from '../controllers/embed.controller.js'
import { embedRateLimiter } from '../middleware/rate-limit.middleware.js'
import { testPageOriginGuard } from '../middleware/test-page-origin.middleware.js'

/** Same-origin test helper for embed-test.html (local + Render). No API key in browser. */
export const testRouter = Router()

testRouter.use(embedRateLimiter)
testRouter.get('/embed-token', testPageOriginGuard, getEmbedToken)
