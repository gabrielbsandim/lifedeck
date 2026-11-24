import { asEntityId, planGrants } from '@lifedeck/domain'
import type { BookingTrialView } from '@/dtos/booking-dto'
import type { Clock } from '@/ports/clock'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { FeatureTrialRepository } from '@/ports/feature-trial-repository'

export const BOOKING_TRIAL_DAYS = 14
const DAY_MS = 24 * 60 * 60_000

type Dependencies = {
  trials: FeatureTrialRepository
  entitlements: EntitlementService
  clock: Clock
}

export function makeGetBookingTrial({
  trials,
  entitlements,
  clock,
}: Dependencies) {
  return async function getBookingTrial(
    userId: string,
  ): Promise<BookingTrialView> {
    const [{ plan }, started] = await Promise.all([
      entitlements.for(userId),
      trials.listByUser(asEntityId(userId)),
    ])
    const trial = started.find(item => item.entitlement === 'booking')
    if (trial) {
      return {
        available: false,
        active: trial.endsAt > clock.now(),
        endsAt: trial.endsAt.toISOString(),
      }
    }
    return {
      available: !planGrants(plan, 'booking'),
      active: false,
      endsAt: null,
    }
  }
}

/** Starts the one free trial; a second call, or a paying user, changes nothing. */
export function makeStartBookingTrial(deps: Dependencies) {
  const getBookingTrial = makeGetBookingTrial(deps)
  return async function startBookingTrial(
    userId: string,
  ): Promise<BookingTrialView> {
    const current = await getBookingTrial(userId)
    if (!current.available) {
      return current
    }
    const now = deps.clock.now()
    await deps.trials.start(asEntityId(userId), {
      entitlement: 'booking',
      startedAt: now,
      endsAt: new Date(now.getTime() + BOOKING_TRIAL_DAYS * DAY_MS),
    })
    return getBookingTrial(userId)
  }
}
