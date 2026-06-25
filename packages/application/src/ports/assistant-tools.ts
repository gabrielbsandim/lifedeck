export type AssistantTaskSummary = {
  title: string
  status: string
}

export type AssistantEventSummary = {
  title: string
  startsAt: string
}

export interface AssistantTools {
  getToday(userId: string): Promise<{ tasks: AssistantTaskSummary[] }>
  addTask(userId: string, title: string): Promise<{ added: boolean }>
  getAgenda(userId: string): Promise<{ events: AssistantEventSummary[] }>
  addEvent(
    userId: string,
    input: { title: string; startsAt: string; endsAt: string },
  ): Promise<{ added: boolean }>
}
