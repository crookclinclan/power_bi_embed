import type { Request, Response } from 'express'
import { BadRequestError, NotFoundError } from '../domain/errors.js'
import type { EmbedTokenResponse } from '../domain/types.js'
import { consumeHandoff, createHandoff } from '../services/handoff.service.js'

function isEmbedSession(value: unknown): value is EmbedTokenResponse {
  if (!value || typeof value !== 'object') return false
  const s = value as EmbedTokenResponse
  return Boolean(s.accessToken && s.embedUrl && s.reportId)
}

export function postHandoff(req: Request, res: Response): void {
  const session = req.body?.session
  if (!isEmbedSession(session)) {
    throw new BadRequestError('Invalid embed session')
  }

  const handoffId = createHandoff(session)
  res.json({ handoffId })
}

export function getHandoff(req: Request, res: Response): void {
  const session = consumeHandoff(req.params.id ?? '')
  if (!session) {
    throw new NotFoundError('Handoff expired or invalid — open full screen from your dashboard again')
  }

  res.json(session)
}
