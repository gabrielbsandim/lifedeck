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
