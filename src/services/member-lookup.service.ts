import { google } from 'googleapis'
import { env, parseMembersMap } from '../config/env.js'
import { NotFoundError, ServiceUnavailableError } from '../domain/errors.js'
import type { EmbedRlsFilter, MemberRecord, ResolvedMember } from '../domain/types.js'
import { logger } from '../lib/logger.js'

const staticMap = parseMembersMap()

interface MemberCache {
  byMemberId: Map<string, MemberRecord>
  byEmail: Map<string, MemberRecord>
}

let sheetsCache: MemberCache | null = null
let sheetsCacheAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

function normalizeMemberId(raw: string): string {
  return String(raw).trim()
}

function normalizeEmail(raw: string): string {
  return String(raw).trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function quoteSheetTab(title: string): string {
  const escaped = title.replace(/'/g, "''")
  return `'${escaped}'`
}

function columnLettersToIndex(letters: string): number {
  let index = 0
  for (const ch of letters.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64)
  }
  return index - 1
}

function readMemberIdFromRow(row: string[], headers: string[]): string {
  const memberIdx = headers.findIndex((h) =>
    new RegExp(env.sheets.memberIdHeader, 'i').test(h),
  )
  const memberIdColRa =
    memberIdx >= 0 ? memberIdx : columnLettersToIndex(env.sheets.memberIdColumn)
  const memberIdColAa = columnLettersToIndex(env.sheets.memberIdAaColumn)

  const fromAa = normalizeMemberId(String(row[memberIdColAa] ?? ''))
  const fromRa = normalizeMemberId(String(row[memberIdColRa] ?? ''))
  return fromAa || fromRa
}

function upsertRecord(cache: MemberCache, record: MemberRecord): void {
  let merged = record

  if (record.memberId) {
    const existing = cache.byMemberId.get(record.memberId)
    merged = {
      memberId: record.memberId,
      email: record.email || existing?.email || '',
    }
    cache.byMemberId.set(record.memberId, merged)
  }

  if (merged.email && isValidEmail(merged.email) && !cache.byEmail.has(merged.email)) {
    cache.byEmail.set(merged.email, merged)
  }
}

function ingestRows(rows: string[][], cache: MemberCache): void {
  if (!rows.length) return

  const headers = rows[0].map((h) => String(h ?? '').trim())
  const emailIdx = headers.findIndex(
    (h) => h === env.sheets.emailHeader || /enter your email/i.test(h),
  )

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? []
    const memberId = readMemberIdFromRow(row, headers)
    const rawEmail = emailIdx >= 0 ? normalizeEmail(String(row[emailIdx] ?? '')) : ''
    const email = isValidEmail(rawEmail) ? rawEmail : ''

    if (!memberId && !email) continue

    upsertRecord(cache, { memberId, email })
  }
}

function buildStaticCache(): MemberCache {
  const cache: MemberCache = {
    byMemberId: new Map(),
    byEmail: new Map(),
  }

  for (const [memberId, email] of staticMap) {
    upsertRecord(cache, {
      memberId: String(memberId).trim(),
      email: String(email).trim().toLowerCase(),
    })
  }

  return cache
}

async function loadFromGoogleSheets(): Promise<MemberCache> {
  const {
    spreadsheetId,
    membersRange,
    tabPrefix,
    columnRange,
    serviceAccountJson,
  } = env.sheets

  if (!serviceAccountJson) {
    throw new ServiceUnavailableError(
      'Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or MEMBERS_MAP_JSON',
    )
  }

  let credentials: Record<string, unknown>
  try {
    credentials = JSON.parse(serviceAccountJson) as Record<string, unknown>
  } catch {
    throw new ServiceUnavailableError('GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  const cache: MemberCache = {
    byMemberId: new Map(),
    byEmail: new Map(),
  }

  if (membersRange) {
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: membersRange,
    })
    ingestRows(data.values ?? [], cache)
    logger.info('Loaded members from Google Sheets', {
      range: membersRange,
      memberIds: cache.byMemberId.size,
      emails: cache.byEmail.size,
    })
    return cache
  }

  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const tabTitles =
    meta.data.sheets
      ?.map((s) => s.properties?.title ?? '')
      .filter((title) => title.startsWith(tabPrefix)) ?? []

  if (!tabTitles.length) {
    throw new ServiceUnavailableError(
      `No sheet tabs found with prefix "${tabPrefix}"`,
    )
  }

  const ranges = tabTitles.map((title) => `${quoteSheetTab(title)}!${columnRange}`)
  const { data } = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  })

  for (const block of data.valueRanges ?? []) {
    ingestRows(block.values ?? [], cache)
  }

  logger.info('Loaded members from Google Sheets', {
    tabs: tabTitles.length,
    memberIds: cache.byMemberId.size,
    emails: cache.byEmail.size,
  })

  return cache
}

async function getMemberCache(): Promise<MemberCache> {
  if (Date.now() - sheetsCacheAt < CACHE_TTL_MS && sheetsCache) {
    return sheetsCache
  }

  if (env.sheets.serviceAccountJson) {
    sheetsCache = await loadFromGoogleSheets()
    sheetsCacheAt = Date.now()
    return sheetsCache
  }

  if (staticMap.size > 0) {
    return buildStaticCache()
  }

  throw new ServiceUnavailableError(
    'Member lookup is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or MEMBERS_MAP_JSON',
  )
}

function memberIdRlsFilter(): EmbedRlsFilter {
  return {
    table: env.powerBi.filterTable,
    column: env.powerBi.filterColumn,
  }
}

function emailRlsFilter(): EmbedRlsFilter {
  return {
    table: env.powerBi.filterTable,
    column: env.powerBi.filterEmailColumn,
  }
}

function toResolvedMember(record: MemberRecord, matchedByEmail: boolean): ResolvedMember {
  if (record.memberId) {
    return {
      memberId: record.memberId,
      email: record.email,
      rlsUsername: record.memberId,
      rlsFilter: memberIdRlsFilter(),
    }
  }

  if (matchedByEmail && record.email) {
    return {
      memberId: '',
      email: record.email,
      rlsUsername: record.email,
      rlsFilter: emailRlsFilter(),
    }
  }

  throw new ServiceUnavailableError('Member record is missing member_id and email')
}

/**
 * Resolves a Kajabi user against Sheets (or dev map).
 * Tries member_id first, then email fallback for transitional access.
 */
export async function resolveMember(
  kajabiMemberId: string,
  kajabiEmail?: string,
): Promise<ResolvedMember> {
  const id = normalizeMemberId(kajabiMemberId)
  if (!id) {
    throw new NotFoundError('member_id is required')
  }

  const cache = await getMemberCache()
  const byId = cache.byMemberId.get(id)
  if (byId) {
    if (byId.email && !isValidEmail(byId.email)) {
      throw new ServiceUnavailableError('Member email configuration is invalid')
    }
    return toResolvedMember(byId, false)
  }

  const email = normalizeEmail(kajabiEmail ?? '')
  if (email && isValidEmail(email)) {
    const byEmail = cache.byEmail.get(email)
    if (byEmail) {
      logger.info('Member resolved via email fallback', { kajabiMemberId: id, email })
      return toResolvedMember(byEmail, true)
    }
  }

  logger.warn('Unknown member', { memberId: id, hasEmail: Boolean(email) })
  throw new NotFoundError('Member not found or not authorized')
}

/** Config present (fast — for liveness / deploy health checks). */
export function hasMemberLookupConfig(): boolean {
  if (staticMap.size > 0) return true
  if (!env.sheets.serviceAccountJson || !env.sheets.spreadsheetId) return false
  try {
    JSON.parse(env.sheets.serviceAccountJson)
    return true
  } catch {
    return false
  }
}

/** Loads Sheets and verifies access (slow — not used for Render liveness). */
export async function isMemberLookupReady(): Promise<boolean> {
  if (!hasMemberLookupConfig()) return false
  if (staticMap.size > 0) return true
  try {
    await getMemberCache()
    return true
  } catch {
    return false
  }
}

export function clearMemberCache(): void {
  sheetsCache = null
  sheetsCacheAt = 0
}
