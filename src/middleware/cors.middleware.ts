import cors from 'cors'
import { env } from '../config/env.js'

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) {
      if (env.isProduction) return callback(null, false)
      return callback(null, true)
    }
    const clean = origin.replace(/\/$/, '')
    if (env.allowedOrigins.includes(clean)) return callback(null, true)
    return callback(null, false)
  },
})
