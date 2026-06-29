import type { Request, Response } from 'express'
import { env, isEmbedConfigComplete } from '../config/env.js'
import type { HealthResponse } from '../domain/types.js'
import { getAzureAccessToken } from '../services/azure-auth.service.js'
import { hasMemberLookupConfig } from '../services/member-lookup.service.js'
import { isPowerBiConfigured } from '../services/powerbi.service.js'

export async function healthController(_req: Request, res: Response): Promise<void> {
  const checks = {
    azure: false,
    powerBi: isPowerBiConfigured(),
    memberLookup: false,
  }

  if (isEmbedConfigComplete()) {
    try {
      await getAzureAccessToken()
      checks.azure = true
    } catch {
      checks.azure = false
    }
  }

  checks.memberLookup = hasMemberLookupConfig()

  const ok = checks.azure && checks.powerBi && checks.memberLookup
  const body: HealthResponse = {
    status: ok ? 'ok' : 'degraded',
    service: 'passgp-powerbi-embed',
    checks,
  }

  // Always 200 so Render liveness passes; use status/degraded for dependency state.
  res.status(200).json(body)
}

export function configController(_req: Request, res: Response): void {
  res.json({
    rlsRole: env.powerBi.rlsRole,
    embedConfigured: isEmbedConfigComplete(),
    ...(env.isProduction ? {} : { allowedOrigins: env.allowedOrigins }),
  })
}
