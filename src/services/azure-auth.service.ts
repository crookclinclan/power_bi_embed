import { env } from '../config/env.js'
import { ServiceUnavailableError } from '../domain/errors.js'
import { logger } from '../lib/logger.js'

interface AzureTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

let cached: { token: string; expiresAt: number } | null = null

export async function getAzureAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token
  }

  const { tenantId, clientId, clientSecret, tokenUrl, scope } = env.azure
  if (!tenantId || !clientId || !clientSecret) {
    throw new ServiceUnavailableError('Azure credentials are not configured')
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  })

  const response = await fetch(tokenUrl(tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const detail = await response.text()
    logger.error('Azure token request failed', { status: response.status, detail: detail.slice(0, 300) })
    throw new ServiceUnavailableError('Failed to authenticate with Azure AD')
  }

  const data = (await response.json()) as AzureTokenResponse
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

export function clearAzureTokenCache(): void {
  cached = null
}
