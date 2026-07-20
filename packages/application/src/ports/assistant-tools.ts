import type { WeatherLookup, WeatherQuery } from '@/ports/weather-provider'

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
  // For a single occurrence of a recurring series: the series' real id and this
  // occurrence's original start (an opaque UTC token to echo back). Both null on
  // a plain, non-recurring event. Reschedule one occurrence with these;
  // edit the whole series with updateEvent on the seriesId.
  seriesId: string | null
  occurrenceStart: string | null
}

export type AssistantOccurrenceReschedule = {
  seriesId: string
  occurrenceStart: string
  title: string
  startsAt: string
  endsAt: string
}

export type AssistantListSummary = {
  id: string
  title: string
}

// How often a habit is expected. Mirrors the domain HabitCadence so the agent
// can create a habit with any of the three shapes.
export type AssistantHabitCadence =
  | { kind: 'daily' }
  | { kind: 'weekdays'; weekdays: number[] }
  | { kind: 'times_per_week'; count: number }

export type AssistantHabitSummary = {
  id: string
  title: string
  currentStreak: number
  doneToday: boolean
  scheduledToday: boolean
  active: boolean
}

// Grounds the assistant in the user's local time so it resolves "tomorrow" and
// sets clock times in the right zone. Without it the model has no anchor and
// guesses the date and drifts times by the UTC offset.
export type AssistantContext = {
  timezone: string
  /** Current instant as ISO 8601 in the user's zone, e.g. 2026-07-18T00:36:00-03:00. */
  nowIso: string
  /** Weekday of the current instant in the user's zone, e.g. Saturday. */
  weekday: string
  /**
   * The place the user saved for weather questions, or null if none. Lets the
   * assistant answer "weather tomorrow?" without asking where every time.
   */
  defaultWeatherLocation: string | null
  /**
   * A compact, one-fact-per-line summary of the durable assistant memory (home,
   * work, routine, people, notes), or an empty string when nothing is saved.
   * The user's own words: the prompt must frame it as untrusted data.
   */
  memory: string
}

// A structured update to the durable assistant memory. Absent keys are left
// unchanged; a nullable field sent as null clears it; `people` replaces the
// whole list; `addNote` appends one note.
export type AssistantMemoryUpdate = {
  homeLocation?: string | null
  workLocation?: string | null
  wakeHour?: number | null
  quietHoursStart?: number | null
  quietHoursEnd?: number | null
  briefEnabled?: boolean
  briefHour?: number | null
  people?: { name: string; relationship?: string | null }[]
  addNote?: string
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
  getContext(userId: string): Promise<AssistantContext>
  getToday(userId: string): Promise<{ tasks: AssistantTaskSummary[] }>
  getLists(userId: string): Promise<{ lists: AssistantListSummary[] }>
  getAgenda(
    userId: string,
    range?: { from?: string; to?: string },
  ): Promise<{ events: AssistantEventSummary[] }>
  // Read-only weather lookup for any place, up to the provider's ~16-day
  // horizon. Not scoped to the user: the place and dates come from the query.
  getWeather(query: WeatherQuery): Promise<WeatherLookup>
  // Save (or clear, with null) the user's default place for weather questions,
  // so later "weather tomorrow?" asks need no location.
  setDefaultWeatherLocation(
    userId: string,
    location: string | null,
  ): Promise<{ ok: boolean; location: string | null }>
  // Save a durable fact the user shared (home, work, routine, family member, a
  // lasting preference) so later turns can personalize. Returns the refreshed
  // memory summary so the assistant can confirm what it now knows.
  updateAssistantMemory(
    userId: string,
    update: AssistantMemoryUpdate,
  ): Promise<{ ok: boolean; memory: string }>

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

  // Habits
  getHabits(userId: string): Promise<{ habits: AssistantHabitSummary[] }>
  addHabit(
    userId: string,
    input: {
      title: string
      cadence: AssistantHabitCadence
      checkinHour?: number | null
    },
  ): Promise<{ id: string; added: boolean }>
  logHabit(
    userId: string,
    habitId: string,
    input?: { date?: string; done?: boolean },
  ): Promise<{ ok: boolean; currentStreak: number; doneToday: boolean }>

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
  rescheduleOccurrence(
    userId: string,
    input: AssistantOccurrenceReschedule,
  ): Promise<{ ok: boolean }>
  cancelOccurrence(
    userId: string,
    input: { seriesId: string; occurrenceStart: string },
  ): Promise<{ ok: boolean }>
  deleteEvent(userId: string, eventId: string): Promise<{ ok: boolean }>
}
