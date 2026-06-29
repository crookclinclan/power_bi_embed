import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { UnauthorizedError } from '../domain/errors.js'

function requestHost(req: Request): string {
  return (req.get('x-forwarded-host') ?? req.get('host') ?? '').split(',')[0].trim().toLowerCase()
}

function matchesServiceOrigin(req: Request, value: string): boolean {
  const host = requestHost(req)
  if (!host || !value) return false
  try {
    return new URL(value).host.toLowerCase() === host
  } catch {
    return false
  }
}

/** embed-test.html only — server uses API_SECRET from env; browser never sends the key. */
export function testPageOriginGuard(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!env.isProduction) return next()

  // embed-test.html fetch on Render/local (Referer often stripped by Helmet)
  if (req.get('sec-fetch-site') === 'same-origin') return next()

  const origin = req.get('origin')
  if (origin && matchesServiceOrigin(req, origin)) return next()

  const referer = req.get('referer') ?? ''
  if (referer && matchesServiceOrigin(req, referer)) return next()

  next(new UnauthorizedError('Forbidden'))
}
