import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GuestSignInInput, UserView } from '@lifedeck/application'
import { ApiError, apiRequest } from '@/lib/api/client'
import { createGuestSession } from '@/lib/api/sessions'

export const sessionKey = ['session'] as const

export type ClientFeatures = {
  calendar: boolean
  whatsapp: boolean
  billing: boolean
}

export type SessionUser = UserView & {
  features?: ClientFeatures
  country?: string | null
}

// Mirrors the web useSession: a null result means "no active session" (401),
// anything else is the authenticated user.
export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: sessionKey,
    queryFn: async () => {
      try {
        return await apiRequest<SessionUser>('/sessions/me')
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
    mutationFn: (input: GuestSignInInput) => createGuestSession(input),
    onSuccess: user => {
      queryClient.setQueryData(sessionKey, user)
    },
  })
}
