import { randomBytes } from 'node:crypto'
import type { EmbedTokenResponse } from '../domain/types.js'

const TTL_MS = 90_000

interface HandoffEntry {
  session: EmbedTokenResponse
  expiresAt: number
}

const store = new Map<string, HandoffEntry>()

function purgeExpired(): void {
  const now = Date.now()
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id)
  }
}

export function createHandoff(session: EmbedTokenResponse): string {
  purgeExpired()
  const id = randomBytes(24).toString('hex')
  store.set(id, { session, expiresAt: Date.now() + TTL_MS })
  return id
}

export function consumeHandoff(id: string): EmbedTokenResponse | null {
  purgeExpired()
  const key = id.trim()
  if (!/^[a-f0-9]{48}$/i.test(key)) return null

  const entry = store.get(key)
  if (!entry || entry.expiresAt <= Date.now()) {
    store.delete(key)
    return null
  }

  store.delete(key)
  return entry.session
}
