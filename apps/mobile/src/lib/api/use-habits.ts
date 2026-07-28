// Ported verbatim from apps/web/src/lib/api/use-habits.ts. Both apps speak the same
// `/api/v1` surface and share the request contract through @lifedeck/client, so
// only the injected transport differs (Bearer token here, cookie on the web).
// Keep the two in sync when either changes.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateHabitInput,
  HabitView,
  LogHabitInput,
  UpdateHabitInput,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const habitsKey = ['habits'] as const

export function useHabits() {
  return useQuery({
    queryKey: habitsKey,
    queryFn: () => apiRequest<HabitView[]>('/api/v1/habits'),
  })
}

export function useCreateHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHabitInput) =>
      apiRequest<HabitView>('/api/v1/habits', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKey })
    },
  })
}

export function useUpdateHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateHabitInput }) =>
      apiRequest<HabitView>(`/api/v1/habits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKey })
    },
  })
}

export function useDeleteHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ deleted: boolean }>(`/api/v1/habits/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKey })
    },
  })
}

export function useLogHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: LogHabitInput }) =>
      apiRequest<HabitView>(`/api/v1/habits/${id}/logs`, {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKey })
    },
  })
}
