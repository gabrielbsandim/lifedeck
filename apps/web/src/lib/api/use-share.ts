import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateShareLinkInput,
  MemberView,
  ShareLinkView,
} from '@taskin/application'
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

export const membersKey = (listId: string) => ['members', listId] as const

export function useMembers(listId: string, enabled = true) {
  return useQuery({
    queryKey: membersKey(listId),
    queryFn: () => apiRequest<MemberView[]>(`/api/v1/lists/${listId}/members`),
    enabled,
  })
}

export function useRemoveMember(listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest<{ removed: boolean }>(
        `/api/v1/lists/${listId}/members/${userId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(listId) })
    },
  })
}
