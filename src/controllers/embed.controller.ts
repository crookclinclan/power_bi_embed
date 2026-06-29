import type { Request, Response, NextFunction } from 'express'
import { BadRequestError } from '../domain/errors.js'
import { isValidMemberId } from '../lib/member-id.js'
import { issueEmbedToken } from '../services/embed.service.js'

function readMemberId(req: Request): string {
  const fromBody = req.body?.memberId ?? req.body?.member_id
  const fromQuery = req.query.memberId ?? req.query.member_id
  const raw = fromBody ?? fromQuery
  return typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim()
}

function readEmail(req: Request): string | undefined {
  const fromBody = req.body?.email ?? req.body?.memberEmail ?? req.body?.member_email
  const fromQuery = req.query.email ?? req.query.memberEmail ?? req.query.member_email
  const raw = fromBody ?? fromQuery
  if (raw == null || raw === '') return undefined
  return typeof raw === 'string' ? raw.trim() : String(raw).trim()
}

function assertMemberId(memberId: string): void {
  if (!memberId) {
    throw new BadRequestError('memberId is required')
  }
  if (!isValidMemberId(memberId)) {
    throw new BadRequestError('Invalid memberId format')
  }
}

export async function postEmbedToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const memberId = readMemberId(req)
    assertMemberId(memberId)

    const session = await issueEmbedToken(memberId, readEmail(req))
    res.json(session)
  } catch (err) {
    next(err)
  }
}

export async function getEmbedToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const memberId = readMemberId(req)
    assertMemberId(memberId)

    const session = await issueEmbedToken(memberId, readEmail(req))
    res.json(session)
  } catch (err) {
    next(err)
  }
}
