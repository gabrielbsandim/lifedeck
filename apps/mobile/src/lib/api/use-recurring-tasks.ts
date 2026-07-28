// Ported verbatim from apps/web/src/lib/api/use-recurring-tasks.ts. Both apps speak the same
// `/api/v1` surface and share the request contract through @lifedeck/client, so
// only the injected transport differs (Bearer token here, cookie on the web).
// Keep the two in sync when either changes.
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CreateRecurringTaskInput,
  RecurringTaskView,
  UpdateRecurringTaskInput,
} from '@lifedeck/application'
import { apiRequest, apiRequestPage } from '@/lib/api/client'

export const recurringTasksKey = ['recurring-tasks'] as const

export function useRecurringTasks() {
  return useInfiniteQuery({
    queryKey: recurringTasksKey,
    queryFn: ({ pageParam }) =>
      apiRequestPage<RecurringTaskView>(
        `/api/v1/recurring-tasks${
          pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''
        }`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor,
  })
}

export function useCreateRecurringTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRecurringTaskInput) =>
      apiRequest<RecurringTaskView>('/api/v1/recurring-tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringTasksKey })
    },
  })
}

export function useUpdateRecurringTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateRecurringTaskInput
    }) =>
      apiRequest<RecurringTaskView>(`/api/v1/recurring-tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringTasksKey })
    },
  })
}

export function useDeleteRecurringTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ deleted: boolean }>(`/api/v1/recurring-tasks/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringTasksKey })
    },
  })
}
