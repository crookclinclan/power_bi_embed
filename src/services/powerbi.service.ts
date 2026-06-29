import { env } from '../config/env.js'
import { ServiceUnavailableError } from '../domain/errors.js'
import type {
  EffectiveIdentity,
  EmbedTokenResponse,
  PowerBiGenerateTokenResult,
  PowerBiReport,
  ResolvedMember,
} from '../domain/types.js'
import { LANDING_PAGE_RE } from '../lib/powerbi-pages.js'
import { logger } from '../lib/logger.js'
import { getAzureAccessToken } from './azure-auth.service.js'

interface PowerBiReportApiResponse {
  id: string
  name: string
  embedUrl: string
  datasetId: string
}

interface PowerBiTokenApiResponse {
  token: string
  tokenId?: string
  expiration: string
}

interface PowerBiPagesApiResponse {
  value: { name: string; displayName: string }[]
}

let cachedResultsPageName: string | undefined

function workspacePath(suffix: string): string {
  const { workspaceId, apiBase } = env.powerBi
  return `${apiBase}/groups/${workspaceId}${suffix}`
}

async function powerBiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await getAzureAccessToken()
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    logger.error('Power BI API error', { url, status: response.status, detail: detail.slice(0, 400) })
    throw new ServiceUnavailableError(`Power BI API failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export async function getReport(): Promise<PowerBiReport> {
  const { reportId } = env.powerBi
  const data = await powerBiFetch<PowerBiReportApiResponse>(
    workspacePath(`/reports/${reportId}`),
  )
  return {
    id: data.id,
    name: data.name,
    embedUrl: data.embedUrl,
    datasetId: data.datasetId || env.powerBi.datasetId,
  }
}

export async function generateEmbedToken(identity: EffectiveIdentity): Promise<PowerBiGenerateTokenResult> {
  const { reportId, datasetId, rlsRole } = env.powerBi

  const body = {
    accessLevel: 'View',
    identities: [
      {
        username: identity.username,
        roles: identity.roles.length ? identity.roles : [rlsRole],
        datasets: identity.datasets.length ? identity.datasets : [datasetId],
      },
    ],
  }

  const data = await powerBiFetch<PowerBiTokenApiResponse>(
    workspacePath(`/reports/${reportId}/GenerateToken`),
    { method: 'POST', body: JSON.stringify(body) },
  )

  return {
    token: data.token,
    expiration: data.expiration,
  }
}

async function getReportPages(reportId: string): Promise<PowerBiPagesApiResponse['value']> {
  const data = await powerBiFetch<PowerBiPagesApiResponse>(
    workspacePath(`/reports/${reportId}/pages`),
  )
  return data.value ?? []
}

async function getResultsPageName(reportId: string): Promise<string | undefined> {
  if (cachedResultsPageName) return cachedResultsPageName

  try {
    const pages = await getReportPages(reportId)
    const results = pages.find((p) => !LANDING_PAGE_RE.test(p.displayName ?? ''))
    const name = results?.name ?? pages[1]?.name
    if (name) cachedResultsPageName = name
    return name
  } catch (err) {
    logger.warn('Could not resolve Power BI results page', {
      message: err instanceof Error ? err.message : String(err),
    })
    return undefined
  }
}

export async function createEmbedSession(
  member: Pick<ResolvedMember, 'memberId' | 'rlsUsername' | 'rlsFilter'>,
): Promise<EmbedTokenResponse> {
  const report = await getReport()
  const datasetId = env.powerBi.datasetId || report.datasetId
  const resultsPageName = await getResultsPageName(report.id)

  const tokenResult = await generateEmbedToken({
    username: member.rlsUsername,
    roles: [env.powerBi.rlsRole],
    datasets: [datasetId],
  })

  return {
    accessToken: tokenResult.token,
    embedUrl: report.embedUrl,
    reportId: report.id,
    expiration: tokenResult.expiration,
    memberId: member.memberId || member.rlsUsername,
    rlsUsername: member.rlsUsername,
    rlsFilter: member.rlsFilter,
    resultsPageName,
  }
}

export function isPowerBiConfigured(): boolean {
  const { workspaceId, reportId, datasetId } = env.powerBi
  return Boolean(workspaceId && reportId && datasetId)
}
