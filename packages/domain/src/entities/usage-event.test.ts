import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'
import { UsageEvent } from '@/entities/usage-event'

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const NOW = new Date('2026-06-24T10:00:00.000Z')

function build(credits = 1): UsageEvent {
  return UsageEvent.create({
    id: asEntityId(ID),
    userId: asEntityId(USER_ID),
    operation: 'listGeneration',
    credits,
    now: NOW,
  })
}

describe('UsageEvent', () => {
  it('records the operation, credits, and timestamp', () => {
    const event = build(6)
    const props = event.toJSON()
    expect(event.id).toBe(ID)
    expect(event.userId).toBe(USER_ID)
    expect(event.operation).toBe('listGeneration')
    expect(event.credits).toBe(6)
    expect(props.createdAt).toEqual(NOW)
  })

  it('rejects a non-positive credit amount', () => {
    expect(() => build(0)).toThrow(ValidationError)
    expect(() => build(-2)).toThrow(ValidationError)
  })

  it('restores from persisted props', () => {
    const event = build()
    expect(UsageEvent.restore(event.toJSON()).toJSON()).toEqual(event.toJSON())
  })
})
