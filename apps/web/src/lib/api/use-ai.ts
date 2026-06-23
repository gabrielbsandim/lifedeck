import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  GeneratedListView,
  GenerationBrief,
  ListView,
  TaskView,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'
import { userListsKey } from '@/lib/api/use-lists'

export type DraftTask = { title: string; note: string | null }
export type DraftList = { title: string; tasks: DraftTask[] }

export function useGenerateList() {
  return useMutation({
    mutationFn: (brief: GenerationBrief) =>
      apiRequest<GeneratedListView>('/api/v1/lists/generate', {
        method: 'POST',
        body: JSON.stringify(brief),
      }),
  })
}

async function persistDraft(draft: DraftList): Promise<ListView> {
  const list = await apiRequest<ListView>('/api/v1/lists', {
    method: 'POST',
    body: JSON.stringify({ title: draft.title, type: 'standalone' }),
  })

  for (const task of draft.tasks) {
    const created = await apiRequest<TaskView>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ listId: list.id, title: task.title }),
    })
    const note = task.note?.trim()
    if (note) {
      await apiRequest<TaskView>(`/api/v1/tasks/${created.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ observation: note }),
      })
    }
  }

  return list
}

export function useSaveDraftList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draft: DraftList) => persistDraft(draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userListsKey })
    },
  })
}
