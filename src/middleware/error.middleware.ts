import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../domain/errors.js'
import { logger } from '../lib/logger.js'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
    return
  }

  logger.error('Unhandled error', {
    message: err instanceof Error ? err.message : String(err),
  })

  res.status(500).json({ error: 'Internal server error' })
}
