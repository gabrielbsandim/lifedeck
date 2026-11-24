import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@lifedeck/client'
import {
  INLINE_ERROR,
  classifyMutationError,
  createAppQueryClient,
} from '@/lib/api/mutation-feedback'

describe('classifyMutationError', () => {
  it('reports offline before anything else', () => {
    expect(classifyMutationError(new ApiError(500, 'X', 'x'), false)).toBe(
      'offline',
    )
  })

  it('treats a request that never reached the server as offline', () => {
    expect(classifyMutationError(new TypeError('Failed to fetch'), true)).toBe(
      'offline',
    )
  })

  it.each([
    [401, 'sessionEnded'],
    [429, 'tooMany'],
    [500, 'saveFailed'],
    [422, 'saveFailed'],
  ] as const)('maps HTTP %i to %s', (status, failure) => {
    expect(classifyMutationError(new ApiError(status, 'X', 'x'), true)).toBe(
      failure,
    )
  })

  it('falls back to a generic failure for an unknown error', () => {
    expect(classifyMutationError(new Error('boom'), true)).toBe('saveFailed')
  })

  it('reads the browser connection state by default', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    expect(classifyMutationError(new Error('boom'))).toBe('offline')

    vi.restoreAllMocks()
  })
})

describe('createAppQueryClient', () => {
  async function failWith(meta?: { inlineError?: boolean }) {
    const onFailure = vi.fn()
    const client = createAppQueryClient(onFailure)
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(new ApiError(500, 'X', 'boom')),
      meta,
    })
    await mutation.execute(undefined).catch(() => undefined)
    return onFailure
  }

  it('reports a failed mutation to the global handler', async () => {
    expect(await failWith()).toHaveBeenCalledWith('saveFailed')
  })

  it('stays quiet when the screen shows the error inline', async () => {
    expect(await failWith(INLINE_ERROR)).not.toHaveBeenCalled()
  })
})
