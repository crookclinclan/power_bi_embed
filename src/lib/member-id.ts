const MEMBER_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

export function isValidMemberId(raw: string): boolean {
  return MEMBER_ID_RE.test(raw)
}
