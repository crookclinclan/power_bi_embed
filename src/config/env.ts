import 'dotenv/config'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadServiceAccountJson(): string {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ?? ''
  if (raw.startsWith('{')) return raw

  const filePath = resolve(process.cwd(), raw || 'passgp-9d49e1aae79e.json')
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf8').trim()
  }

  return raw
}

function splitList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  port: Number(process.env.PORT) || 5051,
  allowedOrigins: splitList(process.env.ALLOWED_ORIGINS, [
    'https://www.passgp.au',
    'https://passgp.au',
    'http://localhost:5051',
    'http://127.0.0.1:5051',
  ]),
  apiSecret: process.env.API_SECRET?.trim() ?? '',

  azure: {
    tenantId: process.env.AZURE_TENANT_ID?.trim() ?? '',
    clientId: process.env.AZURE_CLIENT_ID?.trim() ?? '',
    clientSecret: process.env.AZURE_CLIENT_SECRET?.trim() ?? '',
    tokenUrl: (tenantId: string) =>
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    scope: 'https://analysis.windows.net/powerbi/api/.default',
  },

  powerBi: {
    workspaceId: process.env.POWERBI_WORKSPACE_ID?.trim() ?? '',
    reportId: process.env.POWERBI_REPORT_ID?.trim() ?? '',
    datasetId: process.env.POWERBI_DATASET_ID?.trim() ?? '',
    rlsRole: process.env.POWERBI_RLS_ROLE?.trim() || 'Candidate',
    filterTable: process.env.POWERBI_FILTER_TABLE?.trim() || 'DIM_Student',
    filterColumn: process.env.POWERBI_FILTER_COLUMN?.trim() || 'member_ID',
    filterEmailColumn:
      process.env.POWERBI_FILTER_EMAIL_COLUMN?.trim() || 'Student_Email',
    apiBase: 'https://api.powerbi.com/v1.0/myorg',
  },

  sheets: {
    spreadsheetId:
      process.env.GOOGLE_SHEETS_ID?.trim() ||
      '1-OkccWQQUL2d0RbE340nzkz1l4FLHsfes6AwfgwfYR8',
    membersRange: process.env.GOOGLE_SHEETS_MEMBERS_RANGE?.trim() || '',
    tabPrefix: process.env.GOOGLE_SHEETS_TAB_PREFIX?.trim() || 'Raw Submissions',
    columnRange: process.env.GOOGLE_SHEETS_COLUMN_RANGE?.trim() || 'A:RA',
    memberIdColumn: process.env.GOOGLE_SHEETS_MEMBER_ID_COLUMN?.trim() || 'RA',
    memberIdAaColumn: process.env.GOOGLE_SHEETS_MEMBER_ID_AA_COLUMN?.trim() || 'AA',
    emailHeader:
      process.env.GOOGLE_SHEETS_EMAIL_HEADER?.trim() || 'Enter your email address:',
    memberIdHeader: process.env.GOOGLE_SHEETS_MEMBER_ID_HEADER?.trim() || 'member_id',
    serviceAccountJson: loadServiceAccountJson(),
  },

  membersMapJson: process.env.MEMBERS_MAP_JSON?.trim() ?? '',
} as const

export function assertEmbedConfig(): void {
  const missing: string[] = []
  if (!env.azure.tenantId) missing.push('AZURE_TENANT_ID')
  if (!env.azure.clientId) missing.push('AZURE_CLIENT_ID')
  if (!env.azure.clientSecret) missing.push('AZURE_CLIENT_SECRET')
  if (!env.powerBi.workspaceId) missing.push('POWERBI_WORKSPACE_ID')
  if (!env.powerBi.reportId) missing.push('POWERBI_REPORT_ID')
  if (!env.powerBi.datasetId) missing.push('POWERBI_DATASET_ID')
  if (missing.length) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`)
  }
}

export function isEmbedConfigComplete(): boolean {
  try {
    assertEmbedConfig()
    return true
  } catch {
    return false
  }
}

export function assertProductionSecurity(): void {
  if (!env.isProduction) return
  if (!env.apiSecret) {
    throw new Error('API_SECRET is required when NODE_ENV=production')
  }
}

export function parseMembersMap(): Map<string, string> {
  const map = new Map<string, string>()
  if (!env.membersMapJson) return map
  try {
    const parsed = JSON.parse(env.membersMapJson) as Record<string, string>
    for (const [id, email] of Object.entries(parsed)) {
      if (id && email) map.set(String(id).trim(), String(email).trim().toLowerCase())
    }
  } catch {
    // ignore invalid JSON at startup; lookup service will surface errors
  }
  return map
}
