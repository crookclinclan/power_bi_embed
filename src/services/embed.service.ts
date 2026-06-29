import { assertEmbedConfig } from '../config/env.js'
import type { EmbedTokenResponse } from '../domain/types.js'
import { resolveMember } from './member-lookup.service.js'
import { createEmbedSession } from './powerbi.service.js'

export async function issueEmbedToken(
  memberId: string,
  email?: string,
): Promise<EmbedTokenResponse> {
  assertEmbedConfig()

  const member = await resolveMember(memberId, email)

  return createEmbedSession(member)
}
