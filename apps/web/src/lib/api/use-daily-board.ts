import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateTaskInput,
  DailyBoardView,
  TaskView,
  UpdateTaskInput,
} from '@taskin/application'
import { apiRequest } from '@/lib/api/client'

export const dailyBoardKey = (date: string) => ['daily-board', date] as const

export function useDailyBoard(date: string) {
  return useQuery({
    queryKey: dailyBoardKey(date),
    queryFn: () =>
      apiRequest<DailyBoardView>(
        `/api/v1/daily?date=${encodeURIComponent(date)}`,
      ),
  })
}

export function useCreateTask(date: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      apiRequest<TaskView>('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyBoardKey(date) })
    },
  })
}

export function useUpdateTask(date: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      apiRequest<TaskView>(`/api/v1/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyBoardKey(date) })
    },
  })
}
