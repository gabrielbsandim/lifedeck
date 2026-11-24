import { asEntityId } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { SessionRevocationStore } from '@/ports/session-revocation-store'

type Dependencies = {
  sessions: SessionRevocationStore
  clock: Clock
}

export function makeRevokeSessions({ sessions, clock }: Dependencies) {
  return async function revokeSessions(userId: string): Promise<Date> {
    const at = clock.now()
    await sessions.revokeAll(asEntityId(userId), at)
    return at
  }
}
