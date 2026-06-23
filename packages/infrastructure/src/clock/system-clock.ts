import type { Clock } from '@lifedeck/application'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
