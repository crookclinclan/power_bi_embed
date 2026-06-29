import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_AGE_MS = 5 * 60 * 1000

export function signMemberRequest(memberId: string, ts: number, secret: string): string {
  return createHmac('sha256', secret).update(`${memberId}:${ts}`).digest('hex')
}

export function verifyMemberRequest(
  memberId: string,
  ts: number,
  sig: string,
  secret: string,
): boolean {
  if (!memberId || !ts || !sig || !secret) return false
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) return false

  const expected = signMemberRequest(memberId, ts, secret)
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
