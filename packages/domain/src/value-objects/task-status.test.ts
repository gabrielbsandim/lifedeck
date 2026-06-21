import { describe, expect, it } from 'vitest'
import { isTaskStatus } from './task-status'

describe('isTaskStatus', () => {
  it('recognizes valid statuses', () => {
    expect(isTaskStatus('pending')).toBe(true)
    expect(isTaskStatus('completed')).toBe(true)
  })

  it('rejects unknown statuses', () => {
    expect(isTaskStatus('archived')).toBe(false)
  })
})
