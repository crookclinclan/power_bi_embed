import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { UnauthorizedError } from '../domain/errors.js'
import { verifyMemberRequest } from '../lib/request-signature.js'

function readSignedFields(req: Request): { memberId: string; ts: number; sig: string } {
  const body = req.body ?? {}
  const memberId =
    typeof body.memberId === 'string'
      ? body.memberId.trim()
      : typeof body.member_id === 'string'
        ? body.member_id.trim()
        : ''
  const ts = Number(body.ts)
  const sig = typeof body.sig === 'string' ? body.sig.trim() : ''
  return { memberId, ts, sig }
}

export function apiKeyGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!env.apiSecret) {
    if (env.isProduction) {
      return next(new UnauthorizedError('API is not configured for production'))
    }
    return next()
  }

  const provided = req.get('x-api-key') ?? ''
  if (!provided || provided !== env.apiSecret) {
    return next(new UnauthorizedError('Invalid API key'))
  }

  next()
}

export function embedSignatureGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!env.apiSecret) return next()

  const { memberId, ts, sig } = readSignedFields(req)
  if (!verifyMemberRequest(memberId, ts, sig, env.apiSecret)) {
    return next(new UnauthorizedError('Invalid or expired request signature'))
  }

  next()
}
