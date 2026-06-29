import { Router } from 'express'
import { getEmbedToken } from '../controllers/embed.controller.js'
import { env } from '../config/env.js'

/** Local testing only — server signs/auth is skipped; uses API_SECRET from .env internally. */
export const devRouter = Router()

if (!env.isProduction) {
  devRouter.get('/embed-token', getEmbedToken)
}
