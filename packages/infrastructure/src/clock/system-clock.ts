import type { Clock } from '@taskin/application'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
