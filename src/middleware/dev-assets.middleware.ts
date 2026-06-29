import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'

const BLOCKED_IN_PRODUCTION = new Set(['/embed-test.html'])

/** Block dev-only static pages in production. */
export function blockDevAssetsInProduction(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!env.isProduction) return next()

  if (BLOCKED_IN_PRODUCTION.has(req.path)) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  next()
}
