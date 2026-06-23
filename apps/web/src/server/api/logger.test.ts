// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { log } from '@/server/api/logger'

describe('log', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits a structured JSON line at the given level', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('error', 'boom', { code: 'X' })
    expect(error).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(error.mock.calls[0]![0] as string)
    expect(payload).toMatchObject({
      level: 'error',
      message: 'boom',
      code: 'X',
    })
    expect(typeof payload.time).toBe('string')
  })

  it('routes warn and info to the matching console method', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    log('warn', 'careful')
    log('info', 'fyi')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledTimes(1)
  })
})
