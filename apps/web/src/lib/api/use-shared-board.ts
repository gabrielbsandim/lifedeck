import { useQuery } from '@tanstack/react-query'
import type { SharedBoardView } from '@taskin/application'
import { apiRequest } from '@/lib/api/client'

export const sharedBoardKey = (token: string) =>
  ['shared-board', token] as const

export function useSharedBoard(token: string) {
  return useQuery({
    queryKey: sharedBoardKey(token),
    queryFn: () =>
      apiRequest<SharedBoardView>(
        `/api/v1/shared/${encodeURIComponent(token)}`,
      ),
    retry: false,
  })
}
