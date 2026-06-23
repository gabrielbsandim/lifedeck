import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateTaskInput,
  DailyBoardView,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const dailyBoardKey = (date: string) => ['daily-board', date] as const

export function useDailyBoard(date: string) {
  return useQuery({
    queryKey: dailyBoardKey(date),
    queryFn: () =>
      apiRequest<DailyBoardView>(
        `/api/v1/daily?date=${encodeURIComponent(date)}`,
      ),
    refetchInterval: 10_000,
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
      void queryClient.invalidateQueries({ queryKey: dailyBoardKey(date) })
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
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: dailyBoardKey(date) })
      const previous = queryClient.getQueryData<DailyBoardView>(
        dailyBoardKey(date),
      )
      if (previous) {
        queryClient.setQueryData<DailyBoardView>(dailyBoardKey(date), {
          ...previous,
          tasks: previous.tasks.map(task =>
            task.id === id ? { ...task, ...input } : task,
          ),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dailyBoardKey(date), context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dailyBoardKey(date) })
    },
  })
}

export function useBringTaskToToday(date: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      apiRequest<TaskView>(`/api/v1/tasks/${taskId}/carry-forward`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dailyBoardKey(date) })
    },
  })
}

export function useReorderDailyTasks(date: string, listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskIds: string[]) =>
      apiRequest<TaskView[]>(`/api/v1/lists/${listId}/tasks`, {
        method: 'PATCH',
        body: JSON.stringify({ taskIds }),
      }),
    onMutate: async (taskIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: dailyBoardKey(date) })
      const previous = queryClient.getQueryData<DailyBoardView>(
        dailyBoardKey(date),
      )
      if (previous) {
        const byId = new Map(previous.tasks.map(task => [task.id, task]))
        const reordered = taskIds
          .map(id => byId.get(id))
          .filter((task): task is TaskView => task !== undefined)
        queryClient.setQueryData<DailyBoardView>(dailyBoardKey(date), {
          ...previous,
          tasks: reordered,
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dailyBoardKey(date), context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dailyBoardKey(date) })
    },
  })
}
