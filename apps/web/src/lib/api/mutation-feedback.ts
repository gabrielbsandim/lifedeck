import { MutationCache, QueryClient } from '@tanstack/react-query'
import type { Messages } from '@lifedeck/i18n'
import { ApiError } from '@/lib/api/client'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { inlineError?: boolean }
  }
}

// For a screen that already renders its own error next to the form, so the
// global toast does not say the same thing twice.
export const INLINE_ERROR = { inlineError: true } as const

export type MutationFailure = keyof Pick<
  Messages['common'],
  'saveFailed' | 'offline' | 'sessionEnded' | 'tooMany'
>

const FAILURE_BY_STATUS: Record<number, MutationFailure> = {
  401: 'sessionEnded',
  429: 'tooMany',
}

function browserOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export function classifyMutationError(
  error: unknown,
  online = browserOnline(),
): MutationFailure {
  if (!online) {
    return 'offline'
  }
  if (error instanceof ApiError) {
    return FAILURE_BY_STATUS[error.status] ?? 'saveFailed'
  }
  // fetch rejects with a TypeError when the request never reached the server.
  return error instanceof TypeError ? 'offline' : 'saveFailed'
}

export function createAppQueryClient(
  onMutationFailure: (failure: MutationFailure) => void,
): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.inlineError) {
          return
        }
        onMutationFailure(classifyMutationError(error))
      },
    }),
  })
}
