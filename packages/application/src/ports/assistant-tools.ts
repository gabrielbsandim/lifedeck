export type AssistantTaskSummary = {
  id: string
  title: string
  status: string
}

export type AssistantEventSummary = {
  id: string
  title: string
  startsAt: string
  endsAt: string
}

export type AssistantListSummary = {
  id: string
  title: string
}

export type AssistantEventInput = {
  title: string
  startsAt: string
  endsAt: string
  description?: string | null
  location?: string | null
  allDay?: boolean
  reminders?: number[]
}

export type AssistantEventUpdate = {
  title?: string
  startsAt?: string
  endsAt?: string
  description?: string | null
  location?: string | null
  allDay?: boolean
  reminders?: number[]
}

// The surface the WhatsApp assistant can act on. Every mutation references an
// entity by id, so the reads (getToday/getAgenda/getLists) return ids the model
// can thread into the mutations. Implementations delegate to the same use cases
// the REST API uses, so tenant/ownership checks are enforced identically.
export interface AssistantTools {
  // Reads
  getToday(userId: string): Promise<{ tasks: AssistantTaskSummary[] }>
  getLists(userId: string): Promise<{ lists: AssistantListSummary[] }>
  getAgenda(userId: string): Promise<{ events: AssistantEventSummary[] }>

  // Tasks
  addTask(
    userId: string,
    input: { title: string; listId?: string },
  ): Promise<{ id: string; added: boolean }>
  completeTask(userId: string, taskId: string): Promise<{ ok: boolean }>
  reopenTask(userId: string, taskId: string): Promise<{ ok: boolean }>
  renameTask(
    userId: string,
    taskId: string,
    title: string,
  ): Promise<{ ok: boolean }>
  deleteTask(userId: string, taskId: string): Promise<{ ok: boolean }>
  moveTaskToToday(userId: string, taskId: string): Promise<{ ok: boolean }>

  // Lists
  createList(userId: string, title: string): Promise<{ id: string }>

  // Subtasks
  addSubtask(
    userId: string,
    taskId: string,
    title: string,
  ): Promise<{ id: string }>
  completeSubtask(userId: string, subtaskId: string): Promise<{ ok: boolean }>

  // Calendar
  addEvent(
    userId: string,
    input: AssistantEventInput,
  ): Promise<{ id: string; added: boolean }>
  updateEvent(
    userId: string,
    eventId: string,
    input: AssistantEventUpdate,
  ): Promise<{ ok: boolean }>
  deleteEvent(userId: string, eventId: string): Promise<{ ok: boolean }>
}
