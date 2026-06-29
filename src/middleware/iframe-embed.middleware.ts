import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'

const IFRAME_EMBED_PATHS = new Set([
  '/kajabi-frame.html',
  '/embed-test.html',
])

/** Allow Kajabi (passgp.au) to iframe our embed pages. Helmet defaults block cross-origin frames. */
export function iframeEmbedHeaders(req: Request, res: Response, next: NextFunction): void {
  if (!IFRAME_EMBED_PATHS.has(req.path)) {
    return next()
  }

  const ancestors = ["'self'", ...env.allowedOrigins].join(' ')
  res.setHeader('Content-Security-Policy', `frame-ancestors ${ancestors}`)
  res.removeHeader('X-Frame-Options')
  next()
}
