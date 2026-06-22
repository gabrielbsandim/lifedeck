import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateShareLinkInput, ShareLinkView } from '@taskin/application'
import { apiRequest } from '@/lib/api/client'

export const shareLinksKey = (listId: string) =>
  ['share-links', listId] as const

export function useShareLinks(listId: string) {
  return useQuery({
    queryKey: shareLinksKey(listId),
    queryFn: () => apiRequest<ShareLinkView[]>(`/api/v1/lists/${listId}/share`),
  })
}

export function useCreateShareLink(listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateShareLinkInput) =>
      apiRequest<ShareLinkView>(`/api/v1/lists/${listId}/share`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareLinksKey(listId) })
    },
  })
}

export function useRevokeShareLink(listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) =>
      apiRequest<{ revoked: boolean }>(
        `/api/v1/lists/${listId}/share/${linkId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareLinksKey(listId) })
    },
  })
}
