import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { UnauthorizedError } from '../domain/errors.js'

function matchesAllowedOrigin(value: string): boolean {
  const clean = value.replace(/\/$/, '')
  return env.allowedOrigins.includes(clean)
}

function matchesServiceOrigin(req: Request, value: string): boolean {
  const host = req.get('host')
  if (!host || !value) return false
  try {
    return new URL(value).host === host
  } catch {
    return false
  }
}

/** In production, embed-token must come from PassGP or this service (embed-test.html). */
export function originGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!env.isProduction) return next()

  const origin = req.get('origin')
  if (origin && (matchesAllowedOrigin(origin) || matchesServiceOrigin(req, origin))) {
    return next()
  }

  const referer = req.get('referer') ?? ''
  if (referer) {
    if (env.allowedOrigins.some((o) => referer.startsWith(`${o}/`) || referer === o)) {
      return next()
    }
    if (matchesServiceOrigin(req, referer)) return next()
  }

  next(new UnauthorizedError('Forbidden'))
}
