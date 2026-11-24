// Mirrors the web onboarding modal: it opens only while something is left to
// connect that the user can act on now, so it stops showing once set up on any
// device. A free user's calendar is an upsell, not a step.
export type GetStartedState = {
  registered: boolean
  dismissed: boolean
  calendarFeature: boolean
  calendarEntitled: boolean
  calendarConnected: boolean | undefined
  whatsappFeature: boolean
  whatsappLinked: boolean | undefined
}

export function getStartedOpen(state: GetStartedState): boolean {
  if (!state.registered || state.dismissed) {
    return false
  }
  const calendarRelevant = state.calendarFeature && state.calendarEntitled
  const calendarReady =
    !calendarRelevant || state.calendarConnected !== undefined
  const whatsappReady =
    !state.whatsappFeature || state.whatsappLinked !== undefined
  if (!calendarReady || !whatsappReady) {
    return false
  }
  const calendarPending = calendarRelevant && state.calendarConnected === false
  const whatsappPending =
    state.whatsappFeature && state.whatsappLinked === false
  return calendarPending || whatsappPending
}
