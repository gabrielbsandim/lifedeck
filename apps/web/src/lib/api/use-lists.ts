import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CreateListInput,
  CreateTaskInput,
  ListView,
  RenameListInput,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
import { apiRequest, apiRequestPage } from '@/lib/api/client'

export const userListsKey = ['user-lists'] as const
export const listKey = (id: string) => ['list', id] as const
export const listTasksKey = (id: string) => ['list-tasks', id] as const

export function useUserLists() {
  return useInfiniteQuery({
    queryKey: userListsKey,
    queryFn: ({ pageParam }) =>
      apiRequestPage<ListView>(
        `/api/v1/lists?type=standalone${
          pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''
        }`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor,
  })
}

export function useCreateList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateListInput) =>
      apiRequest<ListView>('/api/v1/lists', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userListsKey })
    },
  })
}

export function useRenameList(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RenameListInput) =>
      apiRequest<ListView>(`/api/v1/lists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userListsKey })
      void queryClient.invalidateQueries({ queryKey: listKey(id) })
    },
  })
}

export function useDeleteList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ deleted: boolean }>(`/api/v1/lists/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userListsKey })
    },
  })
}

export function useLeaveList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ left: boolean }>(`/api/v1/lists/${id}/membership`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userListsKey })
    },
  })
}

export function useReorderListTasks(id: string) {
  const queryClient = useQueryClient()
  const key = listTasksKey(id)
  return useMutation({
    mutationFn: (taskIds: string[]) =>
      apiRequest<TaskView[]>(`/api/v1/lists/${id}/tasks`, {
        method: 'PATCH',
        body: JSON.stringify({ taskIds }),
      }),
    onMutate: async (taskIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TaskView[]>(key)
      if (previous) {
        const byId = new Map(previous.map(task => [task.id, task]))
        const reordered = taskIds
          .map(taskId => byId.get(taskId))
          .filter((task): task is TaskView => task !== undefined)
        const missing = previous.filter(task => !taskIds.includes(task.id))
        queryClient.setQueryData<TaskView[]>(key, [...reordered, ...missing])
      }
      return { previous }
    },
    onError: (_error, _taskIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useList(id: string) {
  return useQuery({
    queryKey: listKey(id),
    queryFn: () => apiRequest<ListView>(`/api/v1/lists/${id}`),
    enabled: id !== '',
  })
}

export function useListTasks(id: string) {
  return useQuery({
    queryKey: listTasksKey(id),
    queryFn: () => apiRequest<TaskView[]>(`/api/v1/lists/${id}/tasks`),
    enabled: id !== '',
    refetchInterval: 10_000,
  })
}

// Lightweight per-list task fetch used to show progress on the lists overview.
// Shares the cache key with useListTasks but does not poll, so opening the
// overview does not spin up N background intervals.
export function useListSummary(id: string) {
  return useQuery({
    queryKey: listTasksKey(id),
    queryFn: () => apiRequest<TaskView[]>(`/api/v1/lists/${id}/tasks`),
    enabled: id !== '',
    staleTime: 30_000,
  })
}

export function useCreateListTask(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      apiRequest<TaskView>('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listTasksKey(id) })
    },
  })
}

export function useUpdateListTask(id: string) {
  const queryClient = useQueryClient()
  const key = listTasksKey(id)
  return useMutation({
    mutationFn: ({
      id: taskId,
      input,
    }: {
      id: string
      input: UpdateTaskInput
    }) =>
      apiRequest<TaskView>(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onMutate: async ({ id: taskId, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TaskView[]>(key)
      if (previous) {
        queryClient.setQueryData<TaskView[]>(
          key,
          previous.map(task =>
            task.id === taskId ? { ...task, ...input } : task,
          ),
        )
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useDeleteListTask(id: string) {
  const queryClient = useQueryClient()
  const key = listTasksKey(id)
  return useMutation({
    mutationFn: (taskId: string) =>
      apiRequest<{ deleted: boolean }>(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      }),
    onMutate: async (taskId: string) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TaskView[]>(key)
      if (previous) {
        queryClient.setQueryData<TaskView[]>(
          key,
          previous.filter(task => task.id !== taskId),
        )
      }
      return { previous }
    },
    onError: (_error, _taskId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
