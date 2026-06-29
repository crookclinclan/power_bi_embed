import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { env } from '../config/env.js'

export const embedRateLimiter = rateLimit({
  windowMs: 60_000,
  max: env.isProduction ? 30 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  keyGenerator: (req) => {
    const forwarded = req.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = forwarded || req.ip || 'unknown'
    if (ip === 'unknown') return ip
    return ipKeyGenerator(ip)
  },
})
