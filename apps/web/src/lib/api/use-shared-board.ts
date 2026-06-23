import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateTaskInput,
  MemberView,
  SharedBoardView,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
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
    refetchInterval: 10_000,
  })
}

export function useJoinSharedList(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<MemberView>(
        `/api/v1/shared/${encodeURIComponent(token)}/join`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedBoardKey(token) })
    },
  })
}

export function useSharedCreateTask(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      apiRequest<TaskView>('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedBoardKey(token) })
    },
  })
}

export function useSharedUpdateTask(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      apiRequest<TaskView>(`/api/v1/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedBoardKey(token) })
    },
  })
}
