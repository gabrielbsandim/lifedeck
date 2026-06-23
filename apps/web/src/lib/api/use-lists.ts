import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateListInput,
  CreateTaskInput,
  ListView,
  RenameListInput,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const userListsKey = ['user-lists'] as const
export const listKey = (id: string) => ['list', id] as const
export const listTasksKey = (id: string) => ['list-tasks', id] as const

export function useUserLists() {
  return useQuery({
    queryKey: userListsKey,
    queryFn: () => apiRequest<ListView[]>('/api/v1/lists'),
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

export function useReorderListTasks(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskIds: string[]) =>
      apiRequest<TaskView[]>(`/api/v1/lists/${id}/tasks`, {
        method: 'PATCH',
        body: JSON.stringify({ taskIds }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listTasksKey(id) })
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listTasksKey(id) })
    },
  })
}
