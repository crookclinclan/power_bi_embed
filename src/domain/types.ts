export interface EmbedTokenRequest {
  memberId: string
}

export interface EmbedRlsFilter {
  table: string
  column: string
}

export interface EmbedTokenResponse {
  accessToken: string
  embedUrl: string
  reportId: string
  expiration: string
  memberId: string
  rlsUsername: string
  rlsFilter: EmbedRlsFilter
  resultsPageName?: string
}

export interface ResolvedMember {
  memberId: string
  email: string
  rlsUsername: string
  rlsFilter: EmbedRlsFilter
}

export interface PowerBiReport {
  id: string
  embedUrl: string
  datasetId: string
  name: string
}

export interface PowerBiGenerateTokenResult {
  token: string
  expiration: string
}

export interface EffectiveIdentity {
  username: string
  roles: string[]
  datasets: string[]
}

export interface MemberRecord {
  memberId: string
  email: string
  name?: string
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  service: string
  checks: {
    azure: boolean
    powerBi: boolean
    memberLookup: boolean
  }
}
