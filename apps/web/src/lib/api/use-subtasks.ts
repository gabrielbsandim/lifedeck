import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import type {
  CreateSubtaskInput,
  SubtaskView,
  UpdateSubtaskInput,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const subtasksKey = (taskId: string) => ['subtasks', taskId] as const

export function useSubtasks(taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: subtasksKey(taskId),
    queryFn: () =>
      apiRequest<SubtaskView[]>(`/api/v1/tasks/${taskId}/subtasks`),
    enabled,
  })
}

function useBoardInvalidation(taskId: string, boardKey: QueryKey) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: subtasksKey(taskId) })
    void queryClient.invalidateQueries({ queryKey: boardKey })
  }
}

export function useCreateSubtask(taskId: string, boardKey: QueryKey) {
  const invalidate = useBoardInvalidation(taskId, boardKey)
  return useMutation({
    mutationFn: (input: CreateSubtaskInput) =>
      apiRequest<SubtaskView>(`/api/v1/tasks/${taskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSettled: invalidate,
  })
}

export function useUpdateSubtask(taskId: string, boardKey: QueryKey) {
  const queryClient = useQueryClient()
  const invalidate = useBoardInvalidation(taskId, boardKey)
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubtaskInput }) =>
      apiRequest<SubtaskView>(`/api/v1/subtasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: subtasksKey(taskId) })
      const previous = queryClient.getQueryData<SubtaskView[]>(
        subtasksKey(taskId),
      )
      if (previous) {
        queryClient.setQueryData<SubtaskView[]>(
          subtasksKey(taskId),
          previous.map(subtask =>
            subtask.id === id ? { ...subtask, ...input } : subtask,
          ),
        )
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(subtasksKey(taskId), context.previous)
      }
    },
    onSettled: invalidate,
  })
}

export function useDeleteSubtask(taskId: string, boardKey: QueryKey) {
  const queryClient = useQueryClient()
  const invalidate = useBoardInvalidation(taskId, boardKey)
  return useMutation({
    mutationFn: (subtaskId: string) =>
      apiRequest<{ deleted: boolean }>(`/api/v1/subtasks/${subtaskId}`, {
        method: 'DELETE',
      }),
    onMutate: async (subtaskId: string) => {
      await queryClient.cancelQueries({ queryKey: subtasksKey(taskId) })
      const previous = queryClient.getQueryData<SubtaskView[]>(
        subtasksKey(taskId),
      )
      if (previous) {
        queryClient.setQueryData<SubtaskView[]>(
          subtasksKey(taskId),
          previous.filter(subtask => subtask.id !== subtaskId),
        )
      }
      return { previous }
    },
    onError: (_error, _subtaskId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(subtasksKey(taskId), context.previous)
      }
    },
    onSettled: invalidate,
  })
}

export function useReorderSubtasks(taskId: string, boardKey: QueryKey) {
  const queryClient = useQueryClient()
  const invalidate = useBoardInvalidation(taskId, boardKey)
  return useMutation({
    mutationFn: (subtaskIds: string[]) =>
      apiRequest<SubtaskView[]>(`/api/v1/tasks/${taskId}/subtasks`, {
        method: 'PATCH',
        body: JSON.stringify({ subtaskIds }),
      }),
    onMutate: async (subtaskIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: subtasksKey(taskId) })
      const previous = queryClient.getQueryData<SubtaskView[]>(
        subtasksKey(taskId),
      )
      if (previous) {
        const byId = new Map(previous.map(subtask => [subtask.id, subtask]))
        const reordered = subtaskIds
          .map(id => byId.get(id))
          .filter((subtask): subtask is SubtaskView => subtask !== undefined)
        queryClient.setQueryData<SubtaskView[]>(subtasksKey(taskId), reordered)
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(subtasksKey(taskId), context.previous)
      }
    },
    onSettled: invalidate,
  })
}
