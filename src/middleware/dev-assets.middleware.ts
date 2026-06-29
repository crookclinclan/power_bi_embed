import type { NextFunction, Request, Response } from 'express'

/** Reserved for future dev-only static assets; embed-test.html is allowed in production. */
export function blockDevAssetsInProduction(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next()
}
