import { ValidationError } from '@/shared/domain-error'

export const guard = {
  notEmpty(value: string, field: string): string {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      throw new ValidationError(`${field} must not be empty.`)
    }
    return trimmed
  },

  maxLength(value: string, max: number, field: string): string {
    if (value.length > max) {
      throw new ValidationError(`${field} must be at most ${max} characters.`)
    }
    return value
  },

  oneOf<T extends string>(
    value: string,
    allowed: readonly T[],
    field: string,
  ): T {
    if (!allowed.includes(value as T)) {
      throw new ValidationError(
        `${field} must be one of: ${allowed.join(', ')}.`,
      )
    }
    return value as T
  },
}
