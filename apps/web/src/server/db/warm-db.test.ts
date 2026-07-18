import { describe, expect, it, vi } from 'vitest'
import { isTransientDbError, withDbRetry } from '@/server/db/warm-db'

describe('isTransientDbError', () => {
  it('matches known transient connection errors', () => {
    expect(
      isTransientDbError(new Error('Connection terminated unexpectedly')),
    ).toBe(true)
    expect(
      isTransientDbError(
        new Error("Can't reach database server at `ep-x.neon.tech:5432`"),
      ),
    ).toBe(true)
    expect(isTransientDbError('ECONNRESET while querying')).toBe(true)
  })

  it('does not match application errors', () => {
    expect(isTransientDbError(new Error('Unique constraint failed'))).toBe(
      false,
    )
    expect(isTransientDbError(undefined)).toBe(false)
  })
})

describe('withDbRetry', () => {
  it('returns the result on the first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(withDbRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries a transient failure and then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))
      .mockResolvedValue('ok')
    await expect(withDbRetry(fn, 5, 0)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('rethrows a non-transient error without retrying', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(withDbRetry(fn, 5, 0)).rejects.toThrow('boom')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('gives up after exhausting attempts on a persistent transient error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new Error('Connection terminated unexpectedly'))
    await expect(withDbRetry(fn, 3, 0)).rejects.toThrow('Connection terminated')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
