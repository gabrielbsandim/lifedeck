import { describe, expect, it, vi } from 'vitest'
import {
  isTransientConnectionError,
  retryOnTransientConnection,
} from '@/database/connection-retry'

describe('isTransientConnectionError', () => {
  it('matches the connection errors Neon throws on a cold wake', () => {
    expect(
      isTransientConnectionError(
        new Error('Error in PostgreSQL connection: Error { kind: Closed }'),
      ),
    ).toBe(true)
    expect(
      isTransientConnectionError(
        new Error("Can't reach database server at `ep-x.neon.tech:5432`"),
      ),
    ).toBe(true)
    expect(isTransientConnectionError('ECONNRESET')).toBe(true)
  })

  it('does not match application errors', () => {
    expect(isTransientConnectionError(new Error('Unique constraint'))).toBe(
      false,
    )
    expect(isTransientConnectionError(undefined)).toBe(false)
  })
})

describe('retryOnTransientConnection', () => {
  it('returns the result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(retryOnTransientConnection(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries a transient connection error, then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Error in PostgreSQL connection: Closed'),
      )
      .mockResolvedValue('ok')
    await expect(retryOnTransientConnection(fn, 4, 0)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('rethrows a non-transient error without retrying', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('nope'))
    await expect(retryOnTransientConnection(fn, 4, 0)).rejects.toThrow('nope')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('gives up after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('connection closed'))
    await expect(retryOnTransientConnection(fn, 3, 0)).rejects.toThrow(
      'connection closed',
    )
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
