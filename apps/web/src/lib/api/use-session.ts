import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GuestSignInInput, UserView } from '@lifedeck/application'
import { ApiError, apiRequest } from '@/lib/api/client'

export const sessionKey = ['session'] as const

export type ClientFeatures = {
  calendar: boolean
  whatsapp: boolean
  billing: boolean
}

export type SessionUser = UserView & { features?: ClientFeatures }

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: sessionKey,
    queryFn: async () => {
      try {
        return await apiRequest<SessionUser>('/api/v1/sessions/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null
        }
        throw error
      }
    },
    retry: false,
  })
}

export function useCreateGuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GuestSignInInput) =>
      apiRequest<UserView>('/api/v1/sessions/guest', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: user => {
      queryClient.setQueryData(sessionKey, user)
    },
  })
}
