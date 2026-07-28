// Ported verbatim from apps/web/src/lib/api/use-api-keys.ts. Both apps speak the same
// `/api/v1` surface and share the request contract through @lifedeck/client, so
// only the injected transport differs (Bearer token here, cookie on the web).
// Keep the two in sync when either changes.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ApiKeyView,
  CreateApiKeyInput,
  CreatedApiKeyView,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const apiKeysKey = ['api-keys'] as const

export function useApiKeys() {
  return useQuery({
    queryKey: apiKeysKey,
    queryFn: () => apiRequest<ApiKeyView[]>('/api/v1/api-keys'),
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateApiKeyInput) =>
      apiRequest<CreatedApiKeyView>('/api/v1/api-keys', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeysKey })
    },
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ revoked: boolean }>(`/api/v1/api-keys/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeysKey })
    },
  })
}
