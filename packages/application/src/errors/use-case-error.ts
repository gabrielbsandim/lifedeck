export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND'

  constructor(resource: string) {
    super(`${resource} was not found.`)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN'

  constructor(resource: string) {
    super(`You are not allowed to modify this ${resource}.`)
    this.name = 'ForbiddenError'
  }
}

// Raised when the user sends voice/image but no multimodal model is configured
// (no GEMINI_API_KEY). We surface this loudly instead of feeding a placeholder
// like "[voice message received]" to the assistant, which read as a silent bug.
export class MediaUnderstandingUnavailableError extends Error {
  readonly code = 'MEDIA_UNAVAILABLE'

  constructor(readonly kind: 'audio' | 'image') {
    super(`No model is configured to understand ${kind} messages.`)
    this.name = 'MediaUnderstandingUnavailableError'
  }
}

export class QuotaExceededError extends Error {
  readonly code = 'QUOTA_EXCEEDED'

  constructor(
    readonly window: 'fiveHour' | 'weekly',
    readonly limit: number,
    readonly used: number,
  ) {
    super(
      `AI usage limit reached for the ${
        window === 'fiveHour' ? '5-hour' : 'weekly'
      } window.`,
    )
    this.name = 'QuotaExceededError'
  }
}

// The bookings_no_overlap exclusion constraint fired: another booking took
// the slot between the slot check and the insert.
export class SlotTakenError extends Error {
  readonly code = 'SLOT_TAKEN'

  constructor() {
    super('That time was just booked. Pick another slot.')
    this.name = 'SlotTakenError'
  }
}

export class InvalidIdentityTokenError extends Error {
  readonly code = 'UNAUTHORIZED'

  constructor() {
    super('The sign-in token is invalid.')
    this.name = 'InvalidIdentityTokenError'
  }
}
