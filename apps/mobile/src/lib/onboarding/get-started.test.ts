import { describe, expect, it } from 'vitest'
import {
  getStartedOpen,
  type GetStartedState,
} from '@/lib/onboarding/get-started'

const fresh: GetStartedState = {
  registered: true,
  dismissed: false,
  calendarFeature: true,
  calendarEntitled: true,
  calendarConnected: false,
  whatsappFeature: true,
  whatsappLinked: false,
}

describe('getStartedOpen', () => {
  it('opens for a new account with nothing connected', () => {
    expect(getStartedOpen(fresh)).toBe(true)
  })

  it('never opens for a guest or after a dismissal', () => {
    expect(getStartedOpen({ ...fresh, registered: false })).toBe(false)
    expect(getStartedOpen({ ...fresh, dismissed: true })).toBe(false)
  })

  it('waits for the status queries so it never flashes open', () => {
    expect(getStartedOpen({ ...fresh, calendarConnected: undefined })).toBe(
      false,
    )
    expect(getStartedOpen({ ...fresh, whatsappLinked: undefined })).toBe(false)
  })

  it('closes once everything the user can act on is connected', () => {
    expect(
      getStartedOpen({
        ...fresh,
        calendarConnected: true,
        whatsappLinked: true,
      }),
    ).toBe(false)
  })

  it('treats a free calendar as an upsell, not a pending step', () => {
    expect(
      getStartedOpen({
        ...fresh,
        calendarEntitled: false,
        calendarConnected: undefined,
        whatsappLinked: true,
      }),
    ).toBe(false)
    expect(
      getStartedOpen({
        ...fresh,
        calendarEntitled: false,
        calendarConnected: undefined,
      }),
    ).toBe(true)
  })

  it('ignores channels whose feature is off', () => {
    expect(
      getStartedOpen({
        ...fresh,
        calendarFeature: false,
        whatsappFeature: false,
        calendarConnected: undefined,
        whatsappLinked: undefined,
      }),
    ).toBe(false)
  })
})
